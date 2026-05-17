'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import * as db from '../lib/db'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { AlertTriangle, TrendingUp } from 'lucide-react'

function calcularMedia(notas) {
  const v = notas.filter(n => n !== '' && !isNaN(parseFloat(n)))
  if (!v.length) return null
  return (v.reduce((a, b) => a + parseFloat(b), 0) / v.length).toFixed(1)
}

function mediaStatus(media) {
  if (!media) return { label: '—', cls: 'badge badge-gray', cor: 'var(--text-4)' }
  const v = parseFloat(media)
  if (v >= 7) return { label: 'Aprovado',    cls: 'badge badge-green',  cor: '#1a7a4a' }
  if (v >= 5) return { label: 'Recuperação', cls: 'badge badge-yellow', cor: '#d97706' }
  return           { label: 'Reprovado',     cls: 'badge badge-red',    cor: '#dc2626' }
}

function progressClass(media) {
  if (!media) return 'progress-gray'
  const v = parseFloat(media)
  if (v >= 7) return 'progress-green'
  if (v >= 5) return 'progress-yellow'
  return 'progress-red'
}

function MediaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { fullName, media } = payload[0].payload
  const st = mediaStatus(media ? String(media) : null)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 4, maxWidth: 160 }}>{fullName}</p>
      <p style={{ fontWeight: 700, color: st.cor, fontSize: 15 }}>{media ?? '—'}</p>
    </div>
  )
}

function FaltaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <p style={{ fontWeight: 600, color: 'var(--text-1)' }}>{payload[0].name}</p>
      <p style={{ color: 'var(--text-3)' }}>{payload[0].value} falta{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

export default function Evolucao() {
  const [perfil, setPerfil]   = useState(null)
  const [dados, setDados]     = useState({})
  const [materias, setMaterias] = useState([])
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    async function carregar() {
      const [p, n, evs] = await Promise.all([db.getPerfil(), db.getNotas(), db.getEventos()])
      if (p) {
        setPerfil(p)
        setMaterias(p.materias.split(',').map(m => m.trim()))
      }
      if (n) setDados(n)
      setEventos(evs)
    }
    carregar()
  }, [])

  function faltasRestantes(materia) {
    const d = dados[materia]
    if (!d) return null
    return Math.floor(d.totalAulas * 0.25) - d.faltas
  }

  const mediasValidas = materias
    .map(m => dados[m] ? calcularMedia(dados[m].notas) : null)
    .filter(Boolean).map(Number)

  const mediaGeral = mediasValidas.length
    ? (mediasValidas.reduce((a, b) => a + b, 0) / mediasValidas.length).toFixed(1)
    : null

  const agora = new Date()

  const proximosEventos = eventos
    .filter(e => {
      const dias = Math.ceil((new Date(e.data + 'T00:00:00') - agora) / 86400000)
      return dias >= 0 && dias <= 14
    })
    .sort((a, b) => new Date(a.data) - new Date(b.data))

  const emRisco = materias.filter(m => { const r = faltasRestantes(m); return r !== null && r <= 3 })
  const abaixoDaMedia = materias.filter(m => {
    const med = dados[m] ? calcularMedia(dados[m].notas) : null
    return med && parseFloat(med) < 7
  })

  // Bar chart data
  const barData = materias.map(m => {
    const media = dados[m] ? calcularMedia(dados[m].notas) : null
    const v = media ? parseFloat(media) : 0
    return {
      name: m.length > 11 ? m.substring(0, 11) + '…' : m,
      fullName: m,
      media: v,
      cor: !media ? '#9ca3af' : v >= 7 ? '#1a7a4a' : v >= 5 ? '#d97706' : '#dc2626',
    }
  })

  // Donut chart — aggregate absences
  const totalUsadas = materias.reduce((sum, m) => sum + (dados[m]?.faltas || 0), 0)
  const totalMax    = materias.reduce((sum, m) => {
    const d = dados[m] || { totalAulas: 60 }
    return sum + Math.floor(d.totalAulas * 0.25)
  }, 0)
  const totalRestantes = Math.max(0, totalMax - totalUsadas)
  const corDonut = totalUsadas >= totalMax ? '#dc2626'
    : totalUsadas >= totalMax * 0.75 ? '#d97706'
    : '#1a7a4a'

  const donutData = totalMax === 0
    ? [{ name: 'Sem dados', value: 1 }]
    : [
        { name: 'Faltas usadas', value: totalUsadas },
        { name: 'Restantes', value: totalRestantes },
      ]

  const semDados = materias.every(m => !dados[m] || calcularMedia(dados[m].notas) === null)

  if (!perfil) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-4)' }}>Carregando...</p>
    </div>
  )

  return (
    <div className="app-shell">
      <Sidebar perfil={perfil} />

      <div className="page-area">
        {/* Breadcrumb */}
        <nav className="page-breadcrumb"><span className="page-breadcrumb-item">Point.AI</span><span className="page-breadcrumb-sep">›</span><span className="page-breadcrumb-current">Evolução</span></nav>

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
              <p className="stat-label">Eventos em 14 dias</p>
            </div>
          </div>

          {/* Alertas */}
          {(emRisco.length > 0 || abaixoDaMedia.length > 0) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {emRisco.map(m => (
                <div key={m} className="alert alert-red">
                  <AlertTriangle size={18} strokeWidth={1.8} style={{ color: '#dc2626', flexShrink: 0 }} />
                  <p><strong>{m}</strong> — Próximo do limite de faltas! Restam <strong>{faltasRestantes(m)}</strong>.</p>
                </div>
              ))}
              {abaixoDaMedia.map(m => (
                <div key={m} className="alert alert-yellow">
                  <AlertTriangle size={18} strokeWidth={1.8} style={{ color: '#d97706', flexShrink: 0 }} />
                  <p><strong>{m}</strong> — Média <strong>{calcularMedia(dados[m].notas)}</strong> abaixo de 7.0. Foque!</p>
                </div>
              ))}
            </div>
          )}

          {/* Gráficos */}
          {!semDados && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, marginBottom: 20, alignItems: 'start' }}>

              {/* Bar chart — médias */}
              <div className="chart-card">
                <p className="card-title">Média por matéria</p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barData} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10.5, fill: 'var(--text-3)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 10]}
                      ticks={[0, 2, 4, 5, 7, 10]}
                      tick={{ fontSize: 10, fill: 'var(--text-4)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<MediaTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
                    <Bar dataKey="media" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.cor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginTop: 8 }}>
                  {[['#1a7a4a', 'Aprovado ≥7'], ['#d97706', 'Recuperação ≥5'], ['#dc2626', 'Reprovado']].map(([cor, label]) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: cor, display: 'inline-block' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Donut — faltas */}
              <div className="chart-card" style={{ width: 220 }}>
                <p className="card-title">Faltas — visão geral</p>
                <div style={{ position: 'relative', width: 180, height: 180, margin: '0 auto' }}>
                  <PieChart width={180} height={180}>
                    <Pie
                      data={donutData}
                      cx={90} cy={90}
                      innerRadius={54} outerRadius={80}
                      startAngle={90} endAngle={-270}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      <Cell fill={totalMax === 0 ? '#e5e7eb' : corDonut} />
                      <Cell fill="var(--surface-3)" />
                    </Pie>
                    <Tooltip content={<FaltaTooltip />} />
                  </PieChart>
                  {/* Center label */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    pointerEvents: 'none',
                  }}>
                    <p style={{ fontSize: 22, fontWeight: 800, color: totalMax === 0 ? 'var(--text-4)' : corDonut, lineHeight: 1 }}>
                      {totalMax === 0 ? '—' : totalUsadas}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 2 }}>de {totalMax}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'center', marginTop: 4 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600 }}>
                    {totalMax === 0 ? 'Sem dados' : `${totalRestantes} restantes`}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>todas as matérias</p>
                </div>
              </div>
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
                        <div className={`progress-fill ${progressClass(media)}`} style={{ width: `${pct}%` }} />
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
                  const dias = Math.ceil((new Date(e.data + 'T00:00:00') - agora) / 86400000)
                  const cor = dias <= 3 ? '#dc2626' : dias <= 7 ? '#d97706' : 'var(--text-3)'
                  return (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
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
              <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
                <TrendingUp size={40} strokeWidth={1.3} style={{ color: 'var(--text-4)' }} />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-3)' }}>Nenhum dado ainda</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Adicione notas e eventos para ver sua evolução aqui</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
