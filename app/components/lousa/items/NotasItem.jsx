'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  FileText, FileX, Plus, TrendingUp, AlertCircle, CalendarDays, Lock,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Area, AreaChart,
} from 'recharts'
import * as db from '../../../lib/db'
import { DrawerCard, sharedItemCss, fullscreenCss } from './_shared'

/* ─── Data helpers ──────────────────────────────────────────────── */
function notasDaMateria(notas, materia) {
  if (!Array.isArray(notas) || !materia) return []
  if (materia === 'geral') return notas
  return notas.filter(n => n.materia === materia || n.disciplina === materia)
}

function mediaPonderada(items) {
  if (!items.length) return null
  let soma = 0, pesoTotal = 0
  for (const it of items) {
    const nota = Number(it.nota)
    const peso = Number(it.peso ?? 1) || 1
    if (!Number.isNaN(nota)) {
      soma += nota * peso
      pesoTotal += peso
    }
  }
  return pesoTotal > 0 ? soma / pesoTotal : null
}

function sortByDate(items, dir = 'desc') {
  return [...items].sort((a, b) => {
    const ta = new Date(a.data || a.criado_em || 0).getTime() || 0
    const tb = new Date(b.data || b.criado_em || 0).getTime() || 0
    return dir === 'desc' ? tb - ta : ta - tb
  })
}

function corNota(n) {
  const v = Number(n)
  if (Number.isNaN(v)) return '#71717a'
  if (v >= 7) return '#22c55e'
  if (v >= 5) return '#fbbf24'
  return '#f87171'
}

function tempoRelativo(iso) {
  if (!iso) return ''
  try {
    const ms = Date.now() - new Date(iso).getTime()
    const d = Math.floor(ms / 86400000)
    if (d <= 0) return 'hoje'
    if (d === 1) return 'ontem'
    if (d < 30) return `há ${d} dias`
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  } catch { return '' }
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
  } catch { return iso }
}

export function getNotasBadge({ materia, notas }) {
  const lista = notasDaMateria(notas, materia)
  if (!lista.length) return null
  const m = mediaPonderada(lista)
  return m == null ? null : `Média ${m.toFixed(1)}`
}

/* ─── Drawer (unchanged from D.3c) ──────────────────────────────── */
export function NotasDrawer({ materia, notas }) {
  const lista = notasDaMateria(notas, materia)
  const media = mediaPonderada(lista)
  const ultima = sortByDate(lista, 'desc')[0]
  const faltas = ultima?.faltas ?? null
  const maxFaltas = ultima?.maxFaltas ?? 15
  const pctFaltas = faltas != null ? Math.min((faltas / maxFaltas) * 100, 100) : 0
  const corFaltas = pctFaltas >= 80 ? '#f87171' : pctFaltas >= 60 ? '#fbbf24' : '#22c55e'

  if (materia === 'geral' || !lista.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
        <FileX size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
        <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
          {materia === 'geral'
            ? 'Selecione uma matéria na sidebar para ver suas notas.'
            : <>Você ainda não registrou notas em <strong style={{ color: '#e4e4e7' }}>{materia}</strong>.</>}
        </p>
        {materia !== 'geral' && (
          <button className="lousa-cta-btn" disabled title="Disponível em breve">
            <Plus size={14} strokeWidth={2} /> Registrar primeira nota
          </button>
        )}
        <style>{sharedItemCss}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DrawerCard label="Média da matéria">
        <p style={{ fontSize: 36, fontWeight: 900, color: '#22c55e', letterSpacing: '-.02em', lineHeight: 1 }}>
          {media?.toFixed(1) ?? '—'}
        </p>
        {ultima && (
          <p style={{ fontSize: 12, color: '#71717a', marginTop: 6 }}>
            Última: {ultima.titulo || 'Avaliação'} · {ultima.nota}
          </p>
        )}
      </DrawerCard>

      {ultima && (
        <DrawerCard label="Última nota">
          <p style={{ fontSize: 13.5, fontWeight: 700, color: '#f4f4f5', marginBottom: 4 }}>
            {ultima.titulo || 'Avaliação'}
          </p>
          <p style={{ fontSize: 12, color: '#a1a1aa' }}>
            Nota <strong style={{ color: '#22c55e' }}>{ultima.nota}</strong> · {tempoRelativo(ultima.data || ultima.criado_em)}
          </p>
        </DrawerCard>
      )}

      <DrawerCard label="Faltas">
        <p style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', marginBottom: 8 }}>
          {faltas ?? 0}/{maxFaltas} <span style={{ fontSize: 11.5, fontWeight: 600, color: '#71717a' }}>({Math.round(pctFaltas)}%)</span>
        </p>
        <div style={{ height: 6, borderRadius: 99, background: '#161616', overflow: 'hidden' }}>
          <div style={{ width: `${pctFaltas}%`, height: '100%', background: corFaltas, transition: 'width .4s ease', borderRadius: 99 }} />
        </div>
      </DrawerCard>

      <style>{sharedItemCss}</style>
    </div>
  )
}

