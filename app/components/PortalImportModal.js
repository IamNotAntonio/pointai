'use client'
import { useState, useEffect } from 'react'
import {
  Globe, Puzzle, Download, X, RefreshCw, LogOut, ExternalLink,
  ChevronLeft, ChevronRight, CheckSquare, ToggleRight, FolderOpen,
  CheckCircle, Camera, ClipboardList, FileText, File, Mic, Bookmark,
  Layers, Eye, EyeOff,
} from 'lucide-react'

/* ── Shared helpers ─────────────────────────────────────────────── */
const TIPO_EV = {
  prova:        { label: 'Prova',        cls: 'badge badge-red',    Icon: FileText },
  trabalho:     { label: 'Trabalho',     cls: 'badge badge-blue',   Icon: File },
  apresentacao: { label: 'Apresentação', cls: 'badge badge-purple', Icon: Mic },
  outro:        { label: 'Outro',        cls: 'badge badge-gray',   Icon: Bookmark },
}

function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function matchMateria(lista, nome) {
  const n = nome.toLowerCase()
  return (
    lista.find(m => m.toLowerCase() === n) ||
    lista.find(m => m.toLowerCase().includes(n) || n.includes(m.toLowerCase())) ||
    null
  )
}

/* ── Extension steps data ───────────────────────────────────────── */
const EXT_STEPS = [
  { n: 1, Icon: Download,     cor: '#22c55e', title: 'Baixe a extensão',               desc: 'Clique no botão abaixo para baixar o arquivo ZIP.',                                     download: true },
  { n: 2, Icon: Globe,        cor: '#3b82f6', title: 'Abra as extensões do Chrome',    desc: 'Na barra de endereços do Chrome, acesse:',                                              code: 'chrome://extensions' },
  { n: 3, Icon: ToggleRight,  cor: '#f59e0b', title: 'Ative o Modo Desenvolvedor',     desc: 'No canto superior direito, ative a chave "Modo do desenvolvedor".',                    visual: 'toggle' },
  { n: 4, Icon: FolderOpen,   cor: '#8b5cf6', title: 'Carregue a extensão',            desc: 'Clique em "Carregar sem compactação", extraia o ZIP e selecione a pasta extraída.',    visual: 'folder' },
  { n: 5, Icon: CheckCircle,  cor: '#22c55e', title: 'Pronto! Extensão instalada',     desc: 'O botão Point.AI aparecerá automaticamente no portal da sua faculdade.' },
]

