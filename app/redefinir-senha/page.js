'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'motion/react'
import { getSupabaseBrowser } from '../lib/supabase-browser'
import { updateUserPassword, validatePassword } from '../lib/auth-actions'

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

function LockIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
}
function EyeIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
}
function EyeOffIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.07 19.07 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.37 19.37 0 0 1-3.17 3.95"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>)
}
function AlertIcon() {
  return (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>)
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

export default function RedefinirSenha() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [status, setStatus] = useState('checking')   // checking | ready | invalid
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [fieldErr, setFieldErr] = useState({})

  useEffect(() => {
    const sb = getSupabaseBrowser()
    if (!sb) {
      setStatus('invalid')
      return
    }
    sb.auth.getSession().then(({ data: { session } }) => {
      setStatus(session ? 'ready' : 'invalid')
    })
  }, [])

  function onBlurPassword() {
    if (!password) return setFieldErr(e => ({ ...e, password: null }))
    const v = validatePassword(password)
    setFieldErr(e => ({ ...e, password: v.valid ? null : v.message }))
  }
  function onBlurPassword2() {
    if (!password2) return setFieldErr(e => ({ ...e, password2: null }))
    setFieldErr(e => ({ ...e, password2: password === password2 ? null : 'As senhas não coincidem.' }))
  }

  async function handleSubmit(ev) {
    ev?.preventDefault()
    setErro(null)
    const v = validatePassword(password)
    if (!v.valid) {
      setFieldErr(e => ({ ...e, password: v.message }))
      return
    }
    if (password !== password2) {
      setFieldErr(e => ({ ...e, password2: 'As senhas não coincidem.' }))
      return
    }
    setLoading(true)
    const { error } = await updateUserPassword(password)
    setLoading(false)
    if (error) {
      setErro(error)
      return
    }
    router.replace('/dashboard?senhaAtualizada=1')
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
        .auth-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;padding:8px;cursor:pointer;color:#71717a;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:color .15s,background .15s}
        .auth-eye:hover{color:#a1a1aa;background:#ffffff05}
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

            {status === 'checking' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spinner />
                <p style={{ marginTop: 12, fontSize: 13, color: '#71717a' }}>Verificando link…</p>
              </div>
            )}

            {status === 'invalid' && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.32)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
                  <AlertIcon />
                </div>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#f59e0b', marginBottom: 10 }}>Link inválido</p>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 10 }}>Link expirado ou inválido</h2>
                <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 22, lineHeight: 1.65 }}>
                  O link de recuperação pode ter expirado. Solicite um novo para continuar.
                </p>
                <Link href="/esqueci-senha" className="auth-btn-primary" style={{ textDecoration: 'none' }}>
                  Solicitar novo link
                </Link>
                <p style={{ marginTop: 16 }}>
                  <Link href="/login" className="auth-link" style={{ fontSize: 13 }}>← Voltar pro login</Link>
                </p>
              </div>
            )}

            {status === 'ready' && (
              <form onSubmit={handleSubmit} noValidate>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Nova senha</p>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 6 }}>Crie uma nova senha</h1>
                <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 22, lineHeight: 1.6 }}>Quase lá. Defina uma senha forte pra continuar.</p>

                <div style={{ marginBottom: fieldErr.password ? 4 : 14 }}>
                  <div style={{ position: 'relative' }}>
                    <span className="auth-icon"><LockIcon /></span>
                    <input
                      type={showPass ? 'text' : 'password'}
                      autoComplete="new-password"
                      className={`auth-input ${fieldErr.password ? 'has-error' : ''}`}
                      style={{ paddingRight: 44 }}
                      placeholder="Nova senha"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      onBlur={onBlurPassword}
                      aria-invalid={!!fieldErr.password}
                      aria-label="Nova senha"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="auth-eye"
                      aria-label={showPass ? 'Ocultar senha' : 'Mostrar senha'}
                      tabIndex={-1}
                    >
                      {showPass ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {fieldErr.password && (
                    <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 6, marginBottom: 10, paddingLeft: 4, animation: 'fadeIn .25s ease both' }}>{fieldErr.password}</p>
                  )}
                </div>

                <div style={{ marginBottom: fieldErr.password2 ? 4 : 12 }}>
                  <div style={{ position: 'relative' }}>
                    <span className="auth-icon"><LockIcon /></span>
                    <input
                      type="password"
                      autoComplete="new-password"
                      className={`auth-input ${fieldErr.password2 ? 'has-error' : ''}`}
                      placeholder="Confirme a nova senha"
                      value={password2}
                      onChange={e => setPassword2(e.target.value)}
                      onBlur={onBlurPassword2}
                      aria-invalid={!!fieldErr.password2}
                      aria-label="Confirmar nova senha"
                    />
                  </div>
                  {fieldErr.password2 && (
                    <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 6, marginBottom: 10, paddingLeft: 4, animation: 'fadeIn .25s ease both' }}>{fieldErr.password2}</p>
                  )}
                </div>

                <p style={{ fontSize: 12, color: '#71717a', marginTop: -4, marginBottom: 18 }}>
                  Mínimo 8 caracteres, com letra e número.
                </p>

                {erro && (
                  <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, animation: 'fadeIn .25s ease both' }}>
                    <p style={{ fontSize: 12.5, color: '#fca5a5', lineHeight: 1.55 }}>{erro}</p>
                  </div>
                )}

                <button type="submit" disabled={loading} className="auth-btn-primary">
                  {loading ? <><Spinner /> Salvando…</> : 'Salvar nova senha'}
                </button>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </>
  )
}
