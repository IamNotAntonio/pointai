'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

export default function Notas() {
  const [perfil, setPerfil] = useState(null)
  const [materias, setMaterias] = useState([])
  const [dados, setDados] = useState({})
  const [materiaAtiva, setMateriaAtiva] = useState(null)

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      const lista = perfil.materias.split(',').map(m => m.trim())
      setMaterias(lista)
      setMateriaAtiva(lista[0])
      const dadosSalvos = localStorage.getItem('pointai_notas')
      if (dadosSalvos) {
        setDados(JSON.parse(dadosSalvos))
      } else {
        const inicial = {}
        lista.forEach(m => { inicial[m] = { notas: ['', '', ''], faltas: 0, totalAulas: 60 } })
        setDados(inicial)
      }
    }
  }, [])

  function salvar(novosDados) {
    setDados(novosDados)
    localStorage.setItem('pointai_notas', JSON.stringify(novosDados))
  }

  function atualizarNota(materia, index, valor) {
    const novo = { ...dados }
    if (!novo[materia]) novo[materia] = { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
    novo[materia].notas[index] = valor
    salvar(novo)
  }

  function atualizarFaltas(materia, valor) {
    const novo = { ...dados }
    if (!novo[materia]) novo[materia] = { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
    novo[materia].faltas = parseInt(valor) || 0
    salvar(novo)
  }

  function atualizarTotalAulas(materia, valor) {
    const novo = { ...dados }
    if (!novo[materia]) novo[materia] = { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
    novo[materia].totalAulas = parseInt(valor) || 60
    salvar(novo)
  }

  function calcularMedia(notas) {
    const validas = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
    if (validas.length === 0) return null
    return (validas.reduce((acc, n) => acc + parseFloat(n), 0) / validas.length).toFixed(1)
  }

  function faltasRestantes(materia) {
    const d = dados[materia]
    if (!d) return 0
    return Math.floor(d.totalAulas * 0.25) - d.faltas
  }

  function mediaStatus(media) {
    if (media === null) return null
    if (media >= 7) return { label: 'Aprovado', cls: 'badge badge-green' }
    if (media >= 5) return { label: 'Recuperação', cls: 'badge badge-yellow' }
    return { label: 'Reprovado', cls: 'badge badge-red' }
  }

  function faltaStatus(materia) {
    const r = faltasRestantes(materia)
    if (r > 5) return { label: `${r} faltas restantes`, cor: 'var(--brand)' }
    if (r > 0) return { label: `⚠️ Só ${r} faltas restantes!`, cor: '#d97706' }
    return { label: '🚨 Limite atingido!', cor: '#dc2626' }
  }

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const dm = dados[materiaAtiva] || { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
  const media = calcularMedia(dm.notas)
  const mStatus = mediaStatus(media)
  const fStatus = materiaAtiva ? faltaStatus(materiaAtiva) : null
  const maxFaltas = Math.floor(dm.totalAulas * 0.25)
  const notasValidas = dm.notas.filter(n => n !== '')
  const notaFaltando = notasValidas.length > 0 && media !== null && parseFloat(media) < 7
    ? Math.max(0, (7 * dm.notas.length - notasValidas.reduce((a, b) => a + parseFloat(b || 0), 0))).toFixed(1)
    : null

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        {/* Header com seletor de matéria */}
        <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="page-title">Notas e Faltas</h1>
            <p className="page-subtitle">Acompanhe seu desempenho em cada matéria</p>
          </div>
          <select
            value={materiaAtiva || ''}
            onChange={e => setMateriaAtiva(e.target.value)}
            className="input"
            style={{ width: 'auto', minWidth: 180 }}
          >
            {materias.map((m, i) => <option key={i} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="page-scroll">

          {/* Stat cards */}
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <p className="stat-value">{media ?? '—'}</p>
              <p className="stat-label">Média atual</p>
              {mStatus && (
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                  <span className={mStatus.cls}>{mStatus.label}</span>
                </div>
              )}
            </div>
            <div className="stat-card">
              <p className="stat-value">{dm.faltas}</p>
              <p className="stat-label">Faltas usadas</p>
              {fStatus && (
                <p style={{ fontSize: 12, fontWeight: 600, marginTop: 6, color: fStatus.cor }}>
                  {fStatus.label}
                </p>
              )}
            </div>
            <div className="stat-card">
              <p className="stat-value">{maxFaltas}</p>
              <p className="stat-label">Máximo de faltas</p>
              <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
                25% de {dm.totalAulas} aulas
              </p>
            </div>
          </div>

          {/* Barra de progresso de faltas */}
          {dm.totalAulas > 0 && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <p className="card-title" style={{ margin: 0 }}>Frequência</p>
                <span style={{ fontSize: 13, fontWeight: 600, color: dm.faltas >= maxFaltas ? '#dc2626' : 'var(--brand)' }}>
                  {dm.faltas}/{maxFaltas} faltas
                </span>
              </div>
              <div className="progress-bar">
                <div
                  className={`progress-fill ${dm.faltas >= maxFaltas ? 'progress-red' : dm.faltas >= maxFaltas - 3 ? 'progress-yellow' : 'progress-green'}`}
                  style={{ width: `${Math.min(100, (dm.faltas / maxFaltas) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Avaliações</p>
            <div className="grid-3">
              {dm.notas.map((nota, i) => (
                <div key={i}>
                  <label className="label">Avaliação {i + 1}</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
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

          {/* Controle de faltas */}
          <div className="card" style={{ marginBottom: 16 }}>
            <p className="card-title">Controle de Faltas</p>
            <div className="grid-2">
              <div>
                <label className="label">Total de aulas no semestre</label>
                <input
                  type="number"
                  value={dm.totalAulas}
                  onChange={e => atualizarTotalAulas(materiaAtiva, e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Faltas até agora</label>
                <input
                  type="number"
                  value={dm.faltas}
                  onChange={e => atualizarFaltas(materiaAtiva, e.target.value)}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Alerta de nota */}
          {notaFaltando !== null && (
            <div className="alert alert-yellow">
              <span style={{ fontSize: 20 }}>🎯</span>
              <p>
                Para atingir média <strong>7.0</strong>, você precisa tirar pelo menos{' '}
                <strong>{notaFaltando}</strong> na próxima avaliação.
              </p>
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
    </div>
  )
}