/* ─── Materia hook ──────────────────────────────────────────────── */
function useCurrentMateria() {
  const sp = useSearchParams()
  const urlMateria = sp.get('materia')
  if (urlMateria) return urlMateria
  if (typeof window === 'undefined') return 'geral'
  try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
}

/* ─── Fullscreen ────────────────────────────────────────────────── */
export function NotasFullscreen() {
  return (
    <Suspense fallback={<div className="lousa-fs-container">Carregando…</div>}>
      <NotasFullscreenInner />
    </Suspense>
  )
}

function NotasFullscreenInner() {
  const materia = useCurrentMateria()
  const reduce = useReducedMotion()
  const [notas, setNotas] = useState([])
  const [activeTab, setActiveTab] = useState('avaliacoes')

  useEffect(() => {
    let alive = true
    db.getNotas().then(d => { if (alive) setNotas(d || []) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const lista = useMemo(() => notasDaMateria(notas, materia), [notas, materia])
  const media = useMemo(() => mediaPonderada(lista), [lista])
  const sortedDesc = useMemo(() => sortByDate(lista, 'desc'), [lista])
  const ultima = sortedDesc[0]
  const faltas = ultima?.faltas ?? null
  const maxFaltas = ultima?.maxFaltas ?? 15
  const pctFaltas = faltas != null ? Math.min((faltas / maxFaltas) * 100, 100) : 0
  const corFaltas = pctFaltas >= 80 ? '#f87171' : pctFaltas >= 60 ? '#fbbf24' : '#22c55e'

  const isGeral = materia === 'geral'

  const containerInit = reduce ? false : { opacity: 0, y: 8 }
  const containerTrans = { duration: 0.3, ease: [0.22, 1, 0.36, 1] }

  return (
    <motion.div
      className="lousa-fs-container"
      initial={containerInit}
      animate={{ opacity: 1, y: 0 }}
      transition={containerTrans}
    >
      <style>{fullscreenCss}</style>

      <header className="lousa-fs-header">
        <h1 className="lousa-fs-title">
          Notas e Faltas {!isGeral && <>· <span className="lousa-fs-title-materia">{materia}</span></>}
        </h1>
        <p className="lousa-fs-subtitle">
          {isGeral
            ? 'Visão geral de todas as suas avaliações.'
            : 'Acompanhe sua performance e use a previsão pra planejar.'}
        </p>
      </header>

      {isGeral || lista.length === 0 ? (
        <NotasEmpty isGeral={isGeral} materia={materia} />
      ) : (
        <>
          <StatsGrid lista={lista} media={media} faltas={faltas} maxFaltas={maxFaltas} pct={pctFaltas} corFaltas={corFaltas} />
          {media != null && <PredictionCard media={media} />}

          <div className="lousa-fs-tabs" role="tablist">
            {[
              { id: 'avaliacoes', label: 'Avaliações' },
              { id: 'evolucao',   label: 'Evolução' },
              { id: 'faltas',     label: 'Faltas' },
            ].map(t => (
              <button
                key={t.id}
                className={`lousa-fs-tab ${activeTab === t.id ? 'active' : ''}`}
                onClick={() => setActiveTab(t.id)}
                role="tab"
                aria-selected={activeTab === t.id}
              >
                {t.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeTab === 'avaliacoes' && <AvaliacoesTable lista={sortedDesc} reduce={reduce} />}
              {activeTab === 'evolucao'   && <EvolucaoTab lista={lista} reduce={reduce} />}
              {activeTab === 'faltas'     && <FaltasTab faltas={faltas} maxFaltas={maxFaltas} pct={pctFaltas} cor={corFaltas} />}
            </motion.div>
          </AnimatePresence>
        </>
      )}
    </motion.div>
  )
}

function StatsGrid({ lista, media, faltas, maxFaltas, pct, corFaltas }) {
  return (
    <div className="lousa-fs-stats-grid">
      <div className="lousa-fs-stat-card">
        <p className="lousa-fs-stat-value">{media != null ? media.toFixed(1) : '—'}</p>
        <p className="lousa-fs-stat-label">Média ponderada</p>
      </div>
      <div className="lousa-fs-stat-card">
        <p className="lousa-fs-stat-value neutral">{lista.length}</p>
        <p className="lousa-fs-stat-label">Avaliações</p>
      </div>
      <div className="lousa-fs-stat-card">
        <p className={`lousa-fs-stat-value ${pct >= 80 ? 'danger' : pct >= 60 ? 'warn' : ''}`} style={{ color: corFaltas }}>
          {faltas ?? 0}<span style={{ fontSize: 16, color: '#71717a', fontWeight: 600 }}>/{maxFaltas}</span>
        </p>
        <p className="lousa-fs-stat-label">Faltas ({Math.round(pct)}%)</p>
        <div className="lousa-fs-bar-wrap">
          <div className="lousa-fs-bar-fill" style={{ width: `${pct}%`, background: corFaltas }} />
        </div>
      </div>
    </div>
  )
}

function PredictionCard({ media }) {
  const acima = media >= 7
  // Equal-weight assumption: avg(current, next) = 7 → next = 14 - current
  const proximaNota = Math.max(0, 14 - media)
  const inviavel = proximaNota > 10
  return (
    <div className="lousa-fs-prediction" role="status">
      <span className="lousa-fs-prediction-icon">
        <TrendingUp size={20} strokeWidth={1.7} />
      </span>
      <p className="lousa-fs-prediction-text">
        {acima
          ? <>Você está <strong>acima da média mínima</strong> (7). Mantém o ritmo.</>
          : inviavel
            ? <>Pra fechar com média 7 seriam necessários <strong>{proximaNota.toFixed(1)}</strong> na próxima avaliação — fora da escala. Foque nas próximas duas.</>
            : <>Pra alcançar média 7 você precisa tirar <strong>{proximaNota.toFixed(1)}</strong> na próxima avaliação (assumindo peso igual).</>}
      </p>
    </div>
  )
}

function AvaliacoesTable({ lista, reduce }) {
  return (
    <div>
      <div className="lousa-fs-table-header">
        <span>Avaliação</span>
        <span>Peso</span>
        <span>Nota</span>
        <span>Data</span>
      </div>
      {lista.map((n, i) => (
        <motion.div
          key={i}
          className="lousa-fs-table-row"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 * i, duration: 0.25 }}
        >
          <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{n.titulo || 'Avaliação sem título'}</span>
          <span style={{ color: '#a1a1aa' }}>×{n.peso ?? 1}</span>
          <span style={{ color: corNota(n.nota), fontWeight: 700 }}>{Number(n.nota).toFixed(1)}</span>
          <span style={{ color: '#71717a', fontSize: 12.5 }}>{formatDate(n.data || n.criado_em)} · {tempoRelativo(n.data || n.criado_em)}</span>
        </motion.div>
      ))}
      <div style={{ marginTop: 16 }}>
        <button className="lousa-cta-btn" disabled title="Disponível em breve">
          <Plus size={14} strokeWidth={2} /> Adicionar avaliação
        </button>
        <p className="lousa-fs-disabled-hint">Edição direta chega na próxima onda.</p>
      </div>
    </div>
  )
}

function EvolucaoTab({ lista, reduce }) {
  const data = useMemo(() => {
    const asc = sortByDate(lista, 'asc')
    return asc.map((n, i) => ({
      name: n.titulo ? (n.titulo.length > 14 ? n.titulo.slice(0, 12) + '…' : n.titulo) : `Aval ${i + 1}`,
      nota: Number(n.nota),
    }))
  }, [lista])

  if (data.length < 2) {
    return (
      <div className="lousa-fs-empty">
        <TrendingUp className="lousa-fs-empty-icon" />
        <p className="lousa-fs-empty-title">Adicione mais avaliações pra ver evolução</p>
        <p className="lousa-fs-empty-sub">A linha aparece com 2 ou mais registros.</p>
      </div>
    )
  }

  return (
    <div className="lousa-fs-chart-wrap">
      <p className="lousa-fs-chart-title">Notas ao longo do tempo</p>
      <ResponsiveContainer width="100%" height={320}>
        <AreaChart data={data} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
          <defs>
            <linearGradient id="notas-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"  stopColor="#22c55e" stopOpacity={0.32} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,.04)" strokeDasharray="3 4" />
          <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis domain={[0, 10]} stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
          <Tooltip content={<NotaTooltip />} />
          <ReferenceLine y={7} stroke="rgba(34,197,94,.35)" strokeDasharray="4 4" label={{ value: 'Média 7', fill: '#22c55e', fontSize: 10, position: 'insideTopRight' }} />
          <Area
            type="monotone"
            dataKey="nota"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#notas-grad)"
            dot={{ r: 4, fill: '#22c55e', stroke: '#0a0a0a', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#22c55e', stroke: '#0a0a0a', strokeWidth: 2 }}
            isAnimationActive={!reduce}
            animationDuration={1200}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function NotaTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0]
  return (
    <div style={{
      background: '#0d0d0d', border: '1px solid rgba(255,255,255,.08)',
      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#e4e4e7',
      boxShadow: '0 8px 24px rgba(0,0,0,.5)',
    }}>
      <p style={{ marginBottom: 3, fontWeight: 600 }}>{p.payload.name}</p>
      <p style={{ color: corNota(p.value), fontWeight: 700, fontSize: 14 }}>{Number(p.value).toFixed(1)}</p>
    </div>
  )
}

function FaltasTab({ faltas, maxFaltas, pct, cor }) {
  if (faltas == null || faltas === 0) {
    return (
      <div className="lousa-fs-empty" style={{ paddingTop: 24 }}>
        <CalendarDays className="lousa-fs-empty-icon" style={{ color: '#22c55e', opacity: .5 }} />
        <p className="lousa-fs-empty-title" style={{ color: '#86efac' }}>Sem faltas registradas. Continue assim!</p>
        <p className="lousa-fs-empty-sub">Quando você marcar faltas, elas aparecem aqui com data.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="lousa-fs-card">
        <p className="lousa-fs-card-title">
          <AlertCircle size={16} strokeWidth={1.7} style={{ color: cor }} />
          Resumo de faltas
        </p>
        <p style={{ fontSize: 32, fontWeight: 800, color: cor, letterSpacing: '-.02em', lineHeight: 1, marginTop: 8 }}>
          {faltas} <span style={{ fontSize: 18, color: '#71717a', fontWeight: 600 }}>de {maxFaltas}</span>
        </p>
        <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>
          {Math.round(pct)}% do limite usado · {maxFaltas - faltas} {maxFaltas - faltas === 1 ? 'falta restante' : 'faltas restantes'}
        </p>
        <div className="lousa-fs-bar-wrap" style={{ marginTop: 14 }}>
          <div className="lousa-fs-bar-fill" style={{ width: `${pct}%`, background: cor }} />
        </div>
      </div>

      <div className="lousa-fs-empty" style={{ paddingTop: 16 }}>
        <p className="lousa-fs-empty-sub">Histórico individual por data chega na próxima onda.</p>
      </div>
    </div>
  )
}

function NotasEmpty({ isGeral, materia }) {
  return (
    <div className="lousa-fs-empty" style={{ paddingTop: 64 }}>
      <FileX className="lousa-fs-empty-icon" />
      <p className="lousa-fs-empty-title">
        {isGeral
          ? 'Selecione uma matéria pra ver as notas'
          : <>Nada registrado em <strong style={{ color: '#e4e4e7' }}>{materia}</strong></>}
      </p>
      <p className="lousa-fs-empty-sub">
        {isGeral
          ? 'Use a sidebar à esquerda pra abrir uma matéria específica.'
          : 'Adicione sua primeira avaliação quando o registro estiver liberado.'}
      </p>
      {!isGeral && (
        <button className="lousa-cta-btn" disabled title="Disponível em breve" style={{ marginTop: 18 }}>
          <Plus size={14} strokeWidth={2} /> Registrar primeira nota
        </button>
      )}
    </div>
  )
}
