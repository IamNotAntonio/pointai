'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import * as db from '../lib/db'

const TIPO_CONFIG = {
  prova:        { label: 'Prova',        cls: 'badge badge-red',    emoji: '📝' },
  trabalho:     { label: 'Trabalho',     cls: 'badge badge-blue',   emoji: '📄' },
  apresentacao: { label: 'Apresentação', cls: 'badge badge-purple', emoji: '🎤' },
  outro:        { label: 'Outro',        cls: 'badge badge-gray',   emoji: '📌' },
}

function diasRestantes(data) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(data + 'T00:00:00') - hoje) / 86400000)
}

function urgencyClass(dias) {
  if (dias < 0)  return 'past'
  if (dias <= 3) return 'urgent'
  if (dias <= 7) return 'warning'
  return ''
}

function formatDate(data) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DayChip({ dias }) {
  if (dias < 0)  return <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Passado</span>
  if (dias === 0) return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Hoje!</span>
  if (dias === 1) return <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>Amanhã!</span>
  const cor = dias <= 7 ? '#d97706' : 'var(--text-3)'
  return <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{dias}d</span>
}

export default function Calendario() {
  const [perfil, setPerfil]   = useState(null)
  const [eventos, setEventos] = useState([])
  const [materias, setMaterias] = useState([])
  const [form, setForm] = useState({ titulo: '', data: '', tipo: 'prova', materia: '' })

  const [modal, setModal] = useState({
    aberto: false, aba: 'foto',
    imagem: null, texto: '',
    carregando: false, preview: null, erro: null,
    selecionados: new Set(),
  })
  const importFileRef = useRef(null)

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        const lista = p.materias.split(',').map(m => m.trim())
        setMaterias(lista)
        setForm(prev => ({ ...prev, materia: lista[0] }))
      }
      const evs = await db.getEventos()
      setEventos(evs)
    }
    carregar()
  }, [])

  function syncLocal(novos) {
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
  }

  async function salvarEvento() {
    if (!form.titulo || !form.data) return
    const eventoBase = { ...form, id: Date.now() }
    const eventoSalvo = await db.saveEvento(eventoBase)
    const novos = [...eventos, eventoSalvo]
      .sort((a, b) => new Date(a.data) - new Date(b.data))
    syncLocal(novos)
    setForm({ titulo: '', data: '', tipo: 'prova', materia: materias[0] })
  }

  async function removerEvento(id) {
    await db.deleteEvento(id)
    syncLocal(eventos.filter(e => e.id !== id))
  }

  // ── Import modal ──
  function abrirModal() {
    setModal({ aberto: true, aba: 'foto', imagem: null, texto: '', carregando: false, preview: null, erro: null, selecionados: new Set() })
  }

  function fecharModal() { setModal(p => ({ ...p, aberto: false })) }

  function selecionarImagem(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setModal(p => ({ ...p, imagem: { dataUrl: ev.target.result, tipo: file.type } }))
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  async function enviarImport() {
    const { aba, imagem, texto } = modal
    if (aba === 'foto' && !imagem) return
    if (aba === 'texto' && !texto.trim()) return

    setModal(p => ({ ...p, carregando: true, erro: null }))

    try {
      const body = { tipo: 'calendario', perfil }
      if (aba === 'foto') {
        body.imagemBase64 = imagem.dataUrl.split(',')[1]
        body.imagemTipo   = imagem.tipo
      } else {
        body.texto = texto
      }

      const resp = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const result = await resp.json()

      if (result.erro) {
        setModal(p => ({ ...p, carregando: false, erro: result.erro }))
      } else {
        const todos = new Set(result.dados?.eventos?.map((_, i) => i) || [])
        setModal(p => ({ ...p, carregando: false, preview: result.dados, selecionados: todos }))
      }
    } catch {
      setModal(p => ({ ...p, carregando: false, erro: 'Erro de conexão. Tente novamente.' }))
    }
  }

  function toggleSelecionado(i) {
    setModal(p => {
      const s = new Set(p.selecionados)
      s.has(i) ? s.delete(i) : s.add(i)
      return { ...p, selecionados: s }
    })
  }

  async function confirmarImport() {
    const { preview, selecionados } = modal
    if (!preview?.eventos?.length) return

    const paraImportar = preview.eventos
      .filter((_, i) => selecionados.has(i))
      .map(e => ({
        titulo: e.titulo,
        data: e.data,
        tipo: ['prova', 'trabalho', 'apresentacao', 'outro'].includes(e.tipo) ? e.tipo : 'outro',
        materia: e.materia || (materias[0] || ''),
      }))

    const salvos = await Promise.all(paraImportar.map(e => db.saveEvento({ ...e, id: Date.now() + Math.random() })))
    const todos = [...eventos, ...salvos].sort((a, b) => new Date(a.data) - new Date(b.data))
    syncLocal(todos)
    fecharModal()
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const proximos = eventos.filter(e => diasRestantes(e.data) >= 0)
  const passados = eventos.filter(e => diasRestantes(e.data) < 0).reverse()

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb"><span className="page-breadcrumb-item">Point.AI</span><span className="page-breadcrumb-sep">›</span><span className="page-breadcrumb-current">Calendário</span></nav>

        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Calendário Acadêmico</h1>
            <p className="page-subtitle">Suas provas, trabalhos e prazos em um só lugar</p>
          </div>
          <button onClick={abrirModal} className="btn btn-ghost" style={{ fontSize: 13 }}>
            📥 Importar calendário
          </button>
        </div>

        <div className="page-scroll">

          {/* Adicionar evento */}
          <div className="card" style={{ marginBottom: 24 }}>
            <p className="card-title">Adicionar evento</p>
            <div className="grid-2" style={{ marginBottom: 12 }}>
              <div>
                <label className="label">Nome do evento</label>
                <input type="text" placeholder="Ex: Prova de Cálculo II" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Data</label>
                <input type="date" value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input">
                  <option value="prova">📝 Prova</option>
                  <option value="trabalho">📄 Trabalho</option>
                  <option value="apresentacao">🎤 Apresentação</option>
                  <option value="outro">📌 Outro</option>
                </select>
              </div>
              <div>
                <label className="label">Matéria</label>
                <select value={form.materia} onChange={e => setForm({ ...form, materia: e.target.value })} className="input">
                  {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <button onClick={salvarEvento} className="btn btn-primary" style={{ width: '100%' }}>
              + Salvar evento
            </button>
          </div>

          {/* Próximos */}
          {proximos.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>
                Próximos eventos — {proximos.length}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {proximos.map(evento => {
                  const dias = diasRestantes(evento.data)
                  const tipo = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.outro
                  return (
                    <div key={evento.id} className={`event-item ${urgencyClass(dias)}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                          {tipo.emoji}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{evento.titulo}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={tipo.cls}>{tipo.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{evento.materia}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatDate(evento.data)}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                        <DayChip dias={dias} />
                        <button onClick={() => removerEvento(evento.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 18, lineHeight: 1, padding: '2px 4px', borderRadius: 6 }} aria-label="Remover">×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {proximos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-4)' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📅</p>
              <p style={{ fontWeight: 600, color: 'var(--text-3)' }}>Nenhum evento próximo</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Adicione suas provas e prazos acima</p>
            </div>
          )}

          {/* Passados */}
          {passados.length > 0 && (
            <div>
              <div className="divider" />
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-4)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.04em' }}>
                Eventos passados
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {passados.map(evento => {
                  const tipo = TIPO_CONFIG[evento.tipo] ?? TIPO_CONFIG.outro
                  return (
                    <div key={evento.id} className="event-item past">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                        <span style={{ fontSize: 15 }}>{tipo.emoji}</span>
                        <p style={{ fontSize: 13, color: 'var(--text-2)' }}>{evento.titulo}</p>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>· {evento.materia}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{formatDate(evento.data)}</span>
                        <button onClick={() => removerEvento(evento.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 16 }}>×</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Import Modal ── */}
      {modal.aberto && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <p className="modal-title">Importar Calendário Acadêmico</p>
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>

            {!modal.preview ? (
              <>
                <div className="modal-tabs">
                  {['foto', 'texto'].map(aba => (
                    <button
                      key={aba}
                      className={`modal-tab ${modal.aba === aba ? 'active' : ''}`}
                      onClick={() => setModal(p => ({ ...p, aba, erro: null }))}
                    >
                      {aba === 'foto' ? '📷 Enviar foto' : '📋 Colar texto'}
                    </button>
                  ))}
                </div>

                {modal.aba === 'foto' ? (
                  <>
                    <input ref={importFileRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={selecionarImagem} style={{ display: 'none' }} />
                    {modal.imagem ? (
                      <div style={{ position: 'relative' }}>
                        <img src={modal.imagem.dataUrl} alt="Preview" style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 280, objectFit: 'contain', background: 'var(--surface-2)' }} />
                        <button
                          onClick={() => setModal(p => ({ ...p, imagem: null }))}
                          style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    ) : (
                      <div className="modal-dropzone" onClick={() => importFileRef.current?.click()}>
                        <p style={{ fontSize: 32, marginBottom: 10 }}>📸</p>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Clique para enviar uma foto</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Foto do cronograma, screenshot do portal ou calendário impresso</p>
                      </div>
                    )}
                  </>
                ) : (
                  <textarea
                    value={modal.texto}
                    onChange={e => setModal(p => ({ ...p, texto: e.target.value }))}
                    className="input"
                    placeholder="Cole aqui o texto com os eventos do calendário acadêmico — cronograma, datas de provas, prazos..."
                    rows={8}
                    style={{ resize: 'vertical' }}
                  />
                )}

                {modal.erro && <p className="modal-err">{modal.erro}</p>}

                <button
                  onClick={enviarImport}
                  className="btn btn-primary"
                  style={{ width: '100%', marginTop: 16 }}
                  disabled={modal.carregando || (modal.aba === 'foto' ? !modal.imagem : !modal.texto.trim())}
                >
                  {modal.carregando ? '⏳ Analisando com IA...' : 'Extrair eventos com IA →'}
                </button>
              </>
            ) : (
              <>
                <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                    {modal.preview.eventos?.length ?? 0} eventos encontrados
                  </p>
                  <button
                    onClick={() => {
                      const total = modal.preview.eventos?.length ?? 0
                      const todos = modal.selecionados.size === total ? new Set() : new Set([...Array(total).keys()])
                      setModal(p => ({ ...p, selecionados: todos }))
                    }}
                    style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {modal.selecionados.size === (modal.preview.eventos?.length ?? 0) ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                <div className="modal-preview-box">
                  <p className="modal-preview-label">Selecione os eventos para importar</p>
                  {modal.preview.eventos?.map((ev, i) => {
                    const tipo = TIPO_CONFIG[ev.tipo] ?? TIPO_CONFIG.outro
                    const checked = modal.selecionados.has(i)
                    return (
                      <div
                        key={i}
                        className="modal-preview-row"
                        style={{ cursor: 'pointer', opacity: checked ? 1 : .45 }}
                        onClick={() => toggleSelecionado(i)}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelecionado(i)}
                          onClick={e => e.stopPropagation()}
                          style={{ width: 16, height: 16, accentColor: 'var(--brand)', flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 18 }}>{tipo.emoji}</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{ev.titulo}</p>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span className={tipo.cls} style={{ fontSize: 10 }}>{tipo.label}</span>
                            {ev.materia && <span style={{ fontSize: 11, color: 'var(--text-4)' }}>· {ev.materia}</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--text-3)', flexShrink: 0 }}>
                          {ev.data ? formatDate(ev.data) : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setModal(p => ({ ...p, preview: null }))} className="btn btn-ghost" style={{ flex: 1 }}>
                    ← Tentar novamente
                  </button>
                  <button
                    onClick={confirmarImport}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={modal.selecionados.size === 0}
                  >
                    + Adicionar {modal.selecionados.size} evento{modal.selecionados.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
