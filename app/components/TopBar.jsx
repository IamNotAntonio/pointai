'use client'
import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  Calendar, Bell, ChevronDown, ChevronRight, Edit, Star, Sun, Moon, LogOut, Sparkles,
} from 'lucide-react'
import * as db from '../lib/db'
import { useProfile } from '../lib/ProfileContext'

const PLANS = [
  { id: 'free',     name: 'Grátis',    price: 'R$0',     period: '',     desc: 'Acesso completo sem limite de uso.',           current: true,  featured: false },
  { id: 'monthly',  name: 'Mensal',    price: 'R$14,90', period: '/mês', desc: 'Cancele a qualquer momento, sem burocracia.',  current: false, featured: true  },
  { id: 'semester', name: 'Semestral', price: 'R$59,90', period: '/sem', desc: 'Equivale a R$10/mês. Economia de 33%.',        current: false, featured: false },
]

function formatEventoLabel(ev) {
  if (!ev) return null
  const ms = new Date(ev.data).getTime() - Date.now()
  const days = Math.floor(ms / 86400000)
  if (days < -1) return null
  const titulo = (ev.titulo || '').replace(/\s+/g, ' ').trim()
  const short = titulo.length > 24 ? titulo.slice(0, 22) + '…' : titulo
  if (days <= 0) return `${short} · hoje`
  if (days === 1) return `${short} · amanhã`
  if (days < 14) return `${short} · em ${days} dias`
  return short
}

