'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'
import * as db from '../lib/db'

/* ── Icons ───────────────────────────────────────────────────── */
function IcChevron() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
function IcEdit() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}
function IcStar() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  )
}
function IcSun() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}
function IcMoon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function IcLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function IcChat() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IcFolder() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function IcPlus() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

/* ── Constants ───────────────────────────────────────────────── */
const PLANS = [
  { id: 'free',     name: 'Grátis',    price: 'R$0',     period: '',     desc: 'Acesso completo sem limite de uso.',           current: true,  featured: false },
  { id: 'monthly',  name: 'Mensal',    price: 'R$14,90', period: '/mês', desc: 'Cancele a qualquer momento, sem burocracia.',  current: false, featured: true  },
  { id: 'semester', name: 'Semestral', price: 'R$59,90', period: '/sem', desc: 'Equivale a R$10/mês. Economia de 33%.',        current: false, featured: false },
]

const NAV_ITEMS = [
  { href: '/dashboard', icon: '💬', label: 'Chat' },
  { href: '/notas',     icon: '📊', label: 'Notas e Faltas' },
  { href: '/calendario',icon: '📅', label: 'Calendário' },
  { href: '/evolucao',  icon: '📈', label: 'Minha Evolução' },
  { href: '/trabalhos', icon: '📝', label: 'Correção de Trabalhos' },
]

