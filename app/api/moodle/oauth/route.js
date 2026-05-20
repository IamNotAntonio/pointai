import { NextResponse } from 'next/server'

// GET /api/moodle/oauth?domain=minha.faculdade.br&returnTo=notas
// Redirects the user to the Moodle token management page so they can create a token,
// then copy it back to the app.
export async function GET(req) {
  const { searchParams, origin } = new URL(req.url)
  const domain   = searchParams.get('domain')?.trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
  const returnTo = searchParams.get('returnTo') || 'notas'

  if (!domain) {
    return NextResponse.redirect(new URL(`/${returnTo}?moodle=error&msg=domain_missing`, origin))
  }

  // Deep-link to Moodle's token management page
  const moodleTokenPage = `https://${domain}/user/managetoken.php`
  return NextResponse.redirect(moodleTokenPage)
}