/* ── Option cards on the menu ───────────────────────────────────── */
function OptionCard({ icon, cor, label, sub, badge, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        width: '100%', padding: '14px 16px',
        background: 'var(--surface-2)', border: '1px solid var(--border)',
        borderRadius: 12, cursor: 'pointer', textAlign: 'left',
        transition: 'border-color .15s, background .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = cor; e.currentTarget.style.background = 'var(--surface)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)' }}
    >
      <div style={{ width: 38, height: 38, borderRadius: 10, background: cor + '1a', border: `1.5px solid ${cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', letterSpacing: '-.2px' }}>{label}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 700, background: cor + '25', color: cor, borderRadius: 5, padding: '2px 6px', letterSpacing: '.03em' }}>{badge}</span>}
        </div>
        <p style={{ fontSize: 11.5, color: 'var(--text-4)', marginTop: 2, lineHeight: 1.4 }}>{sub}</p>
      </div>
      <ChevronRight size={15} strokeWidth={2} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
    </button>
  )
}

/* ── Spinner ────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3.5" opacity=".2"/>
      <path fill="currentColor" opacity=".8" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

/* ── Canvas sub-view ────────────────────────────────────────────── */
function CanvasView({ tipo, materias, onBack, onSaveNotas, onSaveEventos }) {
  const [config, setConfig]   = useState(null)      // {dominio, token} | null
  const [form,   setForm]     = useState({ dominio: '', token: '' })
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [sel,     setSel]     = useState(new Set())
  const [erro,    setErro]    = useState(null)

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('pointai_canvas') || 'null')
      if (saved?.token && saved?.dominio) {
        setConfig(saved)
        setForm({ dominio: saved.dominio, token: saved.token })
      }
    } catch {}
  }, [])

  async function conectar(dominioOverride, tokenOverride) {
    const dominio = (dominioOverride ?? form.dominio).trim().replace(/^https?:\/\//, '').replace(/\/+$/, '')
    const token   = (tokenOverride   ?? form.token).trim()
    if (!dominio || !token) { setErro('Preencha o domínio e o token.'); return }
    setLoading(true); setErro(null); setPreview(null)

    try {
      const resp = await fetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, dominio, tipo }),
      })
      const result = await resp.json()
      if (result.erro) {
        setErro(result.erro)
      } else {
        const cfg = { dominio, token }
        localStorage.setItem('pointai_canvas', JSON.stringify(cfg))
        setConfig(cfg)
        setPreview(result.dados)
        if (tipo === 'calendario' && result.dados?.eventos) {
          setSel(new Set(result.dados.eventos.map((_, i) => i)))
        }
      }
    } catch { setErro('Erro de conexão. Verifique sua internet.') }
    setLoading(false)
  }

  function desconectar() {
    localStorage.removeItem('pointai_canvas')
    setConfig(null); setForm({ dominio: '', token: '' }); setPreview(null); setErro(null)
  }

  function toggleSel(i) {
    setSel(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s })
  }

  function confirmar() {
    if (tipo === 'notas' && preview?.materias) {
      onSaveNotas(preview.materias)
    } else if (tipo === 'calendario' && preview?.eventos) {
      const selected = preview.eventos.filter((_, i) => sel.has(i))
      onSaveEventos(selected)
    }
  }

  // ── Preview state ──
  if (preview) {
    if (tipo === 'notas') {
      return (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{preview.materias?.length ?? 0}</span> matérias encontradas no Canvas
            </p>
          </div>

          <div className="modal-preview-box">
            <p className="modal-preview-label">Revise antes de importar</p>
            {preview.materias?.map((m, i) => {
              const match = matchMateria(materias, m.nome)
              const notasValidas = (m.notas || []).filter(n => n !== '' && n != null)
              return (
                <div key={i} className="modal-preview-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', flex: 1 }}>{m.nome}</p>
                    {match  && <span className="badge badge-green"  style={{ fontSize: 10, flexShrink: 0 }}>✓ {match}</span>}
                    {!match && <span className="badge badge-yellow" style={{ fontSize: 10, flexShrink: 0 }}>Nova matéria</span>}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {notasValidas.length > 0 ? `Notas: ${notasValidas.join(' · ')}` : 'Sem notas registradas'}
                    {' · '}Faltas: {m.faltas} / {m.totalAulas} aulas
                  </p>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button onClick={() => setPreview(null)} className="btn btn-ghost" style={{ flex: 1 }}>← Reconectar</button>
            <button onClick={confirmar} className="btn btn-primary" style={{ flex: 2 }}>
              ✓ Importar {preview.materias?.length} matéria{preview.materias?.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      )
    }

    // Eventos preview (calendario)
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex', padding: 2 }}>
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
              <span style={{ fontWeight: 700, color: 'var(--text-1)' }}>{preview.eventos?.length ?? 0}</span> eventos encontrados
            </p>
          </div>
          <button
            onClick={() => setSel(prev => prev.size === preview.eventos.length ? new Set() : new Set(preview.eventos.map((_, i) => i)))}
            style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <CheckSquare size={12} strokeWidth={2} />
            {sel.size === preview.eventos?.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
        </div>

        <div className="modal-preview-box">
          <p className="modal-preview-label">Selecione os eventos para importar</p>
          {preview.eventos?.map((ev, i) => {
            const conf    = TIPO_EV[ev.tipo] ?? TIPO_EV.outro
            const checked = sel.has(i)
            return (
              <div key={i} className="modal-preview-row" style={{ cursor: 'pointer', opacity: checked ? 1 : .45 }} onClick={() => toggleSel(i)}>
                <input type="checkbox" checked={checked} onChange={() => toggleSel(i)} onClick={e => e.stopPropagation()} style={{ width: 15, height: 15, accentColor: 'var(--brand)', flexShrink: 0 }} />
                <conf.Icon size={15} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{ev.titulo}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={conf.cls} style={{ fontSize: 10 }}>{conf.label}</span>
                    {ev.materia && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>· {ev.materia.slice(0, 30)}</span>}
                  </div>
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>{formatDate(ev.data)}</span>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button onClick={() => setPreview(null)} className="btn btn-ghost" style={{ flex: 1 }}>← Reconectar</button>
          <button onClick={confirmar} className="btn btn-primary" style={{ flex: 2 }} disabled={sel.size === 0}>
            + Importar {sel.size} evento{sel.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    )
  }

  // ── Loading state ──
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '32px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1a7a4a,#22c55e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Spinner />
          </div>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', marginBottom: 6 }}>Conectando ao Canvas...</p>
        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Buscando suas {tipo === 'notas' ? 'matérias e notas' : 'tarefas e prazos'}</p>
      </div>
    )
  }

  // ── Connected state (config exists, no preview yet) ──
  if (config) {
    return (
      <div>
        {/* Connected banner */}
        <div style={{ background: '#e8f5ee', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>✓</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Conectado ao Canvas</p>
            <p style={{ fontSize: 12, color: '#15803d', marginTop: 2, fontFamily: 'monospace' }}>{config.dominio}</p>
          </div>
          <button onClick={desconectar} title="Desconectar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#166534', display: 'flex', padding: 2 }}>
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>

        {erro && <p className="modal-err" style={{ marginBottom: 16 }}>{erro}</p>}

        <button
          onClick={() => conectar(config.dominio, config.token)}
          className="btn btn-primary"
          style={{ width: '100%', gap: 8, marginBottom: 10 }}
        >
          <RefreshCw size={14} strokeWidth={2.5} />
          Sincronizar agora
        </button>
        <button onClick={desconectar} className="btn btn-ghost" style={{ width: '100%', fontSize: 12 }}>
          Usar outro token
        </button>
      </div>
    )
  }

  // ── Config form ──
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label className="label">URL da instituição</label>
        <input
          className="input"
          placeholder="ex: suauniversidade.instructure.com"
          value={form.dominio}
          onChange={e => setForm(p => ({ ...p, dominio: e.target.value }))}
          autoComplete="off"
        />
      </div>
      <div style={{ marginBottom: 6 }}>
        <label className="label">Token de acesso pessoal</label>
        <div style={{ position: 'relative' }}>
          <input
            className="input"
            type={showToken ? 'text' : 'password'}
            placeholder="Cole seu token aqui..."
            value={form.token}
            onChange={e => setForm(p => ({ ...p, token: e.target.value }))}
            autoComplete="off"
            style={{ paddingRight: 40 }}
          />
          <button
            onClick={() => setShowToken(p => !p)}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex' }}
          >
            {showToken ? <EyeOff size={15} strokeWidth={1.8} /> : <Eye size={15} strokeWidth={1.8} />}
          </button>
        </div>
      </div>

      <a
        href="https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--brand)', textDecoration: 'none', marginBottom: 20 }}
      >
        <ExternalLink size={11} strokeWidth={2} />
        Como gerar meu token? (Perfil → Configurações → Novo Token)
      </a>

      {erro && <p className="modal-err" style={{ marginBottom: 12 }}>{erro}</p>}

      <button
        onClick={() => conectar()}
        className="btn btn-primary"
        style={{ width: '100%', gap: 8 }}
        disabled={!form.dominio.trim() || !form.token.trim()}
      >
        <Globe size={14} strokeWidth={2.5} />
        Conectar e importar
      </button>
    </div>
  )
}

/* ── Extension steps sub-view ───────────────────────────────────── */
function ExtensaoView() {
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {EXT_STEPS.map((step, idx) => (
          <div key={step.n}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: step.cor + '18', border: `1.5px solid ${step.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <step.Icon size={15} strokeWidth={2} color={step.cor} />
                </div>
                {idx < EXT_STEPS.length - 1 && <div style={{ width: 1, height: 18, background: 'var(--border)', marginTop: 4 }} />}
              </div>
              <div style={{ flex: 1, paddingBottom: 4 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '.07em', marginBottom: 3 }}>PASSO {step.n}</p>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-1)', marginBottom: 5, letterSpacing: '-.2px' }}>{step.title}</p>
                <p style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.55, marginBottom: step.download || step.code || step.visual ? 10 : 0 }}>{step.desc}</p>

                {step.download && (
                  <a href="/point-extension.zip" download="point-extension.zip"
                     style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg,#1a7a4a,#22c55e)', color: '#fff', textDecoration: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12.5, fontWeight: 600 }}>
                    <Download size={13} strokeWidth={2.5} /> Baixar extensão (.zip)
                  </a>
                )}
                {step.code && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px' }}>
                    <span style={{ fontSize: 12.5, fontFamily: 'monospace', color: '#60a5fa', fontWeight: 600 }}>{step.code}</span>
                    <button onClick={() => navigator.clipboard?.writeText(step.code)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 10.5, fontFamily: 'inherit' }}>copiar</button>
                  </div>
                )}
                {step.visual === 'toggle' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Modo do desenvolvedor</span>
                    <div style={{ width: 34, height: 18, borderRadius: 9, background: '#22c55e', display: 'flex', alignItems: 'center', padding: '2px', justifyContent: 'flex-end' }}>
                      <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff' }} />
                    </div>
                  </div>
                )}
                {step.visual === 'folder' && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
                    <FolderOpen size={13} strokeWidth={1.8} color="#8b5cf6" />
                    <span style={{ fontSize: 12, color: 'var(--text-3)' }}>Selecionar pasta extraída</span>
                  </div>
                )}
              </div>
            </div>
            {idx < EXT_STEPS.length - 1 && <div style={{ height: 1, background: 'var(--border)', marginLeft: 48 }} />}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <a href="/point-extension.zip" download="point-extension.zip" className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
          <Download size={14} strokeWidth={2.5} /> Baixar extensão (.zip)
        </a>
      </div>
    </div>
  )
}