/* ── Component ───────────────────────────────────────────────── */
export default function Sidebar({
  perfil,
  materias = [],
  materiaAtiva,
  onMateriaChange,
  topicos = {},
  topicoAtivo,
  onTopicoChange,
  onTopicosUpdate,
  onPerfilUpdate,
}) {
  const pathname    = usePathname()
  const router      = useRouter()
  const isDashboard = pathname === '/dashboard'

  const [tema,           setTema]           = useState('dark')
  const [dropdownOpen,   setDropdownOpen]   = useState(false)
  const [editOpen,       setEditOpen]       = useState(false)
  const [planosOpen,     setPlanosOpen]     = useState(false)
  const [addMateriaOpen, setAddMateriaOpen] = useState(false)
  const [addTopicoOpen,  setAddTopicoOpen]  = useState(false)
  const [formPerfil,     setFormPerfil]     = useState({})
  const [novaMateria,    setNovaMateria]    = useState('')
  const [novoTopico,     setNovoTopico]     = useState('')
  const [salvando,       setSalvando]       = useState(false)

  const dropdownRef = useRef(null)

  useEffect(() => {
    const saved = localStorage.getItem('pointai_tema') || 'dark'
    setTema(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
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

  function toggleTema() {
    const novo = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    localStorage.setItem('pointai_tema', novo)
    document.documentElement.classList.toggle('dark', novo === 'dark')
  }

  function sair() {
    localStorage.clear()
    router.push('/')
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

  function confirmarNovoTopico() {
    const nome = novoTopico.trim()
    if (!nome || !materiaAtiva) return
    const novosTopicos = db.addTopico(materiaAtiva, nome)
    onTopicosUpdate?.(novosTopicos)
    onTopicoChange?.(nome)
    setNovoTopico('')
    setAddTopicoOpen(false)
  }

  function deletarTopico(e, topico) {
    e.stopPropagation()
    const novosTopicos = db.removeTopico(materiaAtiva, topico)
    onTopicosUpdate?.(novosTopicos)
    if (topicoAtivo === topico) onTopicoChange?.(null)
  }

  const inicialNome    = perfil?.nome?.charAt(0)?.toUpperCase() || '?'
  const topicosMateria = topicos[materiaAtiva] || []

  return (
    <>
      <aside className="sidebar">
        {/* ── Logo ── */}
        <div className="sidebar-header">
          <Link href="/dashboard" className="sidebar-logo">Point.AI</Link>

          {/* ── Account trigger + dropdown ── */}
          {perfil && (
            <div className="sb-dropdown-wrap" ref={dropdownRef}>
              <button
                className="sidebar-account-btn"
                onClick={() => setDropdownOpen(o => !o)}
                aria-label="Menu da conta"
              >
                <div className="sidebar-avatar">{inicialNome}</div>
                <div className="sidebar-profile-info">
                  <p className="sidebar-profile-name">{perfil.nome}</p>
                  <p className="sidebar-profile-sub">{perfil.curso} · {perfil.semestre}</p>
                </div>
                <span style={{ marginLeft:'auto', color:'var(--text-4)', flexShrink:0, lineHeight:1 }}>
                  <IcChevron />
                </span>
              </button>

              {dropdownOpen && (
                <div className="sb-dropdown">
                  {/* Header */}
                  <div className="sb-dd-header">
                    <div className="sb-dd-avatar">{inicialNome}</div>
                    <div className="sb-dd-info">
                      <p className="sb-dd-name">{perfil.nome}</p>
                      <p className="sb-dd-meta">{perfil.curso}</p>
                      <p className="sb-dd-meta">{perfil.universidade}</p>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="sb-dd-body">
                    <button
                      className="sb-dd-item"
                      onClick={() => { setDropdownOpen(false); setEditOpen(true) }}
                    >
                      <span className="sb-dd-icon"><IcEdit /></span>
                      Editar perfil
                    </button>

                    <button
                      className="sb-dd-item"
                      onClick={() => { setDropdownOpen(false); setPlanosOpen(true) }}
                    >
                      <span className="sb-dd-icon"><IcStar /></span>
                      Plano Grátis · Ver planos
                    </button>

                    <div className="sb-dd-divider" />

                    {/* Theme toggle row */}
                    <button className="sb-dd-item" onClick={toggleTema}>
                      <span className="sb-dd-icon">
                        {tema === 'dark' ? <IcSun /> : <IcMoon />}
                      </span>
                      {tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
                      <span className={`sb-dd-toggle ${tema === 'light' ? 'active' : ''}`}>
                        <span className="sb-dd-toggle-thumb" />
                      </span>
                    </button>

                    <div className="sb-dd-divider" />

                    <button className="sb-dd-item danger" onClick={sair}>
                      <span className="sb-dd-icon"><IcLogout /></span>
                      Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Matérias + tópicos (dashboard only) ── */}
        {isDashboard && materias.length > 0 && (
          <div className="sidebar-section">
            <p className="sidebar-section-label">Matérias</p>
            <nav className="sidebar-nav">
              {materias.map((m, i) => (
                <div key={i}>
                  <button
                    onClick={() => onMateriaChange?.(m)}
                    className={`sidebar-materia-btn ${materiaAtiva === m ? 'active' : ''}`}
                  >
                    <span className="sidebar-materia-dot" />
                    <span className="sidebar-materia-text">{m}</span>
                  </button>

                  {/* Expandable topics */}
                  {materiaAtiva === m && (
                    <div className="sb-topico-list">
                      {/* Geral */}
                      <div className="sb-topico-row">
                        <button
                          className={`sb-topico-btn ${!topicoAtivo ? 'active' : ''}`}
                          onClick={() => onTopicoChange?.(null)}
                        >
                          <IcChat />
                          <span className="sb-topico-label">Geral</span>
                        </button>
                      </div>

                      {/* User topics */}
                      {topicosMateria.map((t, j) => (
                        <div key={j} className="sb-topico-row">
                          <button
                            className={`sb-topico-btn ${topicoAtivo === t ? 'active' : ''}`}
                            onClick={() => onTopicoChange?.(t)}
                          >
                            <IcFolder />
                            <span className="sb-topico-label">{t}</span>
                          </button>
                          <button
                            className="sb-topico-del"
                            onClick={(e) => deletarTopico(e, t)}
                            title="Remover tópico"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {/* Add topic */}
                      <button className="sb-topico-add" onClick={() => setAddTopicoOpen(true)}>
                        <IcPlus /> Novo tópico
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button className="sb-add-materia" onClick={() => setAddMateriaOpen(true)}>
                <IcPlus /> Nova matéria
              </button>
            </nav>
          </div>
        )}

        {/* ── Nav principal ── */}
        <div className="sidebar-section sidebar-nav-main">
          <p className="sidebar-section-label">Menu</p>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className={`sidebar-nav-link ${pathname === href ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">{icon}</span>
                <span>{label}</span>
              </Link>
            ))}
          </nav>
        </div>
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
            <p style={{ fontSize:13, color:'#71717a', marginBottom:16, lineHeight:1.5 }}>
              Você está no <strong style={{ color:'#22c55e' }}>Plano Grátis</strong> com acesso completo a todas as funcionalidades.
            </p>
            <div className="sb-plan-grid">
              {PLANS.map(plan => (
                <div key={plan.id} className={`sb-plan-card ${plan.featured ? 'featured' : ''}`}>
                  {plan.featured && <span className="sb-plan-badge">Mais popular</span>}
                  <p className="sb-plan-name">{plan.name}</p>
                  <p className="sb-plan-price">{plan.price}<span>{plan.period}</span></p>
                  <p className="sb-plan-desc">{plan.desc}</p>
                  {plan.current && <p className="sb-plan-current">✓ Plano atual</p>}
                </div>
              ))}
            </div>
            <p style={{ fontSize:12, color:'#3f3f46', marginTop:18, textAlign:'center' }}>
              Pagamento integrado em breve. Aproveite o acesso gratuito completo!
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

      {/* ── Novo Tópico Modal ── */}
      {addTopicoOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setAddTopicoOpen(false)}>
          <div className="sb-modal" style={{ maxWidth:380 }}>
            <div className="sb-modal-header">
              <p className="sb-modal-title">Novo tópico</p>
              <button className="sb-modal-close" onClick={() => setAddTopicoOpen(false)}>×</button>
            </div>
            <p style={{ fontSize:12.5, color:'#71717a', marginBottom:16 }}>
              Em <strong style={{ color:'#a1a1aa' }}>{materiaAtiva}</strong>
            </p>
            <div className="sb-form-group">
              <label className="sb-label">Nome do tópico</label>
              <input
                className="sb-input"
                placeholder="Ex: Listas, Funções, Herança…"
                value={novoTopico}
                onChange={e => setNovoTopico(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmarNovoTopico()}
                autoFocus
              />
            </div>
            <div className="sb-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setAddTopicoOpen(false); setNovoTopico('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovoTopico} disabled={!novoTopico.trim()}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
