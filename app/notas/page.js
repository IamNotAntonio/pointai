'use client'
import { useState, useEffect, useRef } from 'react'
import * as XLSX from 'xlsx'
import Sidebar from '../components/Sidebar'
import PortalImportModal from '../components/PortalImportModal'
import * as db from '../lib/db'
import { Download, Target, CheckCircle, Camera, ClipboardList, FileSpreadsheet, RefreshCw, X } from 'lucide-react'

const VAZIO = { notas: ['', '', ''], faltas: 0, totalAulas: 60 }

function matchMateria(lista, nome) {
  const n = nome.toLowerCase()
  return (
    lista.find(m => m.toLowerCase() === n) ||
    lista.find(m => m.toLowerCase().includes(n) || n.includes(m.toLowerCase())) ||
    null
  )
}

export default function Notas() {
  const [perfil,        setPerfil]        = useState(null)
  const [materias,      setMaterias]      = useState([])
  const [dados,         setDados]         = useState({})
  const [materiaAtiva,  setMateriaAtiva]  = useState(null)
  const [portalModal,   setPortalModal]   = useState(false)
  const [canvasConfig,  setCanvasConfig]  = useState(null)
  const [moodleConfig,  setMoodleConfig]  = useState(null)
  const [syncingCanvas, setSyncingCanvas] = useState(false)
  const [syncingMoodle, setSyncingMoodle] = useState(false)
  const [toast,         setToast]         = useState(null)

  const [modal, setModal] = useState({
    aberto: false, aba: 'foto',
    imagem: null, texto: '',
    carregando: false, preview: null, erro: null,
  })

  const importFileRef   = useRef(null)
  const planilhaFileRef = useRef(null)

  function mostrarToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (!p) return
      setPerfil(p)
      const lista = p.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateriaAtiva(lista[0])
      const salvo = await db.getNotas()
      if (salvo) {
        setDados(salvo)
      } else {
        const inicial = {}
        lista.forEach(m => { inicial[m] = { ...VAZIO, notas: ['', '', ''] } })
        setDados(inicial)
      }
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
          body: JSON.stringify({ tipo: 'notas' }),
        })
      } else {
        resp = await fetch('/api/canvas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: canvasConfig.token, dominio: canvasConfig.dominio, tipo: 'notas' }),
        })
      }
      const result = await resp.json()
      if (result.erro) mostrarToast(result.erro)
      else {
        aplicarPreviewNotas(result.dados.materias)
        mostrarToast('Notas importadas do Canvas!')
      }
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
        body: JSON.stringify({ token: moodleConfig.token, dominio: moodleConfig.dominio, tipo: 'notas' }),
      })
      const result = await resp.json()
      if (result.erro) mostrarToast(result.erro)
      else {
        aplicarPreviewNotas(result.dados.materias)
        mostrarToast('Notas importadas do Moodle!')
      }
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

  function salvar(novo) {
    setDados(novo)
    db.saveNotas(novo)
  }

  function update(materia, field, value) {
    const novo = { ...dados }
    if (!novo[materia]) novo[materia] = { ...VAZIO, notas: ['', '', ''] }
    novo[materia] = { ...novo[materia], [field]: value }
    salvar(novo)
  }

  function atualizarNota(materia, i, v) {
    const novo = { ...dados }
    if (!novo[materia]) novo[materia] = { ...VAZIO, notas: ['', '', ''] }
    const notas = [...(novo[materia].notas || ['', '', ''])]
    notas[i] = v
    novo[materia] = { ...novo[materia], notas }
    salvar(novo)
  }

  function calcularMedia(notas) {
    const v = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
    if (!v.length) return null
    return (v.reduce((a, n) => a + parseFloat(n), 0) / v.length).toFixed(1)
  }

  function mediaStatus(media) {
    if (media === null) return null
    if (media >= 7) return { label: 'Aprovado',    cls: 'badge badge-green' }
    if (media >= 5) return { label: 'Recuperação', cls: 'badge badge-yellow' }
    return             { label: 'Reprovado',   cls: 'badge badge-red' }
  }

  function faltaStatus(materia) {
    const d   = dados[materia] || VAZIO
    const max = Math.floor(d.totalAulas * 0.25)
    const r   = max - d.faltas
    if (r > 5) return { label: `${r} faltas restantes`,    cor: 'var(--brand)' }
    if (r > 0) return { label: `Só ${r} faltas restantes!`, cor: '#d97706' }
    return             { label: 'Limite atingido!',         cor: '#dc2626' }
  }

  // ── AI Import modal (foto / texto / planilha) ────────────────────
  function abrirModal(aba = 'foto') {
    setModal({ aberto: true, aba, imagem: null, texto: '', carregando: false, preview: null, erro: null })
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

  function selecionarPlanilha(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setModal(p => ({ ...p, carregando: true, erro: null }))
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const wb   = XLSX.read(ev.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const csv  = XLSX.utils.sheet_to_csv(ws, { blankrows: false })
        const rows = csv.split('\n').filter(r => r.trim().replace(/,/g, '').trim())
        await enviarTexto(rows.slice(0, 120).join('\n'))
      } catch {
        setModal(p => ({ ...p, carregando: false, erro: 'Erro ao ler o arquivo. Verifique se é .xlsx, .xls ou .csv válido.' }))
      }
    }
    reader.readAsArrayBuffer(file)
    e.target.value = ''
  }

  async function enviarTexto(texto) {
    if (!texto?.trim()) return
    setModal(p => ({ ...p, carregando: true, erro: null }))
    try {
      const resp   = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'notas', perfil, texto }),
      })
      const result = await resp.json()
      if (result.erro) {
        setModal(p => ({ ...p, carregando: false, erro: result.erro }))
      } else {
        setModal(p => ({ ...p, carregando: false, preview: result.dados }))
      }
    } catch {
      setModal(p => ({ ...p, carregando: false, erro: 'Erro de conexão. Tente novamente.' }))
    }
  }

  async function enviarImport() {
    const { aba, imagem, texto } = modal
    if (aba === 'foto' && !imagem) return
    if (aba === 'texto' && !texto.trim()) return
    setModal(p => ({ ...p, carregando: true, erro: null }))
    try {
      const body = { tipo: 'notas', perfil }
      if (aba === 'foto') { body.imagemBase64 = imagem.dataUrl.split(',')[1]; body.imagemTipo = imagem.tipo }
      else { body.texto = texto }
      const resp   = await fetch('/api/importar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const result = await resp.json()
      if (result.erro) {
        setModal(p => ({ ...p, carregando: false, erro: result.erro }))
      } else {
        setModal(p => ({ ...p, carregando: false, preview: result.dados }))
      }
    } catch {
      setModal(p => ({ ...p, carregando: false, erro: 'Erro de conexão. Tente novamente.' }))
    }
  }

  // ── Merge and save helper (used by both AI modal and Canvas) ──────
  function aplicarPreviewNotas(previewMaterias) {
    const novo = { ...dados }
    previewMaterias.forEach(m => {
      const chave = matchMateria(materias, m.nome) || m.nome
      novo[chave] = {
        notas:      ([...(m.notas || [])].slice(0, 3).concat(['', '', ''])).slice(0, 3)
                      .map(n => (n === null || n === undefined) ? '' : String(n)),
        faltas:     m.faltas     ?? 0,
        totalAulas: m.totalAulas ?? 60,
      }
    })
    salvar(novo)
  }

  function confirmarImport() {
    const { preview } = modal
    if (!preview?.materias?.length) return
    aplicarPreviewNotas(preview.materias)
    fecharModal()
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const dm      = dados[materiaAtiva] || { ...VAZIO, notas: ['', '', ''] }
  const media   = calcularMedia(dm.notas)
  const mStatus = mediaStatus(media)
  const fStatus = materiaAtiva ? faltaStatus(materiaAtiva) : null
  const maxF    = Math.floor(dm.totalAulas * 0.25)
  const notasV  = dm.notas.filter(n => n !== '')
  const notaFalta = notasV.length > 0 && media !== null && parseFloat(media) < 7
    ? Math.max(0, (7 * dm.notas.length - notasV.reduce((a, b) => a + parseFloat(b || 0), 0))).toFixed(1)
    : null

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point.AI</span>
          <span className="page-breadcrumb-sep">›</span>
          <span className="page-breadcrumb-current">Notas e Faltas</span>
        </nav>

        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Notas e Faltas</h1>
            <p className="page-subtitle">Acompanhe seu desempenho em cada matéria</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {/* Hidden file refs for sub-flows */}
            <input ref={importFileRef}   type="file" accept="image/jpeg,image/jpg,image/png" onChange={selecionarImagem}   style={{ display: 'none' }} />
            <input ref={planilhaFileRef} type="file" accept=".xlsx,.xls,.csv"                onChange={selecionarPlanilha} style={{ display: 'none' }} />

            <button
              onClick={() => setPortalModal(true)}
              className="btn btn-ghost"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} strokeWidth={1.8} /> Importar do portal
            </button>

            <select value={materiaAtiva || ''} onChange={e => setMateriaAtiva(e.target.value)} className="input" style={{ width: 'auto', minWidth: 180 }}>
              {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
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
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <p className="stat-value" style={{ color: 'var(--brand)' }}>{media ?? '—'}</p>
              <p className="stat-label">Média atual</p>
              {mStatus && <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}><span className={mStatus.cls}>{mStatus.label}</span></div>}
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: dm.faltas >= maxF ? '#dc2626' : 'var(--brand)' }}>{dm.faltas}</p>
              <p className="stat-label">Faltas usadas</p>
              {fStatus && <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: fStatus.cor }}>{fStatus.label}</p>}
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: 'var(--brand)' }}>{maxF}</p>
              <p className="stat-label">Máximo de faltas</p>
              <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>25% de {dm.totalAulas} aulas</p>
            </div>
          </div>

          {dm.totalAulas > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className="card-title" style={{ margin: 0 }}>Frequência</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: dm.faltas >= maxF ? '#dc2626' : 'var(--brand)' }}>{dm.faltas}/{maxF} faltas</span>
              </div>
              <div className="progress-bar">
                <div className={`progress-fill ${dm.faltas >= maxF ? 'progress-red' : dm.faltas >= maxF - 3 ? 'progress-yellow' : 'progress-green'}`} style={{ width: `${Math.min(100, (dm.faltas / Math.max(maxF, 1)) * 100)}%` }} />
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Avaliações</p>
            <div className="grid-3">
              {dm.notas.map((nota, i) => (
                <div key={i}>
                  <label className="label">Avaliação {i + 1}</label>
                  <input type="number" min="0" max="10" step="0.1" value={nota} onChange={e => atualizarNota(materiaAtiva, i, e.target.value)} placeholder="—" className="input" style={{ textAlign: 'center', fontSize: 20, fontWeight: 700 }} />
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Controle de Faltas</p>
            <div className="grid-2">
              <div>
                <label className="label">Total de aulas no semestre</label>
                <input type="number" value={dm.totalAulas} onChange={e => update(materiaAtiva, 'totalAulas', parseInt(e.target.value) || 60)} className="input" />
              </div>
              <div>
                <label className="label">Faltas até agora</label>
                <input type="number" value={dm.faltas} onChange={e => update(materiaAtiva, 'faltas', parseInt(e.target.value) || 0)} className="input" />
              </div>
            </div>
          </div>

          {notaFalta !== null && (
            <div className="alert alert-yellow">
              <Target size={18} strokeWidth={1.8} style={{ color: '#d97706', flexShrink: 0 }} />
              <p>Para atingir média <strong>7.0</strong>, você precisa tirar pelo menos <strong>{notaFalta}</strong> na próxima avaliação.</p>
            </div>
          )}
          {media !== null && parseFloat(media) >= 7 && (
            <div className="alert" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <CheckCircle size={18} strokeWidth={1.8} style={{ color: '#166534', flexShrink: 0 }} />
              <p>Ótimo trabalho! Você está <strong>aprovado</strong> em {materiaAtiva} com média {media}.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Unified portal import modal ── */}
      <PortalImportModal
        aberto={portalModal}
        tipo="notas"
        materias={materias}
        onClose={() => setPortalModal(false)}
        onOutros={() => abrirModal('foto')}
        onSaveNotas={(previewMaterias) => { aplicarPreviewNotas(previewMaterias) }}
        onSaveEventos={() => {}}
      />

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
        }}>
          <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>
          {toast}
        </div>
      )}

      {/* ── AI Import Modal (foto / texto / planilha) ── */}
      {modal.aberto && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <p className="modal-title">Importar Notas — Outros portais</p>
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>

            {!modal.preview ? (
              <>
                <div className="modal-tabs">
                  {[
                    { id: 'foto',     label: 'Foto',     Icon: Camera },
                    { id: 'texto',    label: 'Texto',    Icon: ClipboardList },
                    { id: 'planilha', label: 'Planilha', Icon: FileSpreadsheet },
                  ].map(({ id, label, Icon }) => (
                    <button key={id} className={`modal-tab ${modal.aba === id ? 'active' : ''}`} onClick={() => setModal(p => ({ ...p, aba: id, erro: null }))}>
                      <Icon size={13} strokeWidth={1.8} /> {label}
                    </button>
                  ))}
                </div>

                {modal.aba === 'foto' && (
                  <>
                    <input ref={importFileRef} type="file" accept="image/jpeg,image/jpg,image/png" onChange={selecionarImagem} style={{ display: 'none' }} />
                    {modal.imagem ? (
                      <div style={{ position: 'relative' }}>
                        <img src={modal.imagem.dataUrl} alt="Preview" style={{ width: '100%', borderRadius: 10, display: 'block', maxHeight: 280, objectFit: 'contain', background: 'var(--surface-2)' }} />
                        <button onClick={() => setModal(p => ({ ...p, imagem: null }))} style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                      </div>
                    ) : (
                      <div className="modal-dropzone" onClick={() => importFileRef.current?.click()}>
                        <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center', color: 'var(--text-4)' }}><Camera size={32} strokeWidth={1.3} /></div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Clique para enviar uma foto</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Screenshot do portal, foto da tela ou printscreen</p>
                      </div>
                    )}
                  </>
                )}

                {modal.aba === 'texto' && (
                  <textarea value={modal.texto} onChange={e => setModal(p => ({ ...p, texto: e.target.value }))} className="input" placeholder="Cole aqui o texto copiado do portal com suas notas e faltas..." rows={8} style={{ resize: 'vertical' }} />
                )}

                {modal.aba === 'planilha' && (
                  <div className="modal-dropzone" onClick={() => planilhaFileRef.current?.click()}>
                    <div style={{ marginBottom: 10, display: 'flex', justifyContent: 'center', color: 'var(--text-4)' }}><FileSpreadsheet size={32} strokeWidth={1.3} /></div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>Clique para selecionar a planilha</p>
                    <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Aceita .xlsx, .xls e .csv</p>
                  </div>
                )}

                {modal.erro && <p className="modal-err">{modal.erro}</p>}

                {modal.aba !== 'planilha' && (
                  <button
                    onClick={enviarImport}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 16 }}
                    disabled={modal.carregando || (modal.aba === 'foto' ? !modal.imagem : !modal.texto.trim())}
                  >
                    {modal.carregando
                      ? <><svg style={{ animation: 'spin 1s linear infinite', width: 14, height: 14, marginRight: 6 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Analisando com IA...</>
                      : 'Extrair notas com IA →'}
                  </button>
                )}

                {modal.aba === 'planilha' && modal.carregando && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-3)', fontSize: 13 }}>
                    <svg style={{ animation: 'spin 1s linear infinite', width: 18, height: 18, display: 'inline-block', marginRight: 8, verticalAlign: 'middle' }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/><path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    Lendo planilha com IA...
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="modal-preview-box">
                  <p className="modal-preview-label">Dados extraídos — revise antes de confirmar</p>
                  {modal.preview.materias?.map((m, i) => {
                    const match = matchMateria(materias, m.nome)
                    return (
                      <div key={i} className="modal-preview-row">
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{m.nome}</p>
                            {match  && <span className="badge badge-green"  style={{ fontSize: 10 }}>✓ {match}</span>}
                            {!match && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Nova matéria</span>}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Notas: {(m.notas || []).filter(n => n !== null).join(' · ') || '—'}
                            &nbsp;·&nbsp;Faltas: {m.faltas ?? 0} / {m.totalAulas ?? 60} aulas
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setModal(p => ({ ...p, preview: null }))} className="btn btn-ghost" style={{ flex: 1 }}>← Tentar novamente</button>
                  <button onClick={confirmarImport} className="btn btn-primary" style={{ flex: 1 }}>✓ Confirmar importação</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
