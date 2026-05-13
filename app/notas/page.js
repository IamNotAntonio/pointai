'use client'
import { useState, useEffect, useRef } from 'react'
import Sidebar from '../components/Sidebar'
import * as db from '../lib/db'

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
  const [perfil, setPerfil]       = useState(null)
  const [materias, setMaterias]   = useState([])
  const [dados, setDados]         = useState({})
  const [materiaAtiva, setMateriaAtiva] = useState(null)

  const [modal, setModal] = useState({
    aberto: false, aba: 'foto',
    imagem: null, texto: '',
    carregando: false, preview: null, erro: null,
  })
  const importFileRef = useRef(null)

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
  }, [])

  function salvar(novo) {
    setDados(novo)
    db.saveNotas(novo) // fire-and-forget; localStorage written synchronously inside
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
    if (media >= 7) return { label: 'Aprovado', cls: 'badge badge-green' }
    if (media >= 5) return { label: 'Recuperação', cls: 'badge badge-yellow' }
    return { label: 'Reprovado', cls: 'badge badge-red' }
  }

  function faltaStatus(materia) {
    const d = dados[materia] || VAZIO
    const max = Math.floor(d.totalAulas * 0.25)
    const r = max - d.faltas
    if (r > 5) return { label: `${r} faltas restantes`, cor: 'var(--brand)' }
    if (r > 0) return { label: `Só ${r} faltas restantes!`, cor: '#d97706' }
    return { label: 'Limite atingido!', cor: '#dc2626' }
  }

  // ── Import modal ──
  function abrirModal() {
    setModal({ aberto: true, aba: 'foto', imagem: null, texto: '', carregando: false, preview: null, erro: null })
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
      const body = { tipo: 'notas', perfil }
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
        setModal(p => ({ ...p, carregando: false, preview: result.dados }))
      }
    } catch {
      setModal(p => ({ ...p, carregando: false, erro: 'Erro de conexão. Tente novamente.' }))
    }
  }

  function confirmarImport() {
    const { preview } = modal
    if (!preview?.materias?.length) return
    const novo = { ...dados }

    preview.materias.forEach(m => {
      const chave = matchMateria(materias, m.nome) || m.nome
      novo[chave] = {
        notas: ([...( m.notas || [])].slice(0, 3).concat(['', '', ''])).slice(0, 3).map(n => (n === null || n === undefined) ? '' : String(n)),
        faltas: m.faltas ?? 0,
        totalAulas: m.totalAulas ?? 60,
      }
    })

    salvar(novo)
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
        {/* Breadcrumb */}
        <nav className="page-breadcrumb"><span className="page-breadcrumb-item">Point.AI</span><span className="page-breadcrumb-sep">›</span><span className="page-breadcrumb-current">Notas e Faltas</span></nav>

        {/* Header */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title">Notas e Faltas</h1>
            <p className="page-subtitle">Acompanhe seu desempenho em cada matéria</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={abrirModal} className="btn btn-ghost" style={{ fontSize: 13 }}>
              📥 Importar do portal
            </button>
            <select
              value={materiaAtiva || ''}
              onChange={e => setMateriaAtiva(e.target.value)}
              className="input"
              style={{ width: 'auto', minWidth: 180 }}
            >
              {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div className="page-scroll">
          {/* Stat cards */}
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

          {/* Frequência */}
          {dm.totalAulas > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className="card-title" style={{ margin: 0 }}>Frequência</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: dm.faltas >= maxF ? '#dc2626' : 'var(--brand)' }}>
                  {dm.faltas}/{maxF} faltas
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${dm.faltas >= maxF ? 'progress-red' : dm.faltas >= maxF - 3 ? 'progress-yellow' : 'progress-green'}`}
                  style={{ width: `${Math.min(100, (dm.faltas / Math.max(maxF, 1)) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Avaliações */}
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Avaliações</p>
            <div className="grid-3">
              {dm.notas.map((nota, i) => (
                <div key={i}>
                  <label className="label">Avaliação {i + 1}</label>
                  <input
                    type="number" min="0" max="10" step="0.1"
                    value={nota}
                    onChange={e => atualizarNota(materiaAtiva, i, e.target.value)}
                    placeholder="—"
                    className="input"
                    style={{ textAlign: 'center', fontSize: 20, fontWeight: 700 }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Faltas */}
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Controle de Faltas</p>
            <div className="grid-2">
              <div>
                <label className="label">Total de aulas no semestre</label>
                <input
                  type="number" value={dm.totalAulas}
                  onChange={e => update(materiaAtiva, 'totalAulas', parseInt(e.target.value) || 60)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Faltas até agora</label>
                <input
                  type="number" value={dm.faltas}
                  onChange={e => update(materiaAtiva, 'faltas', parseInt(e.target.value) || 0)}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Alertas */}
          {notaFalta !== null && (
            <div className="alert alert-yellow">
              <span style={{ fontSize: 20 }}>🎯</span>
              <p>Para atingir média <strong>7.0</strong>, você precisa tirar pelo menos <strong>{notaFalta}</strong> na próxima avaliação.</p>
            </div>
          )}
          {media !== null && parseFloat(media) >= 7 && (
            <div className="alert" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <p>Ótimo trabalho! Você está <strong>aprovado</strong> em {materiaAtiva} com média {media}.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Import Modal ── */}
      {modal.aberto && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && fecharModal()}>
          <div className="modal">
            <div className="modal-header">
              <p className="modal-title">Importar Notas do Portal</p>
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
                        <p style={{ fontSize: 12, color: 'var(--text-4)' }}>Screenshot do portal, foto da tela ou printscreen</p>
                      </div>
                    )}
                  </>
                ) : (
                  <textarea
                    value={modal.texto}
                    onChange={e => setModal(p => ({ ...p, texto: e.target.value }))}
                    className="input"
                    placeholder="Cole aqui o texto copiado do portal da faculdade com suas notas e faltas..."
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
                  {modal.carregando ? '⏳ Analisando com IA...' : 'Extrair notas com IA →'}
                </button>
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
                            {match && <span className="badge badge-green" style={{ fontSize: 10 }}>✓ {match}</span>}
                            {!match && <span className="badge badge-yellow" style={{ fontSize: 10 }}>Nova matéria</span>}
                          </div>
                          <p style={{ fontSize: 12, color: 'var(--text-3)' }}>
                            Notas: {(m.notas || []).filter(n => n !== null).join(' · ') || '—'}
                            &nbsp;·&nbsp;
                            Faltas: {m.faltas ?? 0} / {m.totalAulas ?? 60} aulas
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button onClick={() => setModal(p => ({ ...p, preview: null }))} className="btn btn-ghost" style={{ flex: 1 }}>
                    ← Tentar novamente
                  </button>
                  <button onClick={confirmarImport} className="btn btn-primary" style={{ flex: 1 }}>
                    ✓ Confirmar importação
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
