'use client'
import { useState, useEffect, useRef, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'motion/react'
import Sidebar from '../components/Sidebar'
import PortalImportModal from '../components/PortalImportModal'
import ImportModal from '../components/ImportModal'
import * as db from '../lib/db'
import MateriaCard from './MateriaCard'
import { Download, Camera, ClipboardList, FileSpreadsheet, RefreshCw, X, Upload, Loader2 } from 'lucide-react'

// Defaults ao criar uma matéria sob demanda no modelo novo.
const TOTAL_AULAS_PADRAO = 60
const MEDIA_APROVACAO_PADRAO = 7.0

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
  const [materias,      setMaterias]      = useState([])    // nomes do perfil
  const [rows,          setRows]          = useState([])    // modelo novo (materias_aluno + avaliacoes)
  const [carregandoRows, setCarregandoRows] = useState(true)
  const [dados,         setDados]         = useState({})    // modelo ANTIGO — usado só pela importação (coexiste até a Parte 3)
  const [portalModal,   setPortalModal]   = useState(false)
  const [canvasConfig,  setCanvasConfig]  = useState(null)
  const [moodleConfig,  setMoodleConfig]  = useState(null)
  const [syncingCanvas, setSyncingCanvas] = useState(false)
  const [syncingMoodle, setSyncingMoodle] = useState(false)
  const [toast,         setToast]         = useState(null)
  const [importOpen,    setImportOpen]    = useState(false)

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

  // Recarrega as notas do modelo novo a partir do Supabase.
  async function recarregarRows() {
    try {
      const lista = await db.getMaterias()
      setRows(lista)
    } catch (e) {
      mostrarToast(e.message || 'Erro ao carregar notas')
    } finally {
      setCarregandoRows(false)
    }
  }

  // Reload (modelo ANTIGO) após import de boletim. A importação ainda grava
  // no modelo antigo — migração para o modelo novo é Parte 3.
  useEffect(() => {
    function onImport(e) {
      if (e.detail?.kind !== 'notas') return
      try {
        const d = JSON.parse(localStorage.getItem('pointai_notas') || 'null')
        if (d && typeof d === 'object') setDados(d)
        const p = JSON.parse(localStorage.getItem('pointai_perfil') || 'null')
        if (p?.materias) {
          const lista = p.materias.split(',').map(s => s.trim()).filter(Boolean)
          setMaterias(lista)
        }
        mostrarToast('✓ Notas importadas (boletim)')
      } catch (err) {
        console.error('[notas] reload after import failed', err)
      }
    }
    window.addEventListener('pointai-import-done', onImport)
    return () => window.removeEventListener('pointai-import-done', onImport)
  }, [])

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (!p) return
      setPerfil(p)
      const lista = (p.materias || '').split(',').map(m => m.trim()).filter(Boolean)
      setMaterias(lista)
      // Modelo antigo (só para a importação coexistir)
      const salvo = await db.getNotas()
      setDados(salvo || {})
      // Modelo novo (fonte de verdade das notas nesta tela)
      await recarregarRows()
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

    try {
      const cv = JSON.parse(localStorage.getItem('pointai_canvas') || 'null')
      if (cv?.dominio) setCanvasConfig(cv)
    } catch {}
    try {
      const md = JSON.parse(localStorage.getItem('pointai_moodle') || 'null')
      if (md?.dominio) setMoodleConfig(md)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Modelo novo: handlers (todos propagam erro p/ a UI; toast + rethrow) ──

  // Garante que a matéria existe em materias_aluno; cria sob demanda.
  async function ensureMateria(nome) {
    const existente = rows.find(r => r.nome.toLowerCase() === nome.toLowerCase())
    if (existente) return existente
    const nova = await db.upsertMateria({
      nome, faltas: 0, total_aulas: TOTAL_AULAS_PADRAO, media_aprovacao: MEDIA_APROVACAO_PADRAO,
    })
    const comAv = { ...nova, avaliacoes: [] }
    setRows(prev => [...prev, comAv].sort((a, b) => a.nome.localeCompare(b.nome)))
    return comAv
  }

  async function handleAddAvaliacao(nome) {
    try {
      const m = await ensureMateria(nome)
      const n = (m.avaliacoes?.length || 0) + 1
      const av = await db.addAvaliacao(m.id, { nome: `Avaliação ${n}`, nota: null, peso: 1 })
      setRows(prev => prev.map(r => r.id === m.id ? { ...r, avaliacoes: [...(r.avaliacoes || []), av] } : r))
    } catch (e) { mostrarToast(e.message); throw e }
  }

  async function handleUpdateAvaliacao(avId, patch) {
    try {
      const upd = await db.updateAvaliacao(avId, patch)
      setRows(prev => prev.map(r => ({
        ...r,
        avaliacoes: (r.avaliacoes || []).map(a => a.id === avId ? { ...a, ...upd } : a),
      })))
    } catch (e) { mostrarToast(e.message); throw e }
  }

  async function handleDeleteAvaliacao(avId) {
    try {
      await db.deleteAvaliacao(avId)
      setRows(prev => prev.map(r => ({
        ...r,
        avaliacoes: (r.avaliacoes || []).filter(a => a.id !== avId),
      })))
    } catch (e) { mostrarToast(e.message); throw e }
  }

  async function handleUpdateMateria(nome, patch) {
    try {
      const upd = await db.upsertMateria({ nome, ...patch })
      setRows(prev => {
        const existe = prev.some(r => r.id === upd.id)
        if (existe) return prev.map(r => r.id === upd.id ? { ...r, ...upd } : r)
        return [...prev, { ...upd, avaliacoes: [] }].sort((a, b) => a.nome.localeCompare(b.nome))
      })
    } catch (e) { mostrarToast(e.message); throw e }
  }

  // Une matérias do perfil (mesmo sem linha ainda) com as do modelo novo.
  const cards = useMemo(() => {
    const map = new Map()
    materias.forEach(n => map.set(n.toLowerCase(), { nome: n, row: null }))
    rows.forEach(r => {
      const k = r.nome.toLowerCase()
      if (map.has(k)) map.get(k).row = r
      else map.set(k, { nome: r.nome, row: r })
    })
    return [...map.values()]
  }, [materias, rows])

  // ── Importação (modelo ANTIGO — preservada; migração na Parte 3) ──────────

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
        const rows2 = csv.split('\n').filter(r => r.trim().replace(/,/g, '').trim())
        await enviarTexto(rows2.slice(0, 120).join('\n'))
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

  // Merge e save (modelo ANTIGO) — usado pela importação (IA + Canvas/Moodle).
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
    setDados(novo)
    db.saveNotas(novo)
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

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        <nav className="page-breadcrumb">
          <span className="page-breadcrumb-item">Point</span>
          <span className="page-breadcrumb-sep">›</span>
          <span className="page-breadcrumb-current">Notas e Faltas</span>
        </nav>

        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Notas e Faltas</h1>
            <p className="page-subtitle">Acompanhe seu desempenho em cada matéria</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input ref={importFileRef}   type="file" accept="image/jpeg,image/jpg,image/png" onChange={selecionarImagem}   style={{ display: 'none' }} />
            <input ref={planilhaFileRef} type="file" accept=".xlsx,.xls,.csv"                onChange={selecionarPlanilha} style={{ display: 'none' }} />

            <button
              onClick={() => setImportOpen(true)}
              className="btn btn-primary"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Upload size={13} strokeWidth={1.8} /> Importar boletim
            </button>

            <button
              onClick={() => setPortalModal(true)}
              className="btn btn-ghost"
              style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={13} strokeWidth={1.8} /> Importar do portal
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
          {carregandoRows ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '60px 0', color: 'var(--text-4)' }}>
              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Carregando notas…
            </div>
          ) : cards.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-3)' }}>
              Nenhuma matéria ainda. Adicione matérias no seu perfil para começar.
            </div>
          ) : (
            <motion.div
              layout
              style={{
                display: 'grid', gap: 16,
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                alignItems: 'start',
              }}
            >
              <AnimatePresence>
                {cards.map(({ nome, row }, i) => (
                  <MateriaCard
                    key={nome}
                    nome={nome}
                    row={row}
                    index={i}
                    onAddAvaliacao={handleAddAvaliacao}
                    onUpdateAvaliacao={handleUpdateAvaliacao}
                    onDeleteAvaliacao={handleDeleteAvaliacao}
                    onUpdateMateria={handleUpdateMateria}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
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

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} context="notas" />

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