/* ── Main export ────────────────────────────────────────────────── */
export default function PortalImportModal({
  aberto,
  tipo,           // 'notas' | 'calendario'
  materias,       // string[]
  onClose,
  onOutros,       // () => void — open existing foto/texto/planilha modal
  onSaveNotas,    // (previewMaterias: object[]) => void
  onSaveEventos,  // (eventos: object[]) => void
}) {
  const [view, setView] = useState('menu')

  useEffect(() => {
    if (aberto) setView('menu')
  }, [aberto])

  if (!aberto) return null

  const TITLES = {
    menu:      'Importar do portal',
    canvas:    'Canvas LMS',
    extensao:  'Instalar extensão Chrome',
  }

  function handleSaveNotas(materiasList) {
    onSaveNotas(materiasList)
    onClose()
  }
  function handleSaveEventos(eventosList) {
    onSaveEventos(eventosList)
    onClose()
  }

  return (
    <div
      className="modal-backdrop"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="modal" style={{ maxWidth: view === 'extensao' ? 500 : 540 }}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {view !== 'menu' && (
              <button
                onClick={() => setView('menu')}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-3)', flexShrink: 0 }}
              >
                <ChevronLeft size={14} strokeWidth={2.5} />
              </button>
            )}
            <p className="modal-title">{TITLES[view]}</p>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Menu */}
        {view === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <OptionCard
              icon={<Globe size={17} strokeWidth={1.8} color="#22c55e" />}
              cor="#22c55e"
              label="Canvas (Instructure)"
              sub="Importação direta via API — sem copiar e colar"
              badge="Recomendado"
              onClick={() => setView('canvas')}
            />
            <OptionCard
              icon={<Layers size={17} strokeWidth={1.8} color="#3b82f6" />}
              cor="#3b82f6"
              label="Outros portais"
              sub="Foto do portal, texto colado ou planilha Excel / CSV"
              onClick={() => { onClose(); onOutros() }}
            />
            <OptionCard
              icon={<Puzzle size={17} strokeWidth={1.8} color="#8b5cf6" />}
              cor="#8b5cf6"
              label="Extensão Chrome"
              sub="Botão automático no portal — importa com um clique"
              onClick={() => setView('extensao')}
            />
          </div>
        )}

        {/* Canvas */}
        {view === 'canvas' && (
          <CanvasView
            tipo={tipo}
            materias={materias}
            onBack={() => setView('menu')}
            onSaveNotas={handleSaveNotas}
            onSaveEventos={handleSaveEventos}
          />
        )}

        {/* Extension steps */}
        {view === 'extensao' && <ExtensaoView />}
      </div>
    </div>
  )
}
