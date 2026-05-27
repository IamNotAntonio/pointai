'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  TrendingUp, Lock, Sparkles, MessageSquare, Clock,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useBento } from '../../../lib/BentoContext'
import * as db from '../../../lib/db'
import {
  useCurrentMateria,
  notasDaMateria, mediaPonderada, sortByDate, corNota,
  sharedItemCss, fullscreenCss,
} from './_shared'

function readChatStats(materia) {
  if (typeof window === 'undefined') return { totalMsgs: null, last: null }
  try {
    const isGeral = materia === 'geral'
    if (!isGeral) {
      const raw = localStorage.getItem(`chat_${materia}`)
      if (!raw) return { totalMsgs: 0, last: null }
      const arr = JSON.parse(raw)
      const userMsgs = arr.filter(m => m.role === 'user').length
      const lastTs = arr
        .map(m => m.timestamp ? new Date(m.timestamp).getTime() : 0)
        .filter(n => !!n)
        .reduce((a, b) => Math.max(a, b), 0)
      return { totalMsgs: userMsgs, last: lastTs || null }
    }
    let total = 0
    let last = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('chat_')) continue
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]')
        total += arr.filter(m => m.role === 'user').length
        for (const m of arr) {
          if (m.timestamp) {
            const t = new Date(m.timestamp).getTime()
            if (t > last) last = t
          }
        }
      } catch {}
    }
    return { totalMsgs: total, last: last || null }
  } catch {
    return { totalMsgs: null, last: null }
  }
}

/* ─── Bento card ────────────────────────────────────────────────── */
export function EvolucaoCard({ materia, notas, onClick }) {
  const lista = notasDaMateria(notas, materia)
  const stats = useMemo(() => readChatStats(materia), [materia])

  // Variation between first and last evaluation
  const variacao = useMemo(() => {
    if (lista.length < 2) return null
    const asc = sortByDate(lista, 'asc')
    const first = Number(asc[0].nota)
    const last = Number(asc[asc.length - 1].nota)
    if (Number.isNaN(first) || Number.isNaN(last) || first === 0) return null
    return ((last - first) / first) * 100
  }, [lista])

  return (
    <motion.button
      type="button"
      layoutId="panel-evolucao"
      onClick={onClick}
      className="bento-card"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Abrir Minha Evolução"
    >
      <div className="bento-card-icon-wrap">
        <TrendingUp size={20} strokeWidth={1.7} />
      </div>
      <p className="bento-card-title">Evolução</p>
      {variacao != null ? (
        <p className="bento-card-strong" style={{ color: variacao >= 0 ? '#22c55e' : '#f87171' }}>
          {variacao >= 0 ? '+' : ''}{variacao.toFixed(0)}% {variacao >= 0 ? '↑' : '↓'}
        </p>
      ) : (
        <p className="bento-card-strong" style={{ color: '#a1a1aa' }}>—</p>
      )}
      <p className="bento-card-sub">
        {stats.totalMsgs != null && stats.totalMsgs > 0
          ? `${stats.totalMsgs} ${stats.totalMsgs === 1 ? 'mensagem' : 'mensagens'}`
          : 'Em construção'}
      </p>
    </motion.button>
  )
}

/* ─── Fullscreen ────────────────────────────────────────────────── */
export function EvolucaoFullscreen() {
  return (
    <Suspense fallback={<div className="lousa-fs-container">Carregando…</div>}>
      <EvolucaoFullscreenInner />
    </Suspense>
  )
}

