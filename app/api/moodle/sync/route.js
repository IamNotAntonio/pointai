// POST { tipo: 'notas'|'calendario' }
// Reads moodle_token + moodle_domain from Supabase and calls Moodle API
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

async function moodleCall(base, token, wsfunction, extra = {}) {
  const params = new URLSearchParams({
    wstoken:            token,
    moodlewsrestformat: 'json',
    wsfunction,
    ...extra,
  })
  const res = await fetch(`${base}/webservice/rest/server.php?${params}`, {
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`Erro ${res.status} ao acessar o Moodle.`)
  const data = await res.json()
  if (data?.exception) throw new Error(data.message || 'Token inválido.')
  return data
}

async function fetchNotas(base, token) {
  const courses = await moodleCall(base, token, 'core_enrol_get_users_courses', { userid: 0 })
  if (!Array.isArray(courses) || courses.length === 0) return null

  const materias = await Promise.all(
    courses.slice(0, 20).map(async (course) => {
      let notas = ['', '', '']
      try {
        const grades = await moodleCall(base, token, 'gradereport_user_get_grade_items', {
          courseid: course.id,
        })
        const items = grades?.usergrades?.[0]?.gradeitems ?? []
        const graded = items
          .filter(g => g.graderaw != null && g.grademax > 0 && g.itemtype !== 'course')
          .slice(0, 3)
        if (graded.length >= 1) {
          notas = graded.map(g => {
            const n = (g.graderaw / g.grademax) * 10
            return String(parseFloat(Math.min(10, n).toFixed(1)))
          })
          while (notas.length < 3) notas.push('')
        }
      } catch {}
      return { nome: course.fullname || course.shortname || 'Matéria sem nome', notas, faltas: 0, totalAulas: 60 }
    })
  )
  return { materias }
}

async function fetchCalendario(base, token) {
  const hoje   = new Date().toISOString().split('T')[0]
  const events = await moodleCall(base, token, 'core_calendar_get_calendar_upcoming_view')

  const raw = events?.events ?? []
  const eventos = raw
    .filter(e => e.timestart)
    .map(e => {
      const data = new Date(e.timestart * 1000).toISOString().split('T')[0]
      if (data < hoje) return null
      const nome = e.name || 'Evento'
      const t = nome.toLowerCase()
      let tipo = 'trabalho'
      if (/prova|exam|quiz|avalia[cç][aã]o|teste/.test(t) || e.modulename === 'quiz') tipo = 'prova'
      else if (/apresenta[cç][aã]o|semin[aá]rio|defesa/.test(t)) tipo = 'apresentacao'
      return { titulo: nome.slice(0, 100), data, tipo, materia: e.course?.fullname || '' }
    })
    .filter(Boolean)
    .sort((a, b) => a.data.localeCompare(b.data))

  return eventos.length > 0 ? { eventos } : null
}

export async function POST(req) {
  try {
    const { tipo } = await req.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll:  ()      => cookieStore.getAll(),
          setAll:  (toSet) => toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)),
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return Response.json({ erro: 'Não autenticado.' }, { status: 401 })

    const { data: perfil } = await supabase
      .from('perfis')
      .select('moodle_token,moodle_domain')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!perfil?.moodle_token || !perfil?.moodle_domain) {
      return Response.json({ erro: 'Moodle não conectado.' }, { status: 400 })
    }

    const base = `https://${perfil.moodle_domain}`

    if (tipo === 'notas') {
      const dados = await fetchNotas(base, perfil.moodle_token)
      if (!dados) return Response.json({ erro: 'Nenhuma matéria ativa encontrada.' }, { status: 404 })
      return Response.json({ dados })
    }

    const dados = await fetchCalendario(base, perfil.moodle_token)
    if (!dados) return Response.json({ erro: 'Nenhum evento futuro encontrado.' }, { status: 404 })
    return Response.json({ dados })

  } catch (err) {
    console.error('[moodle/sync]', err.message)
    return Response.json({ erro: err.message || 'Erro ao sincronizar com o Moodle.' }, { status: 502 })
  }
}
