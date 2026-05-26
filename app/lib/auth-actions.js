import { getSupabaseBrowser } from './supabase-browser'

/* ─── Validators ─────────────────────────────────────────────────── */
export function validateEmail(email) {
  if (typeof email !== 'string') return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

export function validatePassword(pass) {
  if (typeof pass !== 'string' || pass.length < 8) {
    return { valid: false, message: 'A senha precisa ter no mínimo 8 caracteres.' }
  }
  if (!/[A-Za-zÀ-ÿ]/.test(pass)) {
    return { valid: false, message: 'A senha precisa conter ao menos uma letra.' }
  }
  if (!/\d/.test(pass)) {
    return { valid: false, message: 'A senha precisa conter ao menos um número.' }
  }
  return { valid: true, message: '' }
}

/* ─── Error translation (Supabase EN → pt-BR) ────────────────────── */
function translateAuthError(error) {
  if (!error) return 'Algo deu errado. Tente novamente.'
  const msg = (error.message || '').toLowerCase()
  if (msg.includes('invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('email not confirmed')) return 'Confirme o e-mail enviado antes de entrar.'
  if (msg.includes('user already registered')) return 'Esse e-mail já tem conta. Tente entrar.'
  if (msg.includes('email rate limit') || msg.includes('over_email_send_rate_limit')) {
    return 'Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos.'
  }
  if (msg.includes('signup is disabled')) return 'Cadastro temporariamente desabilitado.'
  if (msg.includes('weak password') || msg.includes('password should be')) {
    return 'Senha fraca. Use no mínimo 8 caracteres, com letra e número.'
  }
  if (msg.includes('same password')) return 'A nova senha não pode ser igual à anterior.'
  if (msg.includes('token has expired') || msg.includes('invalid token')) {
    return 'Link expirado ou inválido. Solicite um novo.'
  }
  if (msg.includes('user not found')) return 'Não encontramos uma conta com esse e-mail.'
  return error.message || 'Algo deu errado. Tente novamente.'
}

/* ─── Auth actions ───────────────────────────────────────────────── */
export async function signInWithEmail(email, password) {
  const supabase = getSupabaseBrowser()
  if (!supabase) return { error: 'Não foi possível conectar. Tente novamente.' }
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  })
  return { data, error: error ? translateAuthError(error) : null }
}

export async function signUpWithEmail(email, password) {
  const supabase = getSupabaseBrowser()
  if (!supabase) return { error: 'Não foi possível conectar. Tente novamente.' }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?novo=1` },
  })
  return { data, error: error ? translateAuthError(error) : null }
}

export async function signInWithGoogle() {
  const supabase = getSupabaseBrowser()
  if (!supabase) return { error: 'Não foi possível conectar. Tente novamente.' }

  // Clear any existing session before starting OAuth. A stale session can
  // collide with the new code exchange and bounce the user back to the
  // landing page after callback.
  try { await supabase.auth.signOut() } catch {}

  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',     // persistent refresh token
        prompt: 'select_account',   // always show account picker, never silent reuse
      },
    },
  })
  return { data, error: error ? translateAuthError(error) : null }
}

export async function resetPasswordForEmail(email) {
  const supabase = getSupabaseBrowser()
  if (!supabase) return { error: 'Não foi possível conectar. Tente novamente.' }
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const { data, error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${origin}/auth/callback?next=/redefinir-senha`,
  })
  return { data, error: error ? translateAuthError(error) : null }
}

export async function updateUserPassword(newPassword) {
  const supabase = getSupabaseBrowser()
  if (!supabase) return { error: 'Não foi possível conectar. Tente novamente.' }
  const { data, error } = await supabase.auth.updateUser({ password: newPassword })
  return { data, error: error ? translateAuthError(error) : null }
}
