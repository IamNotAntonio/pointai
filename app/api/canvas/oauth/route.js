import { NextResponse } from 'next/server'

// GET /api/canvas/oauth?domain=suauniversidade.instructure.com&returnTo=notas
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url)
  const domain   = searchParams.get('domain')?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const returnTo = searchParams.get('returnTo') || 'notas'

  if (!domain) {
    return NextResponse.redirect(new URL(`/${returnTo}?canvas=error&msg=domain_missing`, origin))
  }

  const clientId    = process.env.CANVAS_CLIENT_ID
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/canvas/callback`

  if (!clientId) {
    return NextResponse.redirect(new URL(`/${returnTo}?canvas=error&msg=not_configured`, origin))
  }

  const state = Buffer.from(JSON.stringify({ domain, returnTo })).toString('base64url')

  const authUrl = new URL(`https://${domain}/login/oauth2/auth`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('state', state)
  authUrl.searchParams.set('redirect_uri', redirectUri)

  return NextResponse.redirect(authUrl.toString())
}
