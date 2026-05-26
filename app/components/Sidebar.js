'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect, useRef, Suspense } from 'react'
import * as db from '../lib/db'
import Notificacoes from './Notificacoes'
import {
  Home, MessageSquare, BookOpen, Calendar, TrendingUp, FileText, Search, BarChart2,
  ChevronDown, ChevronLeft, ChevronRight, Edit, Star, Sun, Moon, LogOut,
  Plus, Sparkles, Globe, ClipboardList, Brain,
} from 'lucide-react'

/* ── Constants ───────────────────────────────────────────────── */
const PLANS = [
  { id: 'free',     name: 'Grátis',    price: 'R$0',     period: '',     desc: 'Acesso completo sem limite de uso.',           current: true,  featured: false },
  { id: 'monthly',  name: 'Mensal',    price: 'R$14,90', period: '/mês', desc: 'Cancele a qualquer momento, sem burocracia.',  current: false, featured: true  },
  { id: 'semester', name: 'Semestral', price: 'R$59,90', period: '/sem', desc: 'Equivale a R$10/mês. Economia de 33%.',        current: false, featured: false },
]

const IC     = { size: 13, strokeWidth: 1.8 }
const IC_NAV = { size: 14, strokeWidth: 1.8 }

/* ── Component ───────────────────────────────────────────────── */
export default function Sidebar(props) {
  // useSearchParams below requires a Suspense boundary for SSG.
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  )
}

