'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import * as db from '../lib/db'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts'
import { AlertTriangle, TrendingUp } from 'lucide-react'

// Modelo NOVO (N avaliações): as médias vêm de db.calcularMedia (ponderada,
// ignora avaliações sem nota) e cada matéria tem sua própria meta de
// aprovação (media_aprovacao). Aqui `media` é SEMPRE número ou null — nunca
// string — e os limiares de status são relativos à meta da matéria.
function normalizeKey(s) {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Quão abaixo da meta ainda conta como "recuperação" (padrão BR: meta − 2).
const RECUPERACAO_OFFSET = 2

function mediaStatus(media, meta = 7) {
  if (media == null) return { label: '—', cls: 'badge badge-gray', cor: 'var(--text-4)' }
  if (media >= meta) return { label: 'Aprovado',    cls: 'badge badge-green',  cor: '#1a7a4a' }
  if (media >= meta - RECUPERACAO_OFFSET) return { label: 'Recuperação', cls: 'badge badge-yellow', cor: '#d97706' }
  return { label: 'Reprovado', cls: 'badge badge-red', cor: '#dc2626' }
}

function progressClass(media, meta = 7) {
  if (media == null) return 'progress-gray'
  if (media >= meta) return 'progress-green'
  if (media >= meta - RECUPERACAO_OFFSET) return 'progress-yellow'
  return 'progress-red'
}

function corBarra(media, meta = 7) {
  if (media == null) return '#9ca3af'
  if (media >= meta) return '#1a7a4a'
  if (media >= meta - RECUPERACAO_OFFSET) return '#d97706'
  return '#dc2626'
}

function MediaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { fullName, media, hasMedia, meta } = payload[0].payload
  const st = mediaStatus(hasMedia ? media : null, meta)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: 12 }}>
      <p style={{ color: 'var(--text-3)', marginBottom: 4, maxWidth: 160 }}>{fullName}</p>
      <p style={{ fontWeight: 700, color: st.cor, fontSize: 15 }}>{hasMedia ? media.toFixed(1) : '—'}</p>
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
  const [materiasData, setMateriasData] = useState([]) // linhas do modelo novo (db.getMaterias)
  const [materias, setMaterias] = useState([])         // nomes oficiais (perfil.materias)
  const [eventos, setEventos] = useState([])
  const [erro, setErro]       = useState(null)

  useEffect(() => {
    async function carregar() {
      const p = await db.getPerfil()
      if (p) {
        setPerfil(p)
        setMaterias((p.materias || '').split(',').map(m => m.trim()).filter(Boolean))
      }
      // getEventos tem fallback offline próprio — não derruba a tela.
      try { setEventos((await db.getEventos()) || []) } catch { setEventos([]) }
      // getMaterias PROPAGA erro (sem fallback localStorage). Surface, não engole.
      try {
        setMateriasData((await db.getMaterias()) || [])
      } catch (e) {
        setErro(e.message || 'Não foi possível carregar suas matérias.')
      }
    }
    carregar()
  }, [])

  // Casa o nome oficial (perfil) com a linha do modelo novo, tolerante a
  // acento/caixa/espaço. Modelo novo: faltas/total_aulas/media_aprovacao.
  const rowByNome = new Map(materiasData.map(r => [normalizeKey(r.nome), r]))
  const getRow    = (m) => rowByNome.get(normalizeKey(m)) || null
  const mediaDe   = (m) => { const r = getRow(m); return r ? db.calcularMedia(r.avaliacoes) : null }
  const metaDe    = (m) => { const r = getRow(m); return Number(r?.media_aprovacao) || 7 }

  // Restantes = limite REAL (coluna limite_faltas) − faltas usadas. Retorna
  // null quando a matéria não tem limite configurado (limite_faltas IS NULL)
  // — nesse caso ela fica fora dos alertas e do agregado de faltas.
  function faltasRestantes(materia) {
    const r = getRow(materia)
    if (!r || r.limite_faltas == null) return null
    return Number(r.limite_faltas) - (Number(r.faltas) || 0)
  }

  const mediasValidas = materias.map(mediaDe).filter(v => v != null)

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
  // Risco de média: abaixo da META da matéria (media_aprovacao), não de um fixo.
  const abaixoDaMedia = materias.filter(m => {
    const med = mediaDe(m)
    return med != null && med < metaDe(m)
  })

  // Bar chart data
  const barData = materias.map(m => {
    const media = mediaDe(m)
    const meta = metaDe(m)
    return {
      name: m.length > 11 ? m.substring(0, 11) + '…' : m,
      fullName: m,
      media: media != null ? media : 0,
      hasMedia: media != null,
      meta,
      cor: corBarra(media, meta),
    }
  })

  // Donut chart — agrega faltas SÓ das matérias com limite configurado
  // (limite_faltas não null). As sem limite ficam fora pra não distorcer
  // o "restantes" geral (nada de total_aulas*0.25).
  const totalUsadas = materias.reduce((sum, m) => {
    const r = getRow(m)
    if (!r || r.limite_faltas == null) return sum
    return sum + (Number(r.faltas) || 0)
  }, 0)
  const totalMax    = materias.reduce((sum, m) => {
    const r = getRow(m)
    if (!r || r.limite_faltas == null) return sum
    return sum + Number(r.limite_faltas)
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

  const semDados = materias.every(m => mediaDe(m) == null)

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
        <nav className="page-breadcrumb"><span className="page-breadcrumb-item">Point</span><span className="page-breadcrumb-sep">›</span><span className="page-breadcrumb-current">Evolução</span></nav>

        <div className="page-header">
          <h1 className="page-title">Minha Evolução</h1>
          <p className="page-subtitle">Visão geral do seu desempenho acadêmico</p>
        </div>

        <div className="page-scroll">

          {erro && (
            <div className="alert alert-red" style={{ marginBottom: 16 }}>
              <AlertTriangle size={18} strokeWidth={1.8} style={{ color: '#dc2626', flexShrink: 0 }} />
              <p>{erro}</p>
            </div>
          )}

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
                  <p><strong>{m}</strong> — Média <strong>{mediaDe(m).toFixed(1)}</strong> abaixo da meta ({metaDe(m)}). Foque!</p>
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
                  {[['#1a7a4a', 'Na meta'], ['#d97706', 'Recuperação'], ['#dc2626', 'Abaixo da meta']].map(([cor, label]) => (
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
                  const media = mediaDe(m)
                  const meta = metaDe(m)
                  const faltas = Number(getRow(m)?.faltas) || 0
                  const status = mediaStatus(media, meta)
                  const pct = media != null ? Math.min(100, (media / 10) * 100) : 0
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
                          {(fr === null || fr > 3) && (
                            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>{faltas} faltas</span>
                          )}
                          <span className={status.cls}>
                            {media != null ? `${media.toFixed(1)} · ${status.label}` : 'Sem notas'}
                          </span>
                        </div>
                      </div>
                      <div className="progress-bar">
                        <div className={`progress-fill ${progressClass(media, meta)}`} style={{ width: `${pct}%` }} />
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
