'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import PortalImportModal from '../components/PortalImportModal'
import * as db from '../lib/db'
import { Download, Calendar, Camera, ClipboardList, FileText, File, Mic, Bookmark, Upload, CheckSquare, RefreshCw, X } from 'lucide-react'

const TIPO_CONFIG = {
  prova:        { label: 'Prova',        cls: 'badge badge-red',    Icon: FileText },
  trabalho:     { label: 'Trabalho',     cls: 'badge badge-blue',   Icon: File },
  apresentacao: { label: 'Apresentação', cls: 'badge badge-purple', Icon: Mic },
  outro:        { label: 'Outro',        cls: 'badge badge-gray',   Icon: Bookmark },
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

/* ── ICS Parser ─────────────────────────────────────────────── */
function detectarTipo(titulo = '', descricao = '') {
  const txt = (titulo + ' ' + descricao).toLowerCase()
  if (/prova|avalia[cç][aã]o|exame|teste/.test(txt)) return 'prova'
  if (/trabalho|entrega|tcc|relat[oó]rio/.test(txt)) return 'trabalho'
  if (/apresenta[cç][aã]o|semin[aá]rio|defesa/.test(txt)) return 'apresentacao'
  return 'prova'
}

function parseICSDate(raw = '') {
  // Handle "DTSTART;TZID=...:20260515T100000" and "DTSTART:20260515T100000Z"
  const val = raw.includes(':') ? raw.split(':').pop() : raw
  const clean = val.replace(/Z$/, '').replace(/[^0-9T]/g, '').trim()
  const d = clean.replace('T', '').slice(0, 8) // YYYYMMDD
  if (d.length < 8) return null
  return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
}

function parseICS(text) {
  const events = []
  // Unfold line continuations (RFC 5545: CRLF + SPACE/TAB)
  const unfolded = text.replace(/\r?\n[ \t]/g, '')
  const blocks = unfolded.split(/BEGIN:VEVENT/i).slice(1)

  for (const block of blocks) {
    const endIdx = block.search(/END:VEVENT/i)
    const body = endIdx >= 0 ? block.slice(0, endIdx) : block
    const lines = body.split(/\r?\n/).filter(Boolean)

    const props = {}
    for (const line of lines) {
      const sep = line.indexOf(':')
      if (sep < 0) continue
      // Key may have params: DTSTART;TZID=..., grab base key
      const keyFull = line.slice(0, sep)
      const key = keyFull.split(';')[0].toUpperCase()
      const val = line.slice(sep + 1)
        .replace(/\\n/g, ' ')   // ICS escaped newlines → space
        .replace(/\\,/g, ',')   // ICS escaped commas
        .trim()
      props[key] = val
    }

    if (!props.DTSTART) continue
    const titulo = (props.SUMMARY || 'Evento sem título').slice(0, 120)
    const descricao = props.DESCRIPTION || ''
    const data = parseICSDate(props.DTSTART)
    if (!data) continue

    events.push({
      titulo,
      data,
      descricao,
      tipo: detectarTipo(titulo, descricao),
      materia: '',
    })
  }

  // Sort by date ascending
  return events.sort((a, b) => a.data.localeCompare(b.data))
}

/* ── Component ──────────────────────────────────────────────── */
export default function Calendario() {
  const [perfil,        setPerfil]        = useState(null)
  const [eventos,       setEventos]       = useState([])
  const [materias,      setMaterias]      = useState([])
  const [form,          setForm]          = useState({ titulo: '', data: '', tipo: 'prova', materia: '' })
  const [toast,         setToast]         = useState(null)
  const [portalModal,   setPortalModal]   = useState(false)
  const [canvasConfig,  setCanvasConfig]  = useState(null)
  const [moodleConfig,  setMoodleConfig]  = useState(null)
  const [syncingCanvas, setSyncingCanvas] = useState(false)
  const [syncingMoodle, setSyncingMoodle] = useState(false)

  const [modal, setModal] = useState({
    aberto: false, aba: 'foto',
    imagem: null, texto: '',
    carregando: false, preview: null, erro: null,
    selecionados: new Set(),
  })

  const [icsModal, setIcsModal] = useState({
    aberto: false,
    eventos: [],
    selecionados: new Set(),
    erro: null,
    materiaMap: {},   // index → materia override
  })

  const importFileRef = useRef(null)
  const icsFileRef    = useRef(null)

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

    // Detect OAuth callback
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const canvasStatus = params.get('canvas')
      const canvasDomain = params.get('canvas_domain')
      if (canvasStatus === 'connected' && canvasDomain) {
        const cfg = { via: 'oauth', dominio: canvasDomain }
        localStorage.setItem('pointai_canvas', JSON.stringify(cfg))
        setCanvasConfig(cfg)
        mostrarToast('Canvas conectado com sucesso!')
        window.history.replaceState({}, '', window.location.pathname)
      } else if (canvasStatus === 'error') {
        mostrarToast('Erro ao conectar com o Canvas. Tente novamente.')
        window.history.replaceState({}, '', window.location.pathname)
      }
    }

    // Read saved integration configs
    try {
      const cv = JSON.parse(localStorage.getItem('pointai_canvas') || 'null')
      if (cv?.dominio) setCanvasConfig(cv)
    } catch {}
    try {
      const md = JSON.parse(localStorage.getItem('pointai_moodle') || 'null')
      if (md?.dominio) setMoodleConfig(md)
    } catch {}
  }, [])

  async function quickSyncCanvas() {
    if (!canvasConfig) return
    setSyncingCanvas(true)
    try {
      let resp
      if (canvasConfig.via === 'oauth') {
        resp = await fetch('/api/canvas/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tipo: 'calendario' }),
        })
      } else {
        resp = await fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: canvasConfig.token, dominio: canvasConfig.dominio, tipo: 'calendario' }),
        })
      }
      const result = await resp.json()
      if (result.erro) mostrarToast(result.erro)
      else await handleCanvasEventos(result.dados.eventos)
    } catch { mostrarToast('Erro ao conectar com o Canvas.') }
    setSyncingCanvas(false)
  }

  async function quickSyncMoodle() {
    if (!moodleConfig) return
    setSyncingMoodle(true)
    try {
      const resp   = await fetch('/api/moodle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: moodleConfig.token, dominio: moodleConfig.dominio, tipo: 'calendario' }),
      })
      const result = await resp.json()
      if (result.erro) mostrarToast(result.erro)
      else await handleCanvasEventos(result.dados.eventos)
    } catch { mostrarToast('Erro ao conectar com o Moodle.') }
    setSyncingMoodle(false)
  }

  function desconectarCanvas() {
    localStorage.removeItem('pointai_canvas')
    setCanvasConfig(null)
  }

  function desconectarMoodle() {
    localStorage.removeItem('pointai_moodle')
    setMoodleConfig(null)
  }

  function syncLocal(novos) {
    setEventos(novos)
    localStorage.setItem('pointai_eventos', JSON.stringify(novos))
  }

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
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

  // ── AI Import modal ──
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
    mostrarToast(`${salvos.length} evento${salvos.length !== 1 ? 's' : ''} importado${salvos.length !== 1 ? 's' : ''} com sucesso!`)
  }

  // ── ICS Import ──
  function handleICSFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const evs = parseICS(ev.target.result)
        const mat = materias[0] || ''
        const materiaMap = Object.fromEntries(evs.map((_, i) => [i, mat]))
        if (evs.length === 0) {
          setIcsModal({ aberto: true, eventos: [], selecionados: new Set(), erro: 'Nenhum evento encontrado no arquivo .ics.', materiaMap: {} })
        } else {
          setIcsModal({ aberto: true, eventos: evs, selecionados: new Set(evs.map((_, i) => i)), erro: null, materiaMap })
        }
      } catch {
        setIcsModal({ aberto: true, eventos: [], selecionados: new Set(), erro: 'Erro ao ler o arquivo. Verifique se é um .ics válido.', materiaMap: {} })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function toggleICSSel(i) {
    setIcsModal(p => {
      const s = new Set(p.selecionados)
      s.has(i) ? s.delete(i) : s.add(i)
      return { ...p, selecionados: s }
    })
  }

  function toggleTodosICS() {
    setIcsModal(p => {
      const todos = p.selecionados.size === p.eventos.length
        ? new Set()
        : new Set(p.eventos.map((_, i) => i))
      return { ...p, selecionados: todos }
    })
  }

  async function confirmarICS() {
    const { eventos: evs, selecionados, materiaMap } = icsModal
    const paraImportar = evs
      .filter((_, i) => selecionados.has(i))
      .map((e, i) => ({
        titulo:  e.titulo,
        data:    e.data,
        tipo:    e.tipo,
        materia: materiaMap[evs.indexOf(e)] || (materias[0] || ''),
      }))
    const salvos = await Promise.all(
      paraImportar.map(e => db.saveEvento({ ...e, id: Date.now() + Math.random() }))
    )
    const todos = [...eventos, ...salvos].sort((a, b) => new Date(a.data) - new Date(b.data))
    syncLocal(todos)
    setIcsModal({ aberto: false, eventos: [], selecionados: new Set(), erro: null, materiaMap: {} })
    mostrarToast(`${salvos.length} evento${salvos.length !== 1 ? 's' : ''} importado${salvos.length !== 1 ? 's' : ''} com sucesso!`)
  }

  // ── Canvas import handler ────────────────────────────────────────
  async function handleCanvasEventos(eventosList) {
    const salvos = await Promise.all(
      eventosList.map(e => db.saveEvento({
        titulo:  e.titulo,
        data:    e.data,
        tipo:    ['prova', 'trabalho', 'apresentacao', 'outro'].includes(e.tipo) ? e.tipo : 'outro',
        materia: e.materia || (materias[0] || ''),
        id:      Date.now() + Math.random(),
      }))
    )
    const todos = [...eventos, ...salvos].sort((a, b) => new Date(a.data) - new Date(b.data))
    syncLocal(todos)
    mostrarToast(`${salvos.length} evento${salvos.length !== 1 ? 's' : ''} importado${salvos.length !== 1 ? 's' : ''} do Canvas!`)
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setPortalModal(true)}
              className="btn btn-ghost"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} strokeWidth={1.8} /> Importar do portal
            </button>
            {/* ICS stays as a separate utility */}
            <input ref={icsFileRef} type="file" accept=".ics,text/calendar" onChange={handleICSFile} style={{ display: 'none' }} />
            <button
              onClick={() => icsFileRef.current?.click()}
              className="btn btn-ghost"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={13} strokeWidth={1.8} /> Importar .ics
            </button>
          </div>
        </div>

        {/* Connection banners */}
        {(canvasConfig || moodleConfig) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 0 16px' }}>
            {canvasConfig && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,.06)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 10, padding: '9px 14px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e', letterSpacing: '.04em', textTransform: 'uppercase' }}>Canvas</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', flex: 1 }}>{canvasConfig.dominio}</span>
                <button
                  onClick={quickSyncCanvas}
                  disabled={syncingCanvas}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#22c55e', background: 'none', border: 'none', cursor: syncingCanvas ? 'default' : 'pointer', opacity: syncingCanvas ? .6 : 1, padding: '2px 6px' }}
                >
                  <RefreshCw size={12} strokeWidth={2.5} style={{ animation: syncingCanvas ? 'spin 1s linear infinite' : 'none' }} />
                  {syncingCanvas ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button onClick={desconectarCanvas} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 2 }}>
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            )}
            {moodleConfig && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 10, padding: '9px 14px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#3b82f6', letterSpacing: '.04em', textTransform: 'uppercase' }}>Moodle</span>
                <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'monospace', flex: 1 }}>{moodleConfig.dominio}</span>
                <button
                  onClick={quickSyncMoodle}
                  disabled={syncingMoodle}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#3b82f6', background: 'none', border: 'none', cursor: syncingMoodle ? 'default' : 'pointer', opacity: syncingMoodle ? .6 : 1, padding: '2px 6px' }}
                >
                  <RefreshCw size={12} strokeWidth={2.5} style={{ animation: syncingMoodle ? 'spin 1s linear infinite' : 'none' }} />
                  {syncingMoodle ? 'Sincronizando...' : 'Sincronizar'}
                </button>
                <button onClick={desconectarMoodle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 2 }}>
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}

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
                  <option value="prova">Prova</option>
                  <option value="trabalho">Trabalho</option>
                  <option value="apresentacao">Apresentação</option>
                  <option value="outro">Outro</option>
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
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--text-3)' }}>
                          <tipo.Icon size={18} strokeWidth={1.8} />
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
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                <Calendar size={40} strokeWidth={1.3} />
              </div>
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
                        <tipo.Icon size={15} strokeWidth={1.8} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
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

      {/* ── Unified portal import modal ── */}
      <PortalImportModal
        aberto={portalModal}
        tipo="calendario"
        materias={materias}
        onClose={() => setPortalModal(false)}
        onOutros={() => abrirModal()}
        onSaveNotas={() => {}}
        onSaveEventos={handleCanvasEventos}
      />

      {/* ── AI Import Modal ── */}
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
                      {aba === 'foto'
                        ? <><Camera size={13} strokeWidth={1.8} /> Enviar foto</>
                        : <><ClipboardList size={13} strokeWidth={1.8} /> Colar texto</>}
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
                        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center', color: 'var(--text-4)' }}>
                          <Camera size={32} strokeWidth={1.3} />
                        </div>
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
                  {modal.carregando ? (
                    <><svg style={{ animation: 'spin 1s linear infinite', width: 14, height: 14, marginRight: 6 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analisando com IA...</>
                  ) : 'Extrair eventos com IA →'}
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
                        <tipo.Icon size={18} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
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

      {/* ── ICS Import Modal ── */}
      {icsModal.aberto && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setIcsModal(p => ({ ...p, aberto: false }))}>
          <div className="modal">
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={15} strokeWidth={1.8} style={{ color: 'var(--brand)' }} />
                <p className="modal-title">Importar arquivo .ics</p>
              </div>
              <button className="modal-close" onClick={() => setIcsModal(p => ({ ...p, aberto: false }))}>×</button>
            </div>

            {icsModal.erro ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: '#dc2626', marginBottom: 16 }}>{icsModal.erro}</p>
                <button
                  onClick={() => { setIcsModal(p => ({ ...p, aberto: false })); icsFileRef.current?.click() }}
                  className="btn btn-ghost"
                >
                  Tentar outro arquivo
                </button>
              </div>
            ) : (
              <>
                {/* Header bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
                    {icsModal.eventos.length} evento{icsModal.eventos.length !== 1 ? 's' : ''} encontrado{icsModal.eventos.length !== 1 ? 's' : ''}
                  </p>
                  <button
                    onClick={toggleTodosICS}
                    style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <CheckSquare size={12} strokeWidth={2} />
                    {icsModal.selecionados.size === icsModal.eventos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                  </button>
                </div>

                {/* Event list */}
                <div className="modal-preview-box">
                  <p className="modal-preview-label">Selecione e ajuste a matéria</p>
                  {icsModal.eventos.map((ev, i) => {
                    const tipo    = TIPO_CONFIG[ev.tipo] ?? TIPO_CONFIG.outro
                    const checked = icsModal.selecionados.has(i)
                    return (
                      <div
                        key={i}
                        className="modal-preview-row"
                        style={{ opacity: checked ? 1 : .4, alignItems: 'flex-start', gap: 10 }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleICSSel(i)}
                          style={{ width: 16, height: 16, accentColor: 'var(--brand)', flexShrink: 0, marginTop: 2, cursor: 'pointer' }}
                        />
                        <tipo.Icon size={16} strokeWidth={1.8} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4, lineHeight: 1.3 }}>{ev.titulo}</p>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                            <span className={tipo.cls} style={{ fontSize: 10 }}>{tipo.label}</span>
                            <span style={{ fontSize: 11, color: 'var(--text-4)' }}>·</span>
                            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{formatDate(ev.data)}</span>
                          </div>
                          {/* Matéria picker per event */}
                          <select
                            value={icsModal.materiaMap[i] ?? (materias[0] || '')}
                            onChange={e => setIcsModal(p => ({ ...p, materiaMap: { ...p.materiaMap, [i]: e.target.value } }))}
                            onClick={ev2 => ev2.stopPropagation()}
                            disabled={!checked}
                            style={{
                              fontSize: 11, padding: '3px 6px', borderRadius: 6,
                              border: '1px solid var(--border)', background: 'var(--surface)',
                              color: 'var(--text-2)', cursor: checked ? 'pointer' : 'default',
                              maxWidth: 180,
                            }}
                          >
                            {materias.map((m, mi) => <option key={mi} value={m}>{m}</option>)}
                          </select>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Footer actions */}
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button
                    onClick={() => setIcsModal(p => ({ ...p, aberto: false }))}
                    className="btn btn-ghost"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={confirmarICS}
                    className="btn btn-primary"
                    style={{ flex: 1 }}
                    disabled={icsModal.selecionados.size === 0}
                  >
                    + Importar {icsModal.selecionados.size} evento{icsModal.selecionados.size !== 1 ? 's' : ''}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
          background: '#141414', color: '#fff', borderRadius: 10,
          padding: '11px 20px', fontSize: 13, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.4)',
          border: '1px solid rgba(34,197,94,.4)',
          display: 'flex', alignItems: 'center', gap: 8,
          zIndex: 99999, whiteSpace: 'nowrap',
          animation: 'chatFadeIn .2s ease',
        }}>
          <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>
          {toast}
        </div>
      )}
    </div>
  )
}
