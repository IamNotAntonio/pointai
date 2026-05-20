import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(req) {
  const { searchParams, origin } = new URL(req.url)
  const code     = searchParams.get('code')
  const stateB64 = searchParams.get('state')

  if (!code || !stateB64) {
    return NextResponse.redirect(new URL('/notas?canvas=error', origin))
  }

  let domain, returnTo
  try {
    const state = JSON.parse(Buffer.from(stateB64, 'base64url').toString())
    domain   = state.domain
    returnTo = state.returnTo || 'notas'
  } catch {
    return NextResponse.redirect(new URL('/notas?canvas=error', origin))
  }

  // Exchange code for access token
  let accessToken
  try {
    const tokenRes = await fetch(`https://${domain}/login/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type:    'authorization_code',
        client_id:     process.env.CANVAS_CLIENT_ID,
        client_secret: process.env.CANVAS_CLIENT_SECRET,
        code,
        redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/canvas/callback`,
      }),
      signal: AbortSignal.timeout(10000),
    })
    if (!tokenRes.ok) throw new Error(`Canvas token error ${tokenRes.status}`)
    const body = await tokenRes.json()
    accessToken = body.access_token
    if (!accessToken) throw new Error('No access_token in Canvas response')
  } catch (err) {
    console.error('[canvas/callback]', err.message)
    return NextResponse.redirect(new URL(`/${returnTo}?canvas=error`, origin))
  }

  // Save token to Supabase perfis
  try {
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
        .update({ canvas_token: accessToken, canvas_domain: domain })
        .eq('user_id', user.id)
    }
  } catch (err) {
    console.error('[canvas/callback] supabase', err.message)
  }

  // Redirect back — page will detect ?canvas=connected
  const dest = new URL(`/${returnTo}`, origin)
  dest.searchParams.set('canvas', 'connected')
  dest.searchParams.set('canvas_domain', domain)
  return NextResponse.redirect(dest)
}
