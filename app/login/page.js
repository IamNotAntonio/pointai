'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { getSupabaseBrowser } from '../lib/supabase-browser'
import {
  signInWithEmail,
  signUpWithEmail,
  signInWithGoogle,
  validateEmail,
  validatePassword,
} from '../lib/auth-actions'

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

/* ─── Icons ──────────────────────────────────────────────────────── */
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
function AtIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>)
}
function LockIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>)
}
function EyeIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>)
}
function EyeOffIcon() {
  return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.07 19.07 0 0 1 5.06-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.37 19.37 0 0 1-3.17 3.95"/><line x1="1" y1="1" x2="23" y2="23"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>)
}
function CheckIcon() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>)
}
function ArrowRight() {
  return (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>)
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

const errorMessagesParam = {
  no_code: 'Link de autenticação inválido. Tente novamente.',
  exchange: 'Sessão expirada. Por favor, faça login novamente.',
  no_user: 'Não foi possível identificar sua conta. Tente novamente.',
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function Login() {
  const router = useRouter()
  const reduce = useReducedMotion()
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [erro, setErro] = useState(null)
  const [fieldErr, setFieldErr] = useState({})
  const [signupDone, setSignupDone] = useState(null)
  const [isNew, setIsNew] = useState(false)
  const [errorParam, setErrorParam] = useState(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setIsNew(params.get('novo') === '1')
    setErrorParam(params.get('error'))
    const sb = getSupabaseBrowser()
    if (!sb) return
    sb.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace('/dashboard')
    })
  }, [router])

  function switchMode(next) {
    setMode(next)
    setErro(null)
    setFieldErr({})
    setSignupDone(null)
    setShowPass(false)
  }

  function onBlurEmail() {
    if (!email) return setFieldErr(e => ({ ...e, email: null }))
    setFieldErr(e => ({ ...e, email: validateEmail(email) ? null : 'E-mail inválido.' }))
  }
  function onBlurPassword() {
    if (!password) return setFieldErr(e => ({ ...e, password: null }))
    if (mode === 'signup') {
      const v = validatePassword(password)
      setFieldErr(e => ({ ...e, password: v.valid ? null : v.message }))
    } else {
      setFieldErr(e => ({ ...e, password: null }))
    }
  }
  function onBlurPassword2() {
    if (!password2) return setFieldErr(e => ({ ...e, password2: null }))
    setFieldErr(e => ({ ...e, password2: password === password2 ? null : 'As senhas não coincidem.' }))
  }

  async function handleSubmit(ev) {
    ev?.preventDefault()
    setErro(null)
    if (!validateEmail(email)) {
      setFieldErr(e => ({ ...e, email: 'E-mail inválido.' }))
      return
    }
    if (mode === 'signup') {
      const v = validatePassword(password)
      if (!v.valid) {
        setFieldErr(e => ({ ...e, password: v.message }))
        return
      }
      if (password !== password2) {
        setFieldErr(e => ({ ...e, password2: 'As senhas não coincidem.' }))
        return
      }
    } else {
      if (!password) {
        setFieldErr(e => ({ ...e, password: 'Digite sua senha.' }))
        return
      }
    }

    setLoading(true)
    if (mode === 'signin') {
      const { error } = await signInWithEmail(email, password)
      if (error) {
        setErro(error)
        setLoading(false)
        return
      }
      router.replace('/dashboard')
    } else {
      const { data, error } = await signUpWithEmail(email, password)
      setLoading(false)
      if (error) {
        setErro(error)
        return
      }
      if (data?.session) {
        // Email confirmation disabled at Supabase level — proceed to onboarding
        router.replace('/onboarding?novo=1')
      } else {
        setSignupDone(email.trim())
      }
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    setErro(null)
    const { error } = await signInWithGoogle()
    if (error) {
      setErro(error)
      setGoogleLoading(false)
    }
  }

  const stateKey = signupDone ? 'done' : mode

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{background:#0a0a0a;color:#fff;font-family:var(--font-geist-sans,system-ui,-apple-system,sans-serif);-webkit-font-smoothing:antialiased}
        .auth-input{width:100%;background:rgba(10,10,10,.7);border:1px solid #1a1a1a;border-radius:10px;padding:13px 14px 13px 42px;color:#f4f4f5;font-size:14px;outline:none;transition:border-color .15s,box-shadow .15s;font-family:inherit;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
        .auth-input:focus{border-color:rgba(34,197,94,.5);box-shadow:0 0 0 3px rgba(34,197,94,.12)}
        .auth-input::placeholder{color:#52525b}
        .auth-input.has-error{border-color:rgba(248,113,113,.45)}
        .auth-eye{position:absolute;right:6px;top:50%;transform:translateY(-50%);background:none;border:none;padding:8px;cursor:pointer;color:#71717a;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:color .15s,background .15s}
        .auth-eye:hover{color:#a1a1aa;background:#ffffff05}
        .auth-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#52525b;pointer-events:none}
        .auth-divider{display:flex;align-items:center;gap:12px;margin:20px 0}
        .auth-divider-line{flex:1;height:1px;background:#1e1e1e}
        .auth-divider-text{font-size:11px;color:#52525b;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
        .auth-btn-primary{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;background:#1a7a4a;color:#fff;font-size:14.5px;font-weight:700;padding:13px 16px;border-radius:11px;border:1px solid rgba(34,197,94,.28);cursor:pointer;transition:all .18s;font-family:inherit;box-shadow:0 0 20px rgba(26,122,74,.22)}
        .auth-btn-primary:hover{background:#155f3a;transform:translateY(-1px);box-shadow:0 0 28px rgba(26,122,74,.4)}
        .auth-btn-primary:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .auth-btn-google{width:100%;display:flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#111;font-size:14px;font-weight:700;padding:12px 16px;border-radius:11px;border:none;cursor:pointer;transition:all .18s;font-family:inherit;box-shadow:0 2px 8px rgba(0,0,0,.3)}
        .auth-btn-google:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(0,0,0,.4)}
        .auth-btn-google:disabled{opacity:.6;cursor:not-allowed;transform:none}
        .auth-link{color:#86efac;font-size:12.5px;font-weight:600;text-decoration:none;transition:color .15s}
        .auth-link:hover{color:#22c55e;text-decoration:underline;text-underline-offset:3px}
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
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <Link href="/" style={{ textDecoration: 'none' }}>
                <p style={{ fontSize: 28, fontWeight: 900, color: '#22c55e', letterSpacing: '-0.04em', textRendering: 'optimizeLegibility' }}>Point</p>
              </Link>
              <div style={{ width: 32, height: 2, background: 'linear-gradient(90deg,#1a7a4a,#22c55e)', borderRadius: 99, margin: '8px auto 0' }} />
            </div>

            {/* Banners */}
            {isNew && !signupDone && (
              <div style={{ background: 'rgba(26,122,74,.1)', border: '1px solid rgba(34,197,94,.22)', borderRadius: 12, padding: '12px 14px', marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ marginTop: 2 }}><CheckIcon /></span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#86efac', marginBottom: 2 }}>Perfil criado!</p>
                  <p style={{ fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.6 }}>Entre para salvar seus dados e acessar o app.</p>
                </div>
              </div>
            )}
            {errorParam && (
              <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
                <p style={{ fontSize: 13, color: '#fca5a5' }}>{errorMessagesParam[errorParam] ?? 'Ocorreu um erro. Tente novamente.'}</p>
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div
                key={stateKey}
                initial={reduce ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                {signupDone ? (
                  <SignupSuccess email={signupDone} onBack={() => switchMode('signin')} />
                ) : mode === 'signin' ? (
                  <SigninForm
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    showPass={showPass} setShowPass={setShowPass}
                    onBlurEmail={onBlurEmail} onBlurPassword={onBlurPassword}
                    fieldErr={fieldErr}
                    onSubmit={handleSubmit}
                    loading={loading}
                    onGoogle={handleGoogle}
                    googleLoading={googleLoading}
                    erro={erro}
                    onSwitch={() => switchMode('signup')}
                  />
                ) : (
                  <SignupForm
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    password2={password2} setPassword2={setPassword2}
                    showPass={showPass} setShowPass={setShowPass}
                    onBlurEmail={onBlurEmail} onBlurPassword={onBlurPassword} onBlurPassword2={onBlurPassword2}
                    fieldErr={fieldErr}
                    onSubmit={handleSubmit}
                    loading={loading}
                    onGoogle={handleGoogle}
                    googleLoading={googleLoading}
                    erro={erro}
                    onSwitch={() => switchMode('signin')}
                  />
                )}
              </motion.div>
            </AnimatePresence>

            {/* Legal footer */}
            <p style={{ fontSize: 11.5, color: '#3f3f46', textAlign: 'center', marginTop: 22, lineHeight: 1.7 }}>
              Ao entrar, você concorda com os nossos{' '}
              <Link href="/termos" style={{ color: '#71717a', textDecoration: 'underline', textUnderlineOffset: 3 }}>Termos de Uso</Link>
              {' '}e{' '}
              <Link href="/privacidade" style={{ color: '#71717a', textDecoration: 'underline', textUnderlineOffset: 3 }}>Política de Privacidade</Link>
            </p>
          </motion.div>
        </div>
      </div>
    </>
  )
}

/* ─── Sub-forms ──────────────────────────────────────────────────── */
function SigninForm(p) {
  return (
    <form onSubmit={p.onSubmit} noValidate>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Entrar</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 6 }}>Bem-vindo de volta</h1>
      <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 22, lineHeight: 1.6 }}>Seu progresso e histórico estão te esperando.</p>

      <FieldEmail email={p.email} setEmail={p.setEmail} onBlur={p.onBlurEmail} err={p.fieldErr.email} />

      <FieldPassword
        password={p.password} setPassword={p.setPassword}
        showPass={p.showPass} setShowPass={p.setShowPass}
        onBlur={p.onBlurPassword} err={p.fieldErr.password}
        autoComplete="current-password"
        placeholder="Sua senha"
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 18 }}>
        <Link href="/esqueci-senha" className="auth-link" style={{ fontSize: 12 }}>Esqueci minha senha →</Link>
      </div>

      {p.erro && <ErrorText>{p.erro}</ErrorText>}

      <button type="submit" disabled={p.loading || p.googleLoading} className="auth-btn-primary">
        {p.loading ? <><Spinner /> Entrando…</> : <>Entrar <ArrowRight /></>}
      </button>

      <Divider />

      <button type="button" onClick={p.onGoogle} disabled={p.loading || p.googleLoading} className="auth-btn-google">
        {p.googleLoading ? <><Spinner /> Redirecionando…</> : <><GoogleIcon /> Continuar com Google</>}
      </button>

      <p style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#a1a1aa' }}>
        Primeira vez aqui?{' '}
        <button type="button" onClick={p.onSwitch} className="auth-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Criar conta →
        </button>
      </p>
    </form>
  )
}

function SignupForm(p) {
  return (
    <form onSubmit={p.onSubmit} noValidate>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Criar conta</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 6 }}>Comece a estudar com IA</h1>
      <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 22, lineHeight: 1.6 }}>Setup em 2 minutos. Grátis pra começar.</p>

      <FieldEmail email={p.email} setEmail={p.setEmail} onBlur={p.onBlurEmail} err={p.fieldErr.email} autoComplete="email" />

      <FieldPassword
        password={p.password} setPassword={p.setPassword}
        showPass={p.showPass} setShowPass={p.setShowPass}
        onBlur={p.onBlurPassword} err={p.fieldErr.password}
        autoComplete="new-password"
        placeholder="Crie uma senha"
      />

      <FieldPassword2
        password2={p.password2} setPassword2={p.setPassword2}
        onBlur={p.onBlurPassword2} err={p.fieldErr.password2}
      />

      <p style={{ fontSize: 12, color: '#71717a', marginTop: -4, marginBottom: 18 }}>
        Mínimo 8 caracteres, com letra e número.
      </p>

      {p.erro && <ErrorText>{p.erro}</ErrorText>}

      <button type="submit" disabled={p.loading || p.googleLoading} className="auth-btn-primary">
        {p.loading ? <><Spinner /> Criando conta…</> : <>Criar conta grátis <ArrowRight /></>}
      </button>

      <Divider />

      <button type="button" onClick={p.onGoogle} disabled={p.loading || p.googleLoading} className="auth-btn-google">
        {p.googleLoading ? <><Spinner /> Redirecionando…</> : <><GoogleIcon /> Continuar com Google</>}
      </button>

      <p style={{ marginTop: 22, textAlign: 'center', fontSize: 13, color: '#a1a1aa' }}>
        Já tem conta?{' '}
        <button type="button" onClick={p.onSwitch} className="auth-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
          Entrar
        </button>
      </p>
    </form>
  )
}

function SignupSuccess({ email, onBack }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(26,122,74,.14)', border: '1px solid rgba(34,197,94,.28)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
        <MailIcon />
      </div>
      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: '#22c55e', marginBottom: 10 }}>Conta criada</p>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.02em', marginBottom: 10 }}>Confirme seu e-mail</h2>
      <p style={{ fontSize: 13.5, color: '#a1a1aa', marginBottom: 20, lineHeight: 1.65 }}>
        Enviamos um link para <strong style={{ color: '#e4e4e7' }}>{email}</strong>.<br />
        Confirme para começar a usar o Point.
      </p>
      <p style={{ fontSize: 12, color: '#52525b', lineHeight: 1.6, marginBottom: 22 }}>
        Não recebeu? Verifique a pasta de spam.
      </p>
      <button type="button" onClick={onBack} className="auth-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit', fontSize: 13 }}>
        ← Voltar pro login
      </button>
    </div>
  )
}