function EvolucaoFullscreenInner() {
  const materia = useCurrentMateria()
  const reduce = useReducedMotion()
  const bento = useBento()
  const [notas, setNotas] = useState([])
  const [eventos, setEventos] = useState([])
  const [chatStats, setChatStats] = useState({ totalMsgs: null, last: null })

  useEffect(() => {
    let alive = true
    db.getNotas().then(d => { if (alive) setNotas(d || []) }).catch(() => {})
    db.getEventos().then(d => { if (alive) setEventos(d || []) }).catch(() => {})
    setChatStats(readChatStats(materia))
    return () => { alive = false }
  }, [materia])

  const lista = useMemo(() => notasDaMateria(notas, materia), [notas, materia])
  const media = useMemo(() => mediaPonderada(lista), [lista])
  const ultima = useMemo(() => sortByDate(lista, 'asc').slice(-1)[0], [lista])
  const faltas = ultima?.faltas ?? null
  const maxFaltas = ultima?.maxFaltas ?? 15

  const upcoming = useMemo(() => {
    const arr = Array.isArray(eventos) ? eventos : []
    const filt = materia === 'geral' ? arr : arr.filter(e => e.materia === materia || e.disciplina === materia)
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const ts = todayStart.getTime()
    return filt.filter(e => {
      const t = new Date(e.data).getTime()
      return !Number.isNaN(t) && t >= ts
    }).length
  }, [eventos, materia])

  const chartData = useMemo(() => {
    const asc = sortByDate(lista, 'asc')
    return asc.map((n, i) => ({
      name: n.titulo ? (n.titulo.length > 14 ? n.titulo.slice(0, 12) + '…' : n.titulo) : `Aval ${i + 1}`,
      nota: Number(n.nota),
    }))
  }, [lista])

  const isGeral = materia === 'geral'

  return (
    <motion.div
      className="lousa-fs-container"
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <style>{fullscreenCss}</style>

      <header className="lousa-fs-header">
        <h1 className="lousa-fs-title">
          Minha Evolução {!isGeral && <>· <span className="lousa-fs-title-materia">{materia}</span></>}
        </h1>
        <p className="lousa-fs-subtitle">
          Acompanhe seu progresso ao longo do semestre.
        </p>
      </header>

      <div className="lousa-fs-stats-grid">
        <StatCard value={media != null ? media.toFixed(1) : '—'} label="Média atual" />
        <StatCard value={lista.length} label="Avaliações feitas" tone="neutral" />
        <StatCard
          value={faltas == null ? '—' : `${faltas}/${maxFaltas}`}
          label="Faltas"
          tone={faltas != null && (faltas / maxFaltas) >= 0.8 ? 'danger' : faltas != null && (faltas / maxFaltas) >= 0.6 ? 'warn' : ''}
        />
        <StatCard value={upcoming} label="Eventos próximos" tone="neutral" />
      </div>

      {chartData.length >= 2 ? (
        <div className="lousa-fs-chart-wrap">
          <p className="lousa-fs-chart-title">Notas ao longo do tempo</p>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 8, right: 14, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="evolucao-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#22c55e" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,.04)" strokeDasharray="3 4" />
              <XAxis dataKey="name" stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis domain={[0, 10]} stroke="#52525b" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<NotaTooltip />} />
              <ReferenceLine y={7} stroke="rgba(34,197,94,.35)" strokeDasharray="4 4" />
              <Area
                type="monotone"
                dataKey="nota"
                stroke="#22c55e"
                strokeWidth={2}
                fill="url(#evolucao-grad)"
                dot={{ r: 4, fill: '#22c55e', stroke: '#0a0a0a', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#22c55e', stroke: '#0a0a0a', strokeWidth: 2 }}
                isAnimationActive={!reduce}
                animationDuration={1200}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="lousa-fs-chart-wrap" style={{ paddingTop: 32, paddingBottom: 32, textAlign: 'center' }}>
          <TrendingUp size={36} strokeWidth={1.4} style={{ color: '#52525b', opacity: .6, marginBottom: 12 }} />
          <p style={{ fontSize: 13.5, color: '#a1a1aa' }}>Registre 2 ou mais avaliações pra ver o gráfico de evolução.</p>
        </div>
      )}

      <div className="lousa-fs-stats-grid" style={{ marginBottom: 16 }}>
        {chatStats.totalMsgs != null && (
          <div className="lousa-fs-stat-card">
            <p className="lousa-fs-stat-value neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <MessageSquare size={20} strokeWidth={1.8} style={{ color: '#22c55e' }} />
              {chatStats.totalMsgs}
            </p>
            <p className="lousa-fs-stat-label">Mensagens trocadas</p>
            <p className="lousa-fs-stat-sub">{isGeral ? 'Total em todas as matérias' : `Em ${materia}`}</p>
          </div>
        )}
        {chatStats.last && (
          <div className="lousa-fs-stat-card">
            <p className="lousa-fs-stat-value neutral" style={{ fontSize: 18, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Clock size={18} strokeWidth={1.8} style={{ color: '#22c55e' }} />
              {format(new Date(chatStats.last), "d 'de' MMM", { locale: ptBR })}
            </p>
            <p className="lousa-fs-stat-label">Última atividade</p>
            <p className="lousa-fs-stat-sub">{format(new Date(chatStats.last), "HH'h'mm", { locale: ptBR })}</p>
          </div>
        )}
      </div>

      <div className="lousa-fs-locked">
        <span className="lousa-fs-locked-icon">
          <Lock size={20} strokeWidth={1.8} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="lousa-fs-locked-title">Análise por tópico</p>
          <p className="lousa-fs-locked-body">
            Esta visualização aparece conforme o <strong style={{ color: '#22c55e' }}>Cérebro Point</strong> for povoado com seus conceitos. Continue conversando no chat pra ver seu progresso por tópico.
          </p>
          <button
            onClick={() => bento.openItem('cerebro')}
            style={{
              marginTop: 10, background: 'none', border: 'none',
              color: '#22c55e', fontSize: 12.5, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', padding: 0,
            }}
          >
            Abrir Cérebro Point →
          </button>
        </div>
      </div>

      <div className="lousa-fs-locked">
        <span className="lousa-fs-locked-icon" style={{ background: 'rgba(251,191,36,.08)', borderColor: 'rgba(251,191,36,.22)', color: '#fbbf24' }}>
          <Sparkles size={20} strokeWidth={1.8} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="lousa-fs-locked-title">Relatório Semanal</p>
          <p className="lousa-fs-locked-body">
            Em breve a IA vai gerar insights semanais sobre seu progresso — o que evoluiu, o que merece revisar, e o que estudar primeiro. Fique de olho.
          </p>
          <span className="lousa-fs-locked-tag">Em construção</span>
        </div>
      </div>
      <style>{sharedItemCss}</style>
    </motion.div>
  )
}

function StatCard({ value, label, tone = '' }) {
  return (
    <div className="lousa-fs-stat-card">
      <p className={`lousa-fs-stat-value ${tone}`}>{value}</p>
      <p className="lousa-fs-stat-label">{label}</p>
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
