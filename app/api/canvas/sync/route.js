// POST { tipo: 'notas'|'calendario' }
// Reads canvas_token + canvas_domain from Supabase and calls Canvas API
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { fetchNotas, fetchCalendario } from '../_lib'

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
      .select('canvas_token,canvas_domain')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!perfil?.canvas_token || !perfil?.canvas_domain) {
      return Response.json({ erro: 'Canvas não conectado. Conecte via OAuth primeiro.' }, { status: 400 })
    }

    const base    = `https://${perfil.canvas_domain}`
    const headers = { 'Authorization': `Bearer ${perfil.canvas_token}`, 'Accept': 'application/json' }

    if (tipo === 'notas') {
      const dados = await fetchNotas(base, headers)
      if (!dados) return Response.json({ erro: 'Nenhuma matéria ativa encontrada.' }, { status: 404 })
      return Response.json({ dados })
    }

    const dados = await fetchCalendario(base, headers)
    if (!dados) return Response.json({ erro: 'Nenhum evento futuro encontrado.' }, { status: 404 })
    return Response.json({ dados })

  } catch (err) {
    console.error('[canvas/sync]', err.message)
    return Response.json({ erro: err.message || 'Erro ao sincronizar com o Canvas.' }, { status: 502 })
  }
}
