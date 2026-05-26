'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'motion/react'
import { getSupabaseBrowser } from '../lib/supabase-browser'
import { resetPasswordForEmail, validateEmail } from '../lib/auth-actions'

const AnimatedSignInBackground = dynamic(
  () => import('../components/auth/AnimatedSignInBackground'),
  {
    ssr: false,
    loading: () => (
      <div aria-hidden style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 70% at 50% 40%, rgba(34,197,94,0.18) 0%, transparent 65%), #0a0a0a',
      }} />
    ),
  }
)

const EASE = [0.22, 1, 0.36, 1]

function AtIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>)
}
function MailIcon() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>)
}
function Spinner() {
  return (
    <span aria-hidden style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.35)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin .8s linear infinite',
    }} />
  )
}

export default function EsqueciSenha() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [fieldErr, setFieldErr] = useState(null)
  const [sent, setSent] = useState(null)

  useEffect(() => {
    const sb = getSupabaseBrowser()
    if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [router])

  function onBlurEmail() {
    if (!email) return setFieldErr(null)
    setFieldErr(validateEmail(email) ? null : 'E-mail inválido.')
  }

  async function handleSubmit(ev) {
    ev?.preventDefault()
    setErro(null)
    if (!validateEmail(email)) {
      setFieldErr('E-mail inválido.')
      return
    }
    setLoading(true)
    const { error } = await resetPasswordForEmail(email)
    setLoading(false)
    if (error) {
      setErro(error)
      return
    }
    setSent(email.trim())
  }

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0a;color:#fff;font-family:var(--font-geist-sans,system-ui,-apple-system,sans-serif);-webkit-font-smoothing:antialiased}
        .auth-input{width:100%;background:rgba(10,10,10,.7);border:1px solid #1a1a1a;border-radius:10px;padding:13px 14px 13px 42px;color:#f4f4f5;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
        .auth-input:focus{border-color:rgba(34,197,94,.5);box-shadow:0 0 0 3px rgba(34,197,94,.12)}
        .auth-input.has-error{border-color:rgba(248,113,113,.45)}
        .auth-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .auth-btn-primary{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:#1a7a4a;color:#fff;font-size:14.5px;font-weight:700;padding:13px 16px;border-radius:11px;border:1px solid rgba(34,197,94,.28);cursor:pointer;transition:all .18s;font-family:inherit;box-shadow:0 0 20px rgba(26,122,74,.22)}
        .auth-btn-primary:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 28px rgba(26,122,74,.4)}
        .auth-btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .auth-link{color:#86efac;font-size:13px;font-weight:600;text-decoration:none;transition:color .15s}
        .auth-link:hover{color:#22c55e}
        .auth-card{position:relative;z-index:1;width:100%;max-width:420px;background:rgba(12,12,12,.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid rgba(34,197,94,.12);border-radius:20px;padding:36px 32px 30px;box-shadow:0 40px 100px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.02)}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
      `}</style>

      <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
        <AnimatedSignInBackground reduceMotion={reduce} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '48px 16px' }}>
          <motion.div
            className="auth-card"
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE }}
          >
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', letterSpacing: '-0.04em', textRendering: 'optimizeLegibility' }}>Point</p>
              </Link>
              <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg,#1a7a4a,#22c55e)', borderRadius: 99, margin: '8px auto 0' }} />
            </div>

            {sent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(26,122,74,.14)', border: '1px solid rgba(34,197,94,.28)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <MailIcon />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Link enviado</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 10 }}>Confira seu e-mail</h2>
                <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.65 }}>
                  Enviamos um link para <strong style={{ color: '#e4e4e7' }}>{sent}</strong>.<br />
                  Verifique também sua pasta de spam.
                </p>
                <Link href="/login" className="auth-link" style={{ fontSize: 13 }}>← Voltar pro login</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Recuperar acesso</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 6 }}>Esqueceu sua senha?</h1>
                <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 22, lineHeight: 1.6 }}>Sem stress. Vamos te enviar um link pra criar uma nova.</p>

                <div style={{ marginBottom: fieldErr ? 4 : 18 }}>
                  <div style={{ position: 'relative' }}>
                    <span className="auth-icon"><AtIcon /></span>
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      className={`auth-input ${fieldErr ? 'has-error' : ''}`}
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      onBlur={onBlurEmail}
                      aria-invalid={!!fieldErr}
                      aria-label="E-mail"
                    />
                  </div>
                  {fieldErr && (
                    <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 6, marginBottom: 10, paddingLeft: 4, animation: 'fadeIn .25s ease both' }}>{fieldErr}</p>
                  )}
                </div>

                {erro && (
                  <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, animation: 'fadeIn .25s ease both' }}>
                    <p style={{ fontSize: 12.5, color: '#fca5a5', lineHeight: 1.55 }}>{erro}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-btn-primary">
                  {loading ? <><Spinner /> Enviando…</> : 'Enviar link de recuperação'}
                </button>

                <p style={{ marginTop: 22, textAlign: 'center' }}>
                  <Link href="/login" className="auth-link" style={{ fontSize: 13 }}>← Voltar pro login</Link>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}