export default function TopBar() {
  const router = useRouter()
  const reduce = useReducedMotion()

  const { perfil, updatePerfil } = useProfile()
  const [userMeta, setUserMeta] = useState(null)
  const [tema, setTema] = useState('dark')
  const [plano, setPlano] = useState('gratis')
  const [eventoProximo, setEventoProximo] = useState(null)

  const [accountOpen, setAccountOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [planosOpen, setPlanosOpen] = useState(false)
  const [formPerfil, setFormPerfil] = useState({})
  const [salvando, setSalvando] = useState(false)
  const [assinandoPlano, setAssinandoPlano] = useState(null)
  const [erroPlano, setErroPlano] = useState(null)

  // Hover cursor (krittyz-style) for the right-side button group
  const [hoverPos, setHoverPos] = useState({ left: 0, width: 0, opacity: 0 })
  const accountRef = useRef(null)
  const notifRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('pointai_tema') || 'dark'
    setTema(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
    try {
      const p = JSON.parse(localStorage.getItem('pointai_plano') || '{}')
      setPlano(p.plano || 'gratis')
    } catch {}

    db.getUser().then(user => {
      if (user) {
        setUserMeta({
          avatar: user.user_metadata?.avatar_url || null,
          email: user.email || null,
        })
      }
    }).catch(() => {})

    function onOpenPlans() { setPlanosOpen(true) }
    window.addEventListener('open-plans-modal', onOpenPlans)

    db.getEventos().then(eventos => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const ts = todayStart.getTime()
      const futuros = (eventos || [])
        .filter(e => {
          const t = new Date(e.data).getTime()
          return !Number.isNaN(t) && t >= ts
        })
        .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())
      setEventoProximo(futuros[0] || null)
    }).catch(() => {})

    return () => {
      window.removeEventListener('open-plans-modal', onOpenPlans)
    }
  }, [])

  // Keep formPerfil in sync with the context-driven perfil
  useEffect(() => {
    if (!perfil) return
    setFormPerfil({
      nome: perfil.nome || '',
      curso: perfil.curso || '',
      universidade: perfil.universidade || '',
      semestre: perfil.semestre || '',
      materias: perfil.materias || '',
      objetivo: perfil.objetivo || '',
    })
  }, [perfil])

  useEffect(() => {
    if (!accountOpen && !notifOpen) return
    function handler(e) {
      if (accountOpen && accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false)
      }
      if (notifOpen && notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [accountOpen, notifOpen])

  function toggleTema() {
    const novo = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    localStorage.setItem('pointai_tema', novo)
    document.documentElement.classList.toggle('dark', novo === 'dark')
  }

  async function sair() {
    await db.signOut()
    window.location.href = '/login'
  }

  async function salvarPerfil() {
    setSalvando(true)
    // Optimistic merge in context + fire-and-forget persist
    updatePerfil(formPerfil)
    setSalvando(false)
    setEditOpen(false)
  }

  async function assinarPlano(planoId) {
    if (assinandoPlano) return
    setAssinandoPlano(planoId)
    setErroPlano(null)
    try {
      const user = await db.getUser()
      const pf = JSON.parse(localStorage.getItem('pointai_perfil') || '{}')
      const email = user?.email || ''
      const nome = pf.nome || user?.user_metadata?.full_name || ''
      const userId = user?.id || ''
      if (!email) {
        setErroPlano('Faça login para assinar.')
        setAssinandoPlano(null)
        return
      }
      const resp = await fetch('/api/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano: planoId === 'monthly' ? 'mensal' : 'semestral', userId, email, nome }),
      })
      const data = await resp.json()
      if (data.erro) { setErroPlano(data.erro); setAssinandoPlano(null); return }
      window.location.href = data.init_point
    } catch {
      setErroPlano('Erro de conexão. Tente novamente.')
      setAssinandoPlano(null)
    }
  }

  function onItemEnter(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    const groupRect = e.currentTarget.parentElement.getBoundingClientRect()
    setHoverPos({
      left: rect.left - groupRect.left,
      width: rect.width,
      opacity: 1,
    })
  }
  function onGroupLeave() {
    setHoverPos(p => ({ ...p, opacity: 0 }))
  }

  const inicialNome = perfil?.nome?.charAt(0)?.toUpperCase() || '?'
  const avatarSm = userMeta?.avatar
    ? <img src={userMeta.avatar} alt={perfil?.nome || ''} className="tb-avatar tb-avatar-sm" referrerPolicy="no-referrer" />
    : <div className="tb-avatar tb-avatar-sm">{inicialNome}</div>
  const avatarLg = userMeta?.avatar
    ? <img src={userMeta.avatar} alt={perfil?.nome || ''} className="tb-avatar tb-avatar-lg" referrerPolicy="no-referrer" />
    : <div className="tb-avatar tb-avatar-lg">{inicialNome}</div>

  const eventoLabel = formatEventoLabel(eventoProximo)

  return (
    <>
      <style>{`
        .topbar{position:sticky;top:0;z-index:80;height:64px;background:rgba(10,10,10,.85);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-bottom:1px solid #1a1a1a;flex-shrink:0}
        .topbar-inner{height:100%;display:flex;align-items:center;gap:14px;padding:0 22px;max-width:1600px;margin:0 auto}
        .topbar-logo{display:inline-flex;align-items:center;gap:10px;text-decoration:none;flex-shrink:0;padding:6px 8px;border-radius:8px;transition:background .15s}
        .topbar-logo:hover{background:#ffffff05}
        .topbar-logo-text{font-size:20px;font-weight:900;color:#22c55e;letter-spacing:-.04em;text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased}
        .topbar-spacer{flex:1}
        .topbar-group{position:relative;display:inline-flex;align-items:center;gap:2px;background:rgba(15,15,15,.6);border:1px solid #1a1a1a;border-radius:99px;padding:4px}
        .topbar-cursor{position:absolute;top:4px;bottom:4px;background:rgba(34,197,94,.10);border:1px solid rgba(34,197,94,.18);border-radius:99px;pointer-events:none;z-index:0}
        .topbar-quick{position:relative;z-index:1;display:inline-flex;align-items:center;gap:8px;background:none;border:none;color:#a1a1aa;font-size:13px;font-weight:600;padding:7px 12px;border-radius:99px;cursor:pointer;font-family:inherit;transition:color .12s}
        .topbar-quick:hover{color:#e4e4e7}
        .topbar-quick-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px}
        .topbar-bell{padding:7px 11px}
        .topbar-bell-wrap{position:relative;z-index:1}
        .topbar-badge{position:absolute;top:2px;right:2px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#22c55e;color:#0a0a0a;font-size:9.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;line-height:1;box-shadow:0 0 0 2px #0a0a0a}
        .topbar-popover{position:absolute;top:calc(100% + 8px);right:0;min-width:240px;background:#101010;border:1px solid #1a1a1a;border-radius:12px;padding:14px 16px;box-shadow:0 20px 50px rgba(0,0,0,.6);z-index:20}
        .tb-popover-empty{font-size:13px;color:#71717a;line-height:1.5}

        .topbar-account-wrap{position:relative;z-index:1}
        .topbar-account-btn{display:inline-flex;align-items:center;gap:8px;background:none;border:none;padding:4px 8px 4px 4px;border-radius:99px;cursor:pointer;color:#a1a1aa;transition:background .15s}
        .topbar-account-btn:hover{background:#ffffff06}
        .tb-avatar{flex-shrink:0;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-weight:800;background:linear-gradient(135deg,#22c55e 0%,#0e6b3e 100%);object-fit:cover}
        .tb-avatar-sm{width:32px;height:32px;font-size:12px}
        .tb-avatar-lg{width:44px;height:44px;font-size:15px}

        .topbar-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:280px;background:#0f0f0f;border:1px solid #1a1a1a;border-radius:14px;padding:6px;box-shadow:0 24px 60px rgba(0,0,0,.6);z-index:30}
        .tb-dd-header{display:flex;align-items:center;gap:12px;padding:12px 12px 14px;border-bottom:1px solid #161616;margin-bottom:6px}
        .tb-dd-name{font-size:14px;font-weight:700;color:#f4f4f5;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
        .tb-dd-meta{font-size:11.5px;color:#71717a;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
        .tb-dd-item{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;color:#c4c4c4;font-size:13px;font-weight:500;padding:9px 12px;border-radius:8px;cursor:pointer;text-align:left;font-family:inherit;transition:background .12s,color .12s}
        .tb-dd-item:hover{background:#181818;color:#e4e4e7}
        .tb-dd-item.danger{color:#f87171}
        .tb-dd-item.danger:hover{background:rgba(239,68,68,.08);color:#fca5a5}
        .tb-dd-divider{height:1px;background:#161616;margin:4px 6px}

        /* Nav breadcrumb pill (centered, behind the right-side actions) */
        .topbar-navpill{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:8px;background:rgba(20,20,20,.7);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.06);border-radius:999px;padding:7px 16px;z-index:1;pointer-events:none;max-width:calc(100vw - 540px)}
        .topbar-navpill-root{font-size:12.5px;font-weight:500;color:#71717a;letter-spacing:.01em}
        .topbar-navpill-sep{color:#52525b;display:inline-flex;align-items:center;flex-shrink:0}
        .topbar-navpill-leaf{font-size:13px;font-weight:600;color:#e4e4e7;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px}

        @media (max-width:900px){
          .topbar-navpill{display:none}
        }
        @media (max-width:768px){
          .topbar-inner{padding:0 14px;gap:8px}
          .topbar-logo-text{display:none}
          .topbar-quick-label{display:none}
          .topbar-quick{padding:7px 10px}
        }
      `}</style>

      <header className="topbar" role="banner">
        <div className="topbar-inner">
          <Link href="/dashboard" className="topbar-logo" aria-label="Point">
            <Image src="/logo-mark.png" alt="" width={32} height={32} priority />
            <span className="topbar-logo-text">Point</span>
          </Link>

          <Suspense fallback={null}>
            <NavPill reduce={reduce} />
          </Suspense>

          <div className="topbar-spacer" />

          <div className="topbar-group" onMouseLeave={onGroupLeave}>
            <motion.span
              className="topbar-cursor"
              animate={reduce ? { opacity: 0 } : hoverPos}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            />

            <button
              className="topbar-quick"
              onMouseEnter={onItemEnter}
              onClick={() => router.push('/calendario')}
              aria-label="Calendário"
              title={eventoLabel || 'Calendário'}
            >
              <Calendar size={16} strokeWidth={1.8} />
              <span className="topbar-quick-label">{eventoLabel || 'Calendário'}</span>
            </button>

            <div className="topbar-bell-wrap" ref={notifRef}>
              <button
                className="topbar-quick topbar-bell"
                onMouseEnter={onItemEnter}
                onClick={() => setNotifOpen(o => !o)}
                aria-label="Notificações"
              >
                <Bell size={16} strokeWidth={1.8} />
              </button>
              {notifOpen && (
                <div className="topbar-popover">
                  <p className="tb-popover-empty">Sem notificações novas.</p>
                </div>
              )}
            </div>

            <div className="topbar-account-wrap" ref={accountRef}>
              <button
                className="topbar-account-btn"
                onMouseEnter={onItemEnter}
                onClick={() => setAccountOpen(o => !o)}
                aria-label="Menu da conta"
                aria-expanded={accountOpen}
              >
                {avatarSm}
                <ChevronDown size={14} strokeWidth={2} />
              </button>

              <AnimatePresence>
                {accountOpen && (
                  <motion.div
                    className="topbar-dropdown"
                    initial={reduce ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.16 }}
                    role="menu"
                  >
                    <div className="tb-dd-header">
                      {avatarLg}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p className="tb-dd-name">{perfil?.nome || 'Sem nome'}</p>
                        <p className="tb-dd-meta">{userMeta?.email || perfil?.curso || ''}</p>
                      </div>
                    </div>

                    <button className="tb-dd-item" onClick={() => { setAccountOpen(false); setEditOpen(true) }}>
                      <Edit size={14} strokeWidth={1.8} /> Editar perfil
                    </button>

                    <button className="tb-dd-item" onClick={() => { setAccountOpen(false); setPlanosOpen(true) }}>
                      <Star size={14} strokeWidth={1.8} />
                      {plano === 'pro'
                        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><Sparkles size={12} strokeWidth={1.8} /> Plano Pro · Ativo</span>
                        : 'Plano Grátis · Ver planos'}
                    </button>

                    <div className="tb-dd-divider" />

                    <button className="tb-dd-item" onClick={toggleTema}>
                      {tema === 'dark' ? <Sun size={14} strokeWidth={1.8} /> : <Moon size={14} strokeWidth={1.8} />}
                      {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
                    </button>

                    <div className="tb-dd-divider" />

                    <button className="tb-dd-item danger" onClick={sair}>
                      <LogOut size={14} strokeWidth={1.8} /> Sair
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal — same shape as Sidebar's, reuses .sb-* classes */}
      {editOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setEditOpen(false)}>
          <div className="sb-modal">
            <div className="sb-modal-header">
              <p className="sb-modal-title">Editar perfil</p>
              <button className="sb-modal-close" onClick={() => setEditOpen(false)}>×</button>
            </div>
            {[
              { key: 'nome', label: 'Nome' },
              { key: 'curso', label: 'Curso' },
              { key: 'universidade', label: 'Universidade' },
              { key: 'semestre', label: 'Semestre' },
            ].map(({ key, label }) => (
              <div key={key} className="sb-form-group">
                <label className="sb-label">{label}</label>
                <input
                  className="sb-input"
                  value={formPerfil[key] || ''}
                  onChange={e => setFormPerfil(p => ({ ...p, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="sb-form-group">
              <label className="sb-label">Matérias (separe por vírgula)</label>
              <textarea
                className="sb-input"
                rows={3}
                value={formPerfil.materias || ''}
                onChange={e => setFormPerfil(p => ({ ...p, materias: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="sb-form-group">
              <label className="sb-label">Objetivo</label>
              <input
                className="sb-input"
                value={formPerfil.objetivo || ''}
                onChange={e => setFormPerfil(p => ({ ...p, objetivo: e.target.value }))}
              />
            </div>
            <div className="sb-modal-footer">
              <button className="btn btn-ghost" onClick={() => setEditOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={salvarPerfil} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans Modal */}
      {planosOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setPlanosOpen(false)}>
          <div className="sb-modal">
            <div className="sb-modal-header">
              <p className="sb-modal-title">Planos</p>
              <button className="sb-modal-close" onClick={() => setPlanosOpen(false)}>×</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16, lineHeight: 1.5 }}>
              Você está no <strong style={{ color: '#22c55e' }}>Plano Grátis</strong>. Assine o Pro para acesso ilimitado.
            </p>
            <div className="sb-plan-grid">
              {PLANS.map(plan => {
                const carregando = assinandoPlano === plan.id
                return (
                  <div key={plan.id} className={`sb-plan-card ${plan.featured ? 'featured' : ''}`}>
                    {plan.featured && <span className="sb-plan-badge">Mais popular</span>}
                    <p className="sb-plan-name">{plan.name}</p>
                    <p className="sb-plan-price">{plan.price}<span>{plan.period}</span></p>
                    <p className="sb-plan-desc">{plan.desc}</p>
                    {plan.current
                      ? <p className="sb-plan-current">✓ Plano atual</p>
                      : (
                        <button
                          onClick={() => assinarPlano(plan.id)}
                          disabled={!!assinandoPlano}
                          style={{
                            marginTop: 10, width: '100%', padding: '7px 0',
                            background: plan.featured ? '#16a34a' : 'var(--surface-2)',
                            color: plan.featured ? '#fff' : 'var(--text-2)',
                            border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600,
                            cursor: assinandoPlano ? 'default' : 'pointer',
                            opacity: assinandoPlano && !carregando ? .5 : 1,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            fontFamily: 'inherit',
                          }}
                        >
                          {carregando
                            ? 'Redirecionando…'
                            : <><Sparkles size={11} strokeWidth={1.8} /> Assinar {plan.name}</>
                          }
                        </button>
                      )
                    }
                  </div>
                )
              })}
            </div>
            {erroPlano && (
              <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 8, padding: '7px 12px', marginTop: 12, textAlign: 'center' }}>
                {erroPlano}
              </p>
            )}
            <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 14, textAlign: 'center' }}>
              Pagamento seguro via Mercado Pago · Cancele quando quiser
            </p>
          </div>
        </div>
      )}
    </>
  )
}

function NavPill({ reduce }) {
  const sp = useSearchParams()
  const m = sp.get('materia')
  const leaf = m && m.length > 0 ? m : 'Chat Geral'
  const displayLeaf = leaf.length > 30 ? leaf.slice(0, 27) + '…' : leaf
  return (
    <div className="topbar-navpill" title={leaf}>
      <span className="topbar-navpill-root">Lousa</span>
      <span className="topbar-navpill-sep"><ChevronRight size={10} strokeWidth={2} /></span>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={leaf}
          className="topbar-navpill-leaf"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          {displayLeaf}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}
