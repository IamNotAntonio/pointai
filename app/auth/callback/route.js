import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=no_code', origin))
  }

  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll()           { return cookieStore.getAll() },
        setAll(toSet)      { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    return NextResponse.redirect(new URL('/login?error=exchange', origin))
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=no_user', origin))
  }

  // Explicit redirect target (e.g. ?next=/redefinir-senha from password reset flow).
  // Only allow same-origin relative paths to avoid open-redirect.
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    return NextResponse.redirect(new URL(next, origin))
  }

  // Check if user already completed onboarding. We require ALL the
  // critical fields, not just `nome` — Supabase triggers or Google OAuth
  // may pre-populate the row with a name without the rest being filled.
  const { data: perfil, error: perfilError } = await supabase
    .from('perfis')
    .select('nome, curso, universidade, materias')
    .eq('user_id', user.id)
    .maybeSingle()

  // If the profile READ itself failed (DB error, RLS, schema mismatch), we
  // cannot trust `perfil` being null. Forcing onboarding here would trap an
  // already-onboarded user in a redirect loop. The user is authenticated, so
  // send them to the app and let it re-prompt for onboarding if data is truly
  // missing — never block a logged-in user on a transient read error.
  if (perfilError) {
    console.error('[auth/callback] failed to read perfil:', perfilError)
    return NextResponse.redirect(new URL('/dashboard', origin))
  }

  const onboardingCompleto =
    perfil?.nome && perfil?.curso && perfil?.universidade && perfil?.materias

  if (!onboardingCompleto) {
    return NextResponse.redirect(new URL('/onboarding?from=callback', origin))
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
