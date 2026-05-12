'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

function calcularMedia(notas) {
  const validas = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
  if (validas.length === 0) return null
  return (validas.reduce((a, b) => a + parseFloat(b), 0) / validas.length).toFixed(1)
}

function mediaStatus(media) {
  if (!media) return { label: '—', cls: 'badge badge-gray', cor: 'var(--text-4)' }
  const v = parseFloat(media)
  if (v >= 7) return { label: 'Aprovado',     cls: 'badge badge-green',  cor: 'var(--brand)' }
  if (v >= 5) return { label: 'Recuperação',  cls: 'badge badge-yellow', cor: '#d97706' }
  return           { label: 'Reprovado',      cls: 'badge badge-red',    cor: '#dc2626' }
}

function progressClass(media) {
  if (!media) return 'progress-gray'
  const v = parseFloat(media)
  if (v >= 7) return 'progress-green'
  if (v >= 5) return 'progress-yellow'
  return 'progress-red'
}

export default function Evolucao() {
  const [perfil, setPerfil] = useState(null)
  const [dados, setDados] = useState({})
  const [materias, setMaterias] = useState([])
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    const p = localStorage.getItem('pointai_perfil')
    if (p) {
      const perfil = JSON.parse(p)
      setPerfil(perfil)
      setMaterias(perfil.materias.split(',').map(m => m.trim()))
    }
    const n = localStorage.getItem('pointai_notas')
    if (n) setDados(JSON.parse(n))
    const e = localStorage.getItem('pointai_eventos')
    if (e) setEventos(JSON.parse(e))
  }, [])

  function faltasRestantes(materia) {
    const d = dados[materia]
    if (!d) return null
    return Math.floor(d.totalAulas * 0.25) - d.faltas
  }

  const mediasValidas = materias
    .map(m => dados[m] ? calcularMedia(dados[m].notas) : null)
    .filter(Boolean)
    .map(Number)

  const mediaGeral = mediasValidas.length
    ? (mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1)
    : null

  const agora = new Date()
  const proximosEventos = eventos
    .filter(e => {
      const dias = Math.ceil((new Date(e.data + 'T00:00:00') - agora) / (1000 * 60 * 60 * 24))
      return dias >= 0 && dias <= 14
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const emRisco = materias.filter(m => {
    const r = faltasRestantes(m)
    return r !== null && r <= 3
  })

  const abaixoDaMedia = materias.filter(m => {
    const med = dados[m] ? calcularMedia(dados[m].notas) : null
    return med && parseFloat(med) < 7
  })

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  const semDados = materias.every(m => !dados[m] || calcularMedia(dados[m].notas) === null)

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        <div className="page-header">
          <h1 className="page-title">Minha Evolução</h1>
          <p className="page-subtitle">Visão geral do seu desempenho acadêmico</p>
        </div>

        <div className="page-scroll">

          {/* Resumo geral */}
          <div className="grid-3" style={{ marginBottom: 20 }}>
            <div className="stat-card">
              <p className="stat-value" style={{ color: mediaGeral ? (parseFloat(mediaGeral) >= 7 ? 'var(--brand)' : parseFloat(mediaGeral) >= 5 ? '#d97706' : '#dc2626') : 'var(--text-4)' }}>
                {mediaGeral ?? '—'}
              </p>
              <p className="stat-label">Média geral</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: 'var(--brand)' }}>{materias.length}</p>
              <p className="stat-label">Matérias</p>
            </div>
            <div className="stat-card">
              <p className="stat-value" style={{ color: 'var(--brand)' }}>{proximosEventos.length}</p>
              <p className="stat-label">Eventos nos próximos 14 dias</p>
            </div>
          </div>

          {/* Alertas */}
          {(emRisco.length > 0 || abaixoDaMedia.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {emRisco.map(m => (
                <div key={m} className="alert alert-red">
                  <span style={{ fontSize: 20, flexShrink: 0 }}>🚨</span>
                  <p>
                    <strong>{m}</strong> — Você está próximo do limite de faltas!
                    Restam apenas <strong>{faltasRestantes(m)}</strong> faltas.
                  </p>
                </div>
              ))}
              {abaixoDaMedia.map(m => (
                <div key={m} className="alert alert-yellow">
                  <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
                  <p>
                    <strong>{m}</strong> — Média <strong>{calcularMedia(dados[m].notas)}</strong> está abaixo de 7.0.
                    Foque nessa matéria!
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Desempenho por matéria */}
          <div className="card" style={{ marginBottom: 20 }}>
            <p className="card-title">Desempenho por matéria</p>
            {semDados ? (
              <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '16px 0' }}>
                Nenhuma nota cadastrada ainda. Acesse <strong>Notas e Faltas</strong> para começar.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {materias.map((m, i) => {
                  const d = dados[m] || { notas: ['', '', ''], faltas: 0, totalAulas: 60 }
                  const media = calcularMedia(d.notas)
                  const status = mediaStatus(media)
                  const pct = media ? Math.min(100, (parseFloat(media) / 10) * 100) : 0
                  const fr = faltasRestantes(m)

                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{m}</p>
                          {fr !== null && fr <= 3 && (
                            <span className="badge badge-red" style={{ fontSize: 10 }}>
                              {fr <= 0 ? 'Sem faltas!' : `${fr} faltas`}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {fr !== null && fr > 3 && (
                            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{d.faltas} faltas</span>
                          )}
                          <span className={status.cls}>
                            {media ? `${media} · ${status.label}` : 'Sem notas'}
                          </span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div
                          className={`progress-fill ${progressClass(media)}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Próximos eventos */}
          {proximosEventos.length > 0 && (
            <div className="card">
              <p className="card-title">Próximos 14 dias</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {proximosEventos.map(e => {
                  const dias = Math.ceil((new Date(e.data + 'T00:00:00') - agora) / (1000 * 60 * 60 * 24))
                  const cor = dias <= 3 ? '#dc2626' : dias <= 7 ? '#d97706' : 'var(--text-3)'
                  return (
                    <div key={e.id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 0', borderBottom: '1px solid var(--border)'
                    }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{e.titulo}</p>
                        <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{e.materia}</p>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>
                        {dias === 0 ? 'Hoje' : dias === 1 ? 'Amanhã' : `${dias} dias`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {semDados && proximosEventos.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-4)' }}>
              <p style={{ fontSize: 40, marginBottom: 12 }}>📈</p>
              <p style={{ fontWeight: 600, color: 'var(--text-3)' }}>Nenhum dado ainda</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Adicione notas e eventos para ver sua evolução aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
