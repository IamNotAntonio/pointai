import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/* Server-side Supabase client + auth guard. Used by /api routes that
   need to look up the current user via the session cookies. */

export async function getSupabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try {
            toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {}
        },
      },
    }
  )
}

export async function requireUser() {
  const supabase = await getSupabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/* Plano lookup shared by API routes. Returns 'pro' or 'gratis'. */
export async function getUserPlano(supabase, userId) {
  try {
    const { data } = await supabase
      .from('perfis')
      .select('plano,plano_expira')
      .eq('user_id', userId)
      .maybeSingle()
    if (data?.plano === 'pro') {
      // honour expiration when present
      if (data.plano_expira && new Date(data.plano_expira).getTime() < Date.now()) return 'gratis'
      return 'pro'
    }
  } catch {}
  return 'gratis'
}
