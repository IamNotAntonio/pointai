import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

const PROTECTED = [
  '/dashboard',
  '/notas',
  '/calendario',
  '/evolucao',
  '/trabalhos',
  '/analise',
  '/relatorio',
  '/simulado',
  '/plano',
  '/onboarding',
]

export async function proxy(request) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Always use getUser() — never getSession() alone — to validate the token server-side
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some(p => pathname.startsWith(p))
  const isLogin     = pathname === '/login'

  // Canonical @supabase/ssr pattern: any response we return — including
  // redirects — must carry the cookies that getUser()/refresh wrote onto
  // `response`. Otherwise the renewed session Set-Cookie headers are dropped
  // on redirect and the next request sees no session (the prod logout bug).
  const withCookies = (redirect) => {
    response.cookies.getAll().forEach(({ name, value, ...options }) =>
      redirect.cookies.set(name, value, options)
    )
    return redirect
  }

  if (!user && isProtected) {
    return withCookies(NextResponse.redirect(new URL('/login', request.url)))
  }

  if (user && isLogin) {
    return withCookies(NextResponse.redirect(new URL('/dashboard', request.url)))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
}
