// POST { token, dominio, returnTo? }
// Validates the Moodle token and saves it to Supabase perfis
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req) {
  try {
    const { token, dominio, returnTo = 'notas' } = await req.json()

    if (!token?.trim() || !dominio?.trim()) {
      return Response.json({ erro: 'Preencha o domínio e o token.' }, { status: 400 })
    }

    const base    = `https://${dominio.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
    const cleanToken = token.trim()

    // Validate token by calling a lightweight Moodle endpoint
    const params = new URLSearchParams({
      wstoken:            cleanToken,
      moodlewsrestformat: 'json',
      wsfunction:         'core_webservice_get_site_info',
    })
    const check = await fetch(`${base}/webservice/rest/server.php?${params}`, {
      signal: AbortSignal.timeout(10000),
    })
    if (!check.ok) {
      return Response.json({ erro: 'Não foi possível conectar ao Moodle. Verifique o domínio.' }, { status: 400 })
    }
    const info = await check.json()
    if (info?.exception) {
      return Response.json({ erro: info.message || 'Token inválido ou sem permissão de Web Services.' }, { status: 400 })
    }

    // Save token to Supabase if the user is logged in
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
    if (user) {
      await supabase
        .from('perfis')
        .update({ moodle_token: cleanToken, moodle_domain: dominio.replace(/^https?:\/\//, '').replace(/\/+$/, '') })
        .eq('user_id', user.id)
    }

    return Response.json({ ok: true, siteName: info.sitename })

  } catch (err) {
    console.error('[moodle/callback]', err.message)
    return Response.json({ erro: 'Erro ao conectar com o Moodle.' }, { status: 502 })
  }
}
