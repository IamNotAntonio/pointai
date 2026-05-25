'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '../lib/supabase-browser'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export default function Login() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [errorParam, setErrorParam] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsNew(params.get('novo') === '1')
    setErrorParam(params.get('error'))

    // Redirect if already logged in
    const sb = getSupabaseBrowser()
    if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [])

  async function handleGoogle() {
    setLoading(true)
    setErro(null)
    try {
      const supabase = getSupabaseBrowser()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) throw error
    } catch {
      setErro('Não foi possível iniciar o login. Tente novamente.')
      setLoading(false)
    }
  }

  const errorMessages = {
    no_code: 'Link de autenticação inválido. Tente novamente.',
    exchange: 'Sessão expirada. Por favor, faça login novamente.',
    no_user: 'Não foi possível identificar sua conta. Tente novamente.',
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0c0c0c;color:#fff;font-family:var(--font-geist-sans,system-ui,-apple-system,sans-serif);-webkit-font-smoothing:antialiased}
        .login-grid{position:fixed;inset:0;pointer-events:none;background-image:linear-gradient(rgba(26,122,74,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(26,122,74,.04) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse 80% 80% at 50% 40%,black 20%,transparent 80%);-webkit-mask-image:radial-gradient(ellipse 80% 80% at 50% 40%,black 20%,transparent 80%)}
        .login-glow{position:fixed;top:-10%;left:50%;transform:translateX(-50%);width:600px;height:600px;border-radius:50%;background:radial-gradient(circle,rgba(26,122,74,.16) 0%,transparent 65%);filter:blur(8px);pointer-events:none}
        .divider{display:flex;align-items:center;gap:12px;margin:20px 0}
        .divider-line{flex:1;height:1px;background:#1e1e1e}
        .divider-text{font-size:11px;color:#3f3f46;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      `}</style>

      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 16px', position: 'relative' }}>
        <div className="login-grid" />
        <div className="login-glow" />

        <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 400, animation: 'fadeUp .6s both' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <p style={{ fontSize: 26, fontWeight: 900, color: '#22c55e', letterSpacing: '-0.5px' }}>Point</p>
            </Link>
            <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg,#1a7a4a,#22c55e)', borderRadius: 99, margin: '8px auto 0' }} />
          </div>

          {/* Success banner (after onboarding) */}
          {isNew && (
            <div style={{ background: 'rgba(26,122,74,.1)', border: '1px solid rgba(34,197,94,.22)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <CheckIcon />
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#86efac', marginBottom: 2 }}>Perfil criado com sucesso!</p>
                <p style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.6 }}>Entre com Google para salvar seus dados e acessar o app.</p>
              </div>
            </div>
          )}

          {/* Error banner */}
          {errorParam && (
            <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '12px 16px', marginBottom: 20 }}>
              <p style={{ fontSize: 13, color: '#fca5a5' }}>{errorMessages[errorParam] ?? 'Ocorreu um erro. Tente novamente.'}</p>
            </div>
          )}

          {/* Section 1 — returning user */}
          <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 20, padding: '28px 28px 24px', marginBottom: 12 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 14 }}>Já tenho conta</p>
            <h1 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.5px', marginBottom: 6 }}>Bem-vindo de volta</h1>
            <p style={{ fontSize: 13.5, color: '#71717a', marginBottom: 20, lineHeight: 1.6 }}>Seu progresso e histórico estão te esperando.</p>

            <button
              onClick={handleGoogle}
              disabled={loading}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: '#fff', color: '#111', fontSize: 14, fontWeight: 700, padding: '12px 16px', borderRadius: 12, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, transition: 'all .18s', fontFamily: 'inherit', boxShadow: '0 2px 8px rgba(0,0,0,.3)' }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}
            >
              <GoogleIcon />
              {loading ? 'Redirecionando…' : 'Entrar com Google'}
            </button>

            {erro && (
              <p style={{ marginTop: 10, fontSize: 12.5, color: '#f87171', textAlign: 'center' }}>{erro}</p>
            )}
          </div>

          {/* Section 2 — new user */}
          <div style={{ background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: 20, padding: '24px 28px' }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: '#3f3f46', marginBottom: 14 }}>Primeira vez aqui?</p>
            <p style={{ fontSize: 13.5, color: '#71717a', marginBottom: 18, lineHeight: 1.6 }}>Crie seu perfil em 2 minutos e comece a estudar com IA personalizada.</p>

            <Link
              href="/onboarding"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(26,122,74,.1)', color: '#86efac', fontSize: 14, fontWeight: 700, padding: '12px 16px', borderRadius: 12, textDecoration: 'none', border: '1px solid rgba(34,197,94,.22)', transition: 'all .18s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,122,74,.16)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(26,122,74,.1)'; e.currentTarget.style.transform = 'none' }}
            >
              Criar minha conta
            </Link>
          </div>

          {/* Legal footer */}
          <p style={{ fontSize: 11.5, color: '#3f3f46', textAlign: 'center', marginTop: 24, lineHeight: 1.7 }}>
            Ao entrar, você concorda com os nossos{' '}
            <Link href="/termos" style={{ color: '#555', textDecoration: 'underline', textUnderlineOffset: 3 }}>Termos de Uso</Link>
            {' '}e{' '}
            <Link href="/privacidade" style={{ color: '#555', textDecoration: 'underline', textUnderlineOffset: 3 }}>Política de Privacidade</Link>
          </p>
        </div>
      </div>
    </>
  )
}