function SidebarInner({ perfil, onPerfilUpdate }) {
  const pathname     = usePathname()
  const searchParams = useSearchParams()
  const router       = useRouter()

  const isHome        = pathname === '/dashboard'
  const isChat        = pathname === '/dashboard/chat'
  const materiaParam  = searchParams.get('materia')
  const isGeralActive = isChat && !materiaParam

  const materias = perfil?.materias
    ? perfil.materias.split(',').map(m => m.trim()).filter(Boolean)
    : []

  const [tema,           setTema]           = useState('dark')
  const [plano,          setPlano]          = useState('gratis')
  const [userMeta,       setUserMeta]       = useState(null)
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [editOpen,       setEditOpen]       = useState(false)
  const [planosOpen,     setPlanosOpen]     = useState(false)
  const [addMateriaOpen, setAddMateriaOpen] = useState(false)
  const [formPerfil,     setFormPerfil]     = useState({})
  const [novaMateria,    setNovaMateria]    = useState('')
  const [salvando,       setSalvando]       = useState(false)
  const [assinandoPlano, setAssinandoPlano] = useState(null)
  const [erroPlano,      setErroPlano]      = useState(null)
  const [collapsed,      setCollapsed]      = useState(() => {
    try { return localStorage.getItem('pointai_sidebar_collapsed') === 'true' } catch { return false }
  })

  const dropdownRef = useRef(null)

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
          email:  user.email || null,
        })
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (perfil) {
      setFormPerfil({
        nome:         perfil.nome         || '',
        curso:        perfil.curso        || '',
        universidade: perfil.universidade || '',
        semestre:     perfil.semestre     || '',
        materias:     perfil.materias     || '',
        objetivo:     perfil.objetivo     || '',
      })
    }
  }, [perfil])

  useEffect(() => {
    if (!dropdownOpen) return
    function handler(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropdownOpen])

  function toggleCollapsed() {
    setCollapsed(c => {
      const novo = !c
      try { localStorage.setItem('pointai_sidebar_collapsed', String(novo)) } catch {}
      return novo
    })
  }

  function toggleTema() {
    const novo = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    localStorage.setItem('pointai_tema', novo)
    document.documentElement.classList.toggle('dark', novo === 'dark')
  }

  async function sair() {
    await db.signOut()
    // Hard navigation — bypass Next router cache to ensure no stale
    // auth state survives in client memory.
    window.location.href = '/login'
  }

  async function salvarPerfil() {
    setSalvando(true)
    await db.savePerfil(formPerfil)
    onPerfilUpdate?.(formPerfil)
    setSalvando(false)
    setEditOpen(false)
  }

  function confirmarNovaMateria() {
    const nome = novaMateria.trim()
    if (!nome) return
    const novaLista = [...materias, nome]
    const novoPerf  = { ...perfil, materias: novaLista.join(', ') }
    db.savePerfil(novoPerf)
    onPerfilUpdate?.(novoPerf)
    setNovaMateria('')
    setAddMateriaOpen(false)
  }

  async function assinarPlano(planoId) {
    if (assinandoPlano) return
    setAssinandoPlano(planoId)
    setErroPlano(null)
    try {
      const user   = await db.getUser()
      const pf     = JSON.parse(localStorage.getItem('pointai_perfil') || '{}')
      const email  = user?.email || ''
      const nome   = pf.nome || user?.user_metadata?.full_name || ''
      const userId = user?.id || ''
      if (!email) {
        setErroPlano('Faça login para assinar.')
        setAssinandoPlano(null)
        return
      }
      const resp = await fetch('/api/assinar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plano: planoId === 'monthly' ? 'mensal' : 'semestral', userId, email, nome }),
      })
      const data = await resp.json()
      if (data.erro) { setErroPlano(data.erro); setAssinandoPlano(null); return }
      window.location.href = data.init_point
    } catch {
      setErroPlano('Erro de conexão. Tente novamente.')
      setAssinandoPlano(null)
    }
  }

  /* ── Nav items (single source of truth) ─────────────────── */
  const NAV_ITEMS = [
    { href: '/dashboard',      Icon: Home,         label: 'Home',                   active: isHome },
    { href: '/dashboard/chat', Icon: Globe,        label: 'Chat Geral',             active: isGeralActive },
    { href: '/notas',          Icon: BookOpen,     label: 'Notas e Faltas',         active: pathname === '/notas' },
    { href: '/calendario',     Icon: Calendar,     label: 'Calendário',             active: pathname === '/calendario' },
    { href: '/evolucao',       Icon: TrendingUp,   label: 'Minha Evolução',         active: pathname === '/evolucao' },
    { href: '/trabalhos',      Icon: FileText,     label: 'Correção de Trabalhos',  active: pathname === '/trabalhos' },
    { href: '/analise',        Icon: Search,       label: 'Análise de Materiais',   active: pathname === '/analise',   pro: true },
    { href: '/relatorio',      Icon: BarChart2,    label: 'Relatório Semanal',      active: pathname === '/relatorio', pro: true },
    { href: '/simulado',       Icon: ClipboardList,label: 'Simulado Inteligente',   active: pathname === '/simulado',  pro: true },
    { href: '/plano',          Icon: Brain,        label: 'Plano de Estudos',       active: pathname === '/plano',     pro: true },
  ]

  const inicialNome = perfil?.nome?.charAt(0)?.toUpperCase() || '?'
  const avatarEl    = userMeta?.avatar
    ? <img src={userMeta.avatar} alt={perfil?.nome} className="sidebar-avatar" style={{ padding:0, objectFit:'cover', borderRadius:'50%' }} referrerPolicy="no-referrer" />
    : <div className="sidebar-avatar">{inicialNome}</div>

  return (
    <>
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        {/* ── Logo ── */}
        <div className="sidebar-header">
          <div style={{ display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between', marginBottom: collapsed ? 0 : 14 }}>
            <Link href="/dashboard" className="sidebar-logo" style={{ marginBottom:0 }} aria-label="Point">
              <Image
                src="/logo-mark.png"
                alt="Point"
                width={collapsed ? 24 : 28}
                height={collapsed ? 24 : 28}
                className="sidebar-logo-mark"
                priority
              />
              {!collapsed && <span>Point</span>}
            </Link>
            <div style={{ display:'flex', alignItems:'center', gap: collapsed ? 0 : 6 }}>
              {!collapsed && <Notificacoes />}
              <button
                className="sb-collapse-btn"
                onClick={toggleCollapsed}
                title={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              >
                {collapsed
                  ? <ChevronRight size={14} strokeWidth={2} />
                  : <ChevronLeft  size={14} strokeWidth={2} />
                }
              </button>
            </div>
          </div>

          {/* ── Account trigger + dropdown ── */}
          {!collapsed && perfil && (
            <div className="sb-dropdown-wrap" ref={dropdownRef} data-tour="account-btn">
              <button
                className="sidebar-account-btn"
                onClick={() => setDropdownOpen(o => !o)}
                aria-label="Menu da conta"
              >
                {avatarEl}
                <div className="sidebar-profile-info">
                  <p className="sidebar-profile-name">{perfil.nome}</p>
                  <p className="sidebar-profile-sub">{perfil.curso} · {perfil.semestre}</p>
                </div>
                <span style={{ marginLeft:'auto', color:'var(--text-4)', flexShrink:0, lineHeight:1 }}>
                  <ChevronDown {...IC} size={11} />
                </span>
              </button>

              {dropdownOpen && (
                <div className="sb-dropdown">
                  <div className="sb-dd-header">
                    {userMeta?.avatar
                      ? <img src={userMeta.avatar} alt={perfil.nome} className="sb-dd-avatar" style={{ padding:0, objectFit:'cover', borderRadius:'50%' }} referrerPolicy="no-referrer" />
                      : <div className="sb-dd-avatar">{inicialNome}</div>
                    }
                    <div className="sb-dd-info">
                      <p className="sb-dd-name">{perfil.nome}</p>
                      <p className="sb-dd-meta">{perfil.curso}</p>
                      <p className="sb-dd-meta">{userMeta?.email || perfil.universidade}</p>
                    </div>
                  </div>

                  <div className="sb-dd-body">
                    <button className="sb-dd-item" onClick={() => { setDropdownOpen(false); setEditOpen(true) }}>
                      <span className="sb-dd-icon"><Edit {...IC} /></span>
                      Editar perfil
                    </button>

                    <button className="sb-dd-item" onClick={() => { setDropdownOpen(false); setPlanosOpen(true) }}>
                      <span className="sb-dd-icon"><Star {...IC} /></span>
                      {plano === 'pro'
                        ? <><Sparkles size={12} strokeWidth={1.8} style={{ display:'inline', marginRight:4 }} />Plano Pro · Ativo</>
                        : 'Plano Grátis · Ver planos'}
                    </button>

                    <div className="sb-dd-divider" />

                    <button className="sb-dd-item" onClick={toggleTema}>
                      <span className="sb-dd-icon">
                        {tema === 'dark' ? <Sun {...IC} /> : <Moon {...IC} />}
                      </span>
                      {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
                      <span className={`sb-dd-toggle ${tema === 'light' ? 'active' : ''}`}>
                        <span className="sb-dd-toggle-thumb" />
                      </span>
                    </button>

                    <div className="sb-dd-divider" />

                    <button className="sb-dd-item danger" onClick={sair}>
                      <span className="sb-dd-icon"><LogOut {...IC} /></span>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Menu principal ── */}
        <div className="sidebar-section sidebar-nav-main">
          <p className="sidebar-section-label">Menu</p>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ href, Icon, label, pro, active }) => (
              <Link
                key={href + label}
                href={href}
                title={label}
                className={`sidebar-nav-link ${active ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">
                  <Icon {...IC_NAV} />
                </span>
                <span>{label}</span>
                {pro && <span className="sb-pro-badge">Pro</span>}
              </Link>
            ))}
          </nav>
        </div>

        {/* ── Minhas Matérias ── */}
        {materias.length > 0 && (
          <div className="sidebar-section" data-tour="materias">
            <p className="sidebar-section-label">Minhas Matérias</p>
            <nav className="sidebar-nav">
              {materias.map(m => {
                const ativo = isChat && materiaParam === m
                return (
                  <Link
                    key={m}
                    href={`/dashboard/chat?materia=${encodeURIComponent(m)}`}
                    className={`sidebar-materia-btn ${ativo ? 'active' : ''}`}
                    title={m}
                  >
                    <span className="sidebar-materia-dot" />
                    <span className="sidebar-materia-text">{m}</span>
                  </Link>
                )
              })}
              <button className="sb-add-materia" onClick={() => setAddMateriaOpen(true)}>
                <Plus size={11} strokeWidth={2.5} /> Nova matéria
              </button>
            </nav>
          </div>
        )}
      </aside>

      {/* ── Edit Profile Modal ── */}
      {editOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setEditOpen(false)}>
          <div className="sb-modal">
            <div className="sb-modal-header">
              <p className="sb-modal-title">Editar perfil</p>
              <button className="sb-modal-close" onClick={() => setEditOpen(false)}>×</button>
            </div>
            {[
              { key: 'nome',         label: 'Nome' },
              { key: 'curso',        label: 'Curso' },
              { key: 'universidade', label: 'Universidade' },
              { key: 'semestre',     label: 'Semestre' },
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
                style={{ resize:'vertical' }}
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

      {/* ── Plans Modal ── */}
      {planosOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setPlanosOpen(false)}>
          <div className="sb-modal">
            <div className="sb-modal-header">
              <p className="sb-modal-title">Planos</p>
              <button className="sb-modal-close" onClick={() => setPlanosOpen(false)}>×</button>
            </div>
            <p style={{ fontSize:13, color:'var(--text-3)', marginBottom:16, lineHeight:1.5 }}>
              Você está no <strong style={{ color:'#22c55e' }}>Plano Grátis</strong>. Assine o Pro para acesso ilimitado.
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
                            ? <><svg style={{ animation:'spin 1s linear infinite', width:12, height:12 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Redirecionando…</>
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
              <p style={{ fontSize:12, color:'#f87171', background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.18)', borderRadius:8, padding:'7px 12px', marginTop:12, textAlign:'center' }}>
                {erroPlano}
              </p>
            )}
            <p style={{ fontSize:11.5, color:'var(--text-4)', marginTop:14, textAlign:'center' }}>
              Pagamento seguro via Mercado Pago · Cancele quando quiser
            </p>
          </div>
        </div>
      )}

      {/* ── Nova Matéria Modal ── */}
      {addMateriaOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setAddMateriaOpen(false)}>
          <div className="sb-modal" style={{ maxWidth:380 }}>
            <div className="sb-modal-header">
              <p className="sb-modal-title">Nova matéria</p>
              <button className="sb-modal-close" onClick={() => setAddMateriaOpen(false)}>×</button>
            </div>
            <div className="sb-form-group">
              <label className="sb-label">Nome da matéria</label>
              <input
                className="sb-input"
                placeholder="Ex: Cálculo II, Banco de Dados…"
                value={novaMateria}
                onChange={e => setNovaMateria(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmarNovaMateria()}
                autoFocus
              />
            </div>
            <div className="sb-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setAddMateriaOpen(false); setNovaMateria('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovaMateria} disabled={!novaMateria.trim()}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
