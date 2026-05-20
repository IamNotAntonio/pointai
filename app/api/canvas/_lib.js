// Shared Canvas API helpers — used by route.js and sync/route.js

export async function canvasGet(url, headers) {
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
  if (res.status === 401) throw new Error('Token inválido ou expirado. Reconecte sua conta Canvas.')
  if (res.status === 404) throw new Error('Domínio não encontrado. Verifique a URL da sua instituição.')
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar o Canvas.`)
  return res.json()
}

export function detectTipo(titulo, submissionTypes = []) {
  const t = titulo.toLowerCase()
  if (/prova|exam|quiz|avalia[cç][aã]o|teste|ap\d/.test(t)) return 'prova'
  if (/trabalho|projeto|entrega|relat[oó]rio|tcc|paper/.test(t)) return 'trabalho'
  if (/apresenta[cç][aã]o|semin[aá]rio|defesa|presentation/.test(t)) return 'apresentacao'
  if (submissionTypes.includes('online_quiz')) return 'prova'
  if (submissionTypes.some(s => ['media_recording', 'student_annotation'].includes(s))) return 'apresentacao'
  return 'trabalho'
}

export async function fetchNotas(base, headers) {
  const courses = await canvasGet(
    `${base}/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=50`,
    headers
  )
  if (!Array.isArray(courses) || courses.length === 0) return null

  const materias = await Promise.all(
    courses.slice(0, 20).map(async (course) => {
      let notas = ['', '', '']
      try {
        const enrollments = await canvasGet(
          `${base}/api/v1/courses/${course.id}/enrollments?user_id=self&per_page=5`,
          headers
        )
        const enr = Array.isArray(enrollments) ? enrollments[0] : null
        const pct = enr?.grades?.current_score ?? null
        if (pct != null) notas[0] = String(parseFloat((pct / 10).toFixed(1)))
      } catch {}
      try {
        const assignments = await canvasGet(
          `${base}/api/v1/courses/${course.id}/assignments?include[]=submission&order_by=due_at&per_page=30`,
          headers
        )
        const graded = (Array.isArray(assignments) ? assignments : [])
          .filter(a => a.submission?.score != null && (a.points_possible ?? 0) > 0)
          .slice(0, 3)
        if (graded.length >= 2) {
          notas = graded.map(a => {
            const n = (a.submission.score / a.points_possible) * 10
            return String(parseFloat(Math.min(10, n).toFixed(1)))
          })
          while (notas.length < 3) notas.push('')
        }
      } catch {}
      return { nome: course.name || course.course_code || 'Matéria sem nome', notas, faltas: 0, totalAulas: 60 }
    })
  )
  return { materias }
}

export async function fetchCalendario(base, headers) {
  const courses = await canvasGet(
    `${base}/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=50`,
    headers
  )
  const hoje = new Date().toISOString().split('T')[0]
  const eventos = []

  if (Array.isArray(courses)) {
    await Promise.all(
      courses.slice(0, 15).map(async (course) => {
        try {
          const assignments = await canvasGet(
            `${base}/api/v1/courses/${course.id}/assignments?bucket=upcoming&order_by=due_at&per_page=30`,
            headers
          )
          if (!Array.isArray(assignments)) return
          for (const a of assignments) {
            if (!a.due_at) continue
            const data = a.due_at.split('T')[0]
            if (data < hoje) continue
            eventos.push({
              titulo:  (a.name || 'Tarefa').slice(0, 100),
              data,
              tipo:    detectTipo(a.name || '', a.submission_types ?? []),
              materia: course.name || course.course_code || '',
            })
          }
        } catch {}
      })
    )
  }
  eventos.sort((a, b) => a.data.localeCompare(b.data))
  return eventos.length > 0 ? { eventos } : null
}