/* ─── Field building blocks ──────────────────────────────────────── */
function FieldEmail({ email, setEmail, onBlur, err, autoComplete = 'email' }) {
  return (
    <div style={{ marginBottom: err ? 4 : 14 }}>
      <div style={{ position: 'relative' }}>
        <span className="auth-icon"><AtIcon /></span>
        <input
          type="email"
          inputMode="email"
          autoComplete={autoComplete}
          className={`auth-input ${err ? 'has-error' : ''}`}
          placeholder="seu@email.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!err}
          aria-label="E-mail"
        />
      </div>
      {err && <FieldError>{err}</FieldError>}
    </div>
  )
}

function FieldPassword({ password, setPassword, showPass, setShowPass, onBlur, err, autoComplete, placeholder }) {
  return (
    <div style={{ marginBottom: err ? 4 : 14 }}>
      <div style={{ position: 'relative' }}>
        <span className="auth-icon"><LockIcon /></span>
        <input
          type={showPass ? 'text' : 'password'}
          autoComplete={autoComplete}
          className={`auth-input ${err ? 'has-error' : ''}`}
          style={{ paddingRight: 44 }}
          placeholder={placeholder}
          value={password}
          onChange={e => setPassword(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!err}
          aria-label="Senha"
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
      {err && <FieldError>{err}</FieldError>}
    </div>
  )
}

function FieldPassword2({ password2, setPassword2, onBlur, err }) {
  return (
    <div style={{ marginBottom: err ? 4 : 14 }}>
      <div style={{ position: 'relative' }}>
        <span className="auth-icon"><LockIcon /></span>
        <input
          type="password"
          autoComplete="new-password"
          className={`auth-input ${err ? 'has-error' : ''}`}
          placeholder="Confirme a senha"
          value={password2}
          onChange={e => setPassword2(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!err}
          aria-label="Confirmar senha"
        />
      </div>
      {err && <FieldError>{err}</FieldError>}
    </div>
  )
}

function FieldError({ children }) {
  return (
    <p style={{ fontSize: 11.5, color: '#f87171', marginTop: 6, marginBottom: 10, paddingLeft: 4, animation: 'fadeIn .25s ease both' }}>{children}</p>
  )
}

function ErrorText({ children }) {
  return (
    <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 10, padding: '10px 12px', marginBottom: 14, animation: 'fadeIn .25s ease both' }}>
      <p style={{ fontSize: 12.5, color: '#fca5a5', lineHeight: 1.55 }}>{children}</p>
    </div>
  )
}

function Divider() {
  return (
    <div className="auth-divider">
      <span className="auth-divider-line" />
      <span className="auth-divider-text">ou continue com</span>
      <span className="auth-divider-line" />
    </div>
  )
}
