// Canvas LMS API proxy — avoids CORS issues from the browser
// POST { token, dominio, tipo: 'notas'|'calendario' }

async function canvasGet(url, headers) {
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  })
  if (res.status === 401) {
    throw new Error(
      'Token inválido ou expirado. Gere um novo em: Perfil → Configurações → Integrações Aprovadas → Novo Token de Acesso.'
    )
  }
  if (res.status === 404) {
    throw new Error(
      'Domínio não encontrado. Verifique a URL da sua instituição (ex: suauniversidade.instructure.com).'
    )
  }
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao acessar o Canvas. Verifique domínio e token.`)
  }
  return res.json()
}

async function fetchNotas(base, headers) {
  const courses = await canvasGet(
    `${base}/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=50`,
    headers
  )

  if (!Array.isArray(courses) || courses.length === 0) {
    return Response.json(
      { erro: 'Nenhuma matéria ativa encontrada. Verifique se você tem matrícula em cursos ativos.' },
      { status: 404 }
    )
  }

  const materias = await Promise.all(
    courses.slice(0, 20).map(async (course) => {
      let notas = ['', '', '']

      // Try course-level grade from enrollment
      try {
        const enrollments = await canvasGet(
          `${base}/api/v1/courses/${course.id}/enrollments?user_id=self&per_page=5`,
          headers
        )
        const enr = Array.isArray(enrollments) ? enrollments[0] : null
        const pct = enr?.grades?.current_score ?? null
        if (pct != null) {
          notas[0] = String(parseFloat((pct / 10).toFixed(1)))
        }
      } catch {}

      // Override with individual assignment grades if we have ≥ 2
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

      return {
        nome:       course.name || course.course_code || 'Matéria sem nome',
        notas,
        faltas:     0,
        totalAulas: 60,
      }
    })
  )

  return Response.json({ dados: { materias } })
}

async function fetchCalendario(base, headers) {
  const courses = await canvasGet(
    `${base}/api/v1/courses?enrollment_type=student&enrollment_state=active&per_page=50`,
    headers
  )

  const hoje   = new Date().toISOString().split('T')[0]
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

  if (eventos.length === 0) {
    return Response.json(
      { erro: 'Nenhum evento futuro encontrado. Certifique-se de que há tarefas com prazo definido nas suas matérias.' },
      { status: 404 }
    )
  }

  return Response.json({ dados: { eventos } })
}

function detectTipo(titulo, submissionTypes) {
  const t = titulo.toLowerCase()
  if (/prova|exam|quiz|avalia[cç][aã]o|teste|ap\d/.test(t)) return 'prova'
  if (/trabalho|projeto|entrega|relat[oó]rio|tcc|paper/.test(t)) return 'trabalho'
  if (/apresenta[cç][aã]o|semin[aá]rio|defesa|presentation/.test(t)) return 'apresentacao'
  if (submissionTypes.includes('online_quiz')) return 'prova'
  if (submissionTypes.some(s => ['media_recording', 'student_annotation'].includes(s))) return 'apresentacao'
  return 'trabalho'
}

export async function POST(req) {
  try {
    const { token, dominio, tipo } = await req.json()

    if (!token?.trim() || !dominio?.trim()) {
      return Response.json({ erro: 'Preencha o domínio e o token de acesso.' }, { status: 400 })
    }

    const base    = `https://${dominio.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    const headers = {
      'Authorization': `Bearer ${token.trim()}`,
      'Accept':        'application/json',
    }

    if (tipo === 'notas') return await fetchNotas(base, headers)
    return await fetchCalendario(base, headers)

  } catch (err) {
    console.error('[canvas]', err.message)
    return Response.json({ erro: err.message || 'Erro ao conectar com o Canvas.' }, { status: 502 })
  }
}
