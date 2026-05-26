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

  // Check if user already completed onboarding
  const { data: perfil } = await supabase
    .from('perfis')
    .select('nome')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!perfil?.nome) {
    return NextResponse.redirect(new URL('/onboarding?from=callback', origin))
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
