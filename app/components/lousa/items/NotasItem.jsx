'use client'
import { useState, useEffect, useMemo, Suspense } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import {
  FileText, FileX, Plus, TrendingUp, AlertCircle, CalendarDays, ChevronDown, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import * as db from '../../../lib/db'
import {
  useCurrentMateria,
  notasDaMateria, mediaPonderada, sortByDate, corNota, corNotaMeta,
  sharedItemCss, fullscreenCss,
} from './_shared'

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

/* ─── Consolidação (visão geral do semestre) ────────────────────── */
// A partir das linhas do modelo novo (db.getMaterias()), produz um resumo
// por matéria: média ponderada (via db.calcularMedia, ignorando avaliações
// sem nota), meta de aprovação e contagem. Imutável: não altera as linhas.
function resumoMaterias(notas) {
  if (!Array.isArray(notas)) return []
  return notas
    .filter(m => m && Array.isArray(m.avaliacoes))
    .map(m => {
      const avaliacoes = m.avaliacoes
      const comNota = avaliacoes.filter(
        a => a && a.nota !== null && a.nota !== undefined && a.nota !== '' && !Number.isNaN(Number(a.nota)),
      )
      return {
        id: m.id ?? m.nome,
        nome: m.nome,
        media: db.calcularMedia(avaliacoes),
        meta: Number(m.media_aprovacao) || 7,
        countComNota: comNota.length,
        totalAval: avaliacoes.length,
        faltas: Number(m.faltas) || 0,
        // Limite real (coluna limite_faltas). null = não configurado.
        maxFaltas: m.limite_faltas == null ? null : Number(m.limite_faltas),
        avaliacoes,
      }
    })
    .sort((a, b) => String(a.nome ?? '').localeCompare(String(b.nome ?? ''), 'pt-BR'))
}

// Média geral do semestre = média SIMPLES das médias das matérias que têm
// pelo menos uma nota. Retorna null se nenhuma matéria tem nota.
function mediaGeralSemestre(resumos) {
  const comMedia = resumos.filter(r => r.media != null)
  if (!comMedia.length) return null
  return comMedia.reduce((acc, r) => acc + r.media, 0) / comMedia.length
}

/* ─── Bento card ────────────────────────────────────────────────── */
// No contexto GERAL, mostra a visão consolidada do semestre; numa matéria
// específica, mantém o card de sempre (não alterar esse comportamento).
export function NotasCard({ materia, notas, onClick }) {
  if (materia === 'geral') return <NotasCardGeral notas={notas} onClick={onClick} />
  return <NotasCardMateria materia={materia} notas={notas} onClick={onClick} />
}

function NotasCardMateria({ materia, notas, onClick }) {
  const lista = notasDaMateria(notas, materia)
  const media = mediaPonderada(lista)
  const ultima = sortByDate(lista, 'desc')[0]
  const faltas = ultima?.faltas ?? 0
  const maxFaltas = ultima?.maxFaltas ?? null // null = limite não configurado
  const reduce = useReducedMotion()

  const spark = useMemo(() => {
    const asc = sortByDate(lista, 'asc').slice(-6)
    return asc.map((n, i) => ({ name: i.toString(), nota: Number(n.nota) }))
  }, [lista])

  // Cor pela regra da /notas (verde >= meta da matéria, vermelho <).
  const meta = lista[0]?.meta ?? 7
  const mediaColor = corNotaMeta(media, meta)

  return (
    <motion.button
      type="button"
      layoutId="panel-notas"
      onClick={onClick}
      className="bento-card bento-card-large"
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      aria-label="Abrir Notas e Faltas"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bento-card-icon-wrap">
            <FileText size={22} strokeWidth={1.7} />
          </div>
          <p className="bento-card-title">Notas e Faltas</p>
          <p className="bento-card-mega" style={{ color: mediaColor }}>
            {media != null ? media.toFixed(1) : '—'}
          </p>
          <p className="bento-card-stat">
            {lista.length} {lista.length === 1 ? 'avaliação' : 'avaliações'} · {maxFaltas == null ? `${faltas} ${faltas === 1 ? 'falta' : 'faltas'} · defina o limite` : `${faltas}/${maxFaltas} faltas`}
          </p>
        </div>
        {spark.length >= 2 && (
          <div className="bento-card-viz" aria-hidden>
            <ResponsiveContainer width={72} height={48}>
              <AreaChart data={spark} margin={{ top: 4, right: 2, bottom: 4, left: 2 }}>
                <defs>
                  <linearGradient id="notas-spark-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"  stopColor="#22c55e" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="nota"
                  stroke="#22c55e"
                  strokeWidth={1.5}
                  fill="url(#notas-spark-grad)"
                  dot={false}
                  isAnimationActive={!reduce}
                  animationDuration={900}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.button>
  )
}

// Card do contexto GERAL: média geral do semestre + lista compacta das
// matérias (cada linha colorida pela meta da própria matéria).
function NotasCardGeral({ notas, onClick }) {
  const reduce = useReducedMotion()
  const resumos = useMemo(() => resumoMaterias(notas), [notas])
  const mediaGeral = useMemo(() => mediaGeralSemestre(resumos), [resumos])

  const comMedia = resumos.filter(r => r.media != null).length
  const mediaColor = mediaGeral != null ? corNota(mediaGeral) : '#71717a'

  // Card compacto: no máximo 3 matérias na lista pra não crescer e empurrar
  // os vizinhos do Bento. O resto vira "ver todas (N)" → abre o fullscreen
  // (que já mostra todas com detalhe). N = total de matérias.
  const MAX_LINHAS = 3
  const visiveis = resumos.slice(0, MAX_LINHAS)
  const temMais = resumos.length > MAX_LINHAS

  return (
    <motion.button
      type="button"
      layoutId="panel-notas"
      onClick={onClick}
      className="bento-card bento-card-large"
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      aria-label="Abrir Notas e Faltas — visão geral do semestre"
    >
      <div className="bento-card-icon-wrap">
        <FileText size={22} strokeWidth={1.7} />
      </div>
      <p className="bento-card-title">Notas e Faltas</p>
      <p className="bento-card-mega" style={{ color: mediaColor }}>
        {mediaGeral != null ? mediaGeral.toFixed(1) : '—'}
      </p>
      <p className="bento-card-stat" style={{ color: '#71717a' }}>
        média geral do semestre
        {resumos.length > 0 && <> · {comMedia}/{resumos.length} {resumos.length === 1 ? 'matéria' : 'matérias'} com nota</>}
      </p>

      {resumos.length === 0 ? (
        <p style={{ fontSize: 12.5, color: '#71717a', marginTop: 12, lineHeight: 1.5 }}>
          Nenhuma matéria com notas ainda. Adicione em /notas.
        </p>
      ) : (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visiveis.map((r, i) => {
            const cor = r.media != null ? corNotaMeta(r.media, r.meta) : '#71717a'
            return (
              <motion.div
                key={r.id}
                initial={reduce ? false : { opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i, duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, padding: '4px 0', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,.04)',
                }}
              >
                <span style={{
                  fontSize: 13, color: '#d4d4d8', whiteSpace: 'nowrap',
                  overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0,
                }}>
                  {r.nome}
                </span>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: cor, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                  {r.media != null ? r.media.toFixed(1) : '—'}
                </span>
              </motion.div>
            )
          })}
          {temMais && (
            // Afordância visual (o card inteiro já é o botão que abre o
            // fullscreen) — span, não <button>, pra não aninhar botões.
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 3,
              fontSize: 12, fontWeight: 600, color: '#22c55e', marginTop: 6,
            }}>
              ver todas ({resumos.length})
              <ChevronRight size={13} strokeWidth={2.2} />
            </span>
          )}
        </div>
      )}
    </motion.button>
  )
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
  const [erro, setErro] = useState(null)
  const [activeTab, setActiveTab] = useState('avaliacoes')

  useEffect(() => {
    let alive = true
    // Modelo NOVO (Parte 3): fonte de verdade é db.getMaterias().
    db.getMaterias()
      .then(d => { if (alive) { setNotas(d || []); setErro(null) } })
      .catch(e => { if (alive) setErro(e?.message || 'Não foi possível carregar suas notas.') })
    return () => { alive = false }
  }, [])

  const lista = useMemo(() => notasDaMateria(notas, materia), [notas, materia])
  const media = useMemo(() => mediaPonderada(lista), [lista])
  const sortedDesc = useMemo(() => sortByDate(lista, 'desc'), [lista])
  const ultima = sortedDesc[0]
  const faltas = ultima?.faltas ?? null
  const maxFaltas = ultima?.maxFaltas ?? null // null = limite não configurado
  const temLimite = maxFaltas != null
  const pctFaltas = !temLimite || faltas == null
    ? 0
    : maxFaltas > 0 ? Math.min((faltas / maxFaltas) * 100, 100) : (faltas > 0 ? 100 : 0)
  const corFaltas = !temLimite ? '#71717a' : pctFaltas >= 80 ? '#f87171' : pctFaltas >= 60 ? '#fbbf24' : '#22c55e'

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
          Notas e Faltas {!isGeral && <>· <span className="lousa-fs-title-materia">{materia}</span></>}
        </h1>
        <p className="lousa-fs-subtitle">
          {isGeral
            ? 'Visão geral de todas as suas avaliações.'
            : 'Acompanhe sua performance e use a previsão pra planejar.'}
        </p>
      </header>

      {erro && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.28)',
          borderRadius: 12, padding: '12px 14px', marginBottom: 20,
          fontSize: 13, color: '#fca5a5', lineHeight: 1.5,
        }}>
          <AlertCircle size={16} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{erro}</span>
        </div>
      )}

      {isGeral ? (
        <NotasGeralFullscreen notas={notas} reduce={reduce} />
      ) : lista.length === 0 ? (
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
      <style>{sharedItemCss}</style>
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
        {maxFaltas == null ? (
          <>
            <p className="lousa-fs-stat-value" style={{ color: '#71717a' }}>{faltas ?? 0}</p>
            <p className="lousa-fs-stat-label">Faltas · defina o limite</p>
            <p className="lousa-fs-stat-sub">Configure o limite de faltas em /notas.</p>
          </>
        ) : (
          <>
            <p className={`lousa-fs-stat-value ${pct >= 80 ? 'danger' : pct >= 60 ? 'warn' : ''}`} style={{ color: corFaltas }}>
              {faltas ?? 0}<span style={{ fontSize: 16, color: '#71717a', fontWeight: 600 }}>/{maxFaltas}</span>
            </p>
            <p className="lousa-fs-stat-label">Faltas ({Math.round(pct)}%)</p>
            <div className="lousa-fs-bar-wrap">
              <div className="lousa-fs-bar-fill" style={{ width: `${pct}%`, background: corFaltas }} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function PredictionCard({ media }) {
  const acima = media >= 7
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

  if (maxFaltas == null) {
    return (
      <div>
        <div className="lousa-fs-card">
          <p className="lousa-fs-card-title">
            <AlertCircle size={16} strokeWidth={1.7} style={{ color: '#71717a' }} />
            Resumo de faltas
          </p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#71717a', letterSpacing: '-.02em', lineHeight: 1, marginTop: 8 }}>
            {faltas} <span style={{ fontSize: 18, color: '#71717a', fontWeight: 600 }}>faltas</span>
          </p>
          <p style={{ fontSize: 13, color: '#a1a1aa', marginTop: 6 }}>
            Defina o limite de faltas desta matéria em /notas pra acompanhar quanto ainda pode faltar.
          </p>
        </div>
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

/* ─── Fullscreen: visão geral consolidada ───────────────────────── */
function NotasGeralFullscreen({ notas, reduce }) {
  const resumos = useMemo(() => resumoMaterias(notas), [notas])
  const mediaGeral = useMemo(() => mediaGeralSemestre(resumos), [resumos])
  const comMedia = resumos.filter(r => r.media != null).length

  if (resumos.length === 0) {
    return (
      <div className="lousa-fs-empty" style={{ paddingTop: 64 }}>
        <FileX className="lousa-fs-empty-icon" />
        <p className="lousa-fs-empty-title">Nenhuma matéria com notas ainda</p>
        <p className="lousa-fs-empty-sub">
          Cadastre suas matérias e avaliações na tela de Notas pra ver o panorama do semestre aqui.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="lousa-fs-stats-grid">
        <div className="lousa-fs-stat-card">
          <p className="lousa-fs-stat-value" style={{ color: mediaGeral != null ? corNota(mediaGeral) : '#71717a' }}>
            {mediaGeral != null ? mediaGeral.toFixed(1) : '—'}
          </p>
          <p className="lousa-fs-stat-label">Média geral do semestre</p>
          <p className="lousa-fs-stat-sub">Média das médias — panorama, não nota oficial.</p>
        </div>
        <div className="lousa-fs-stat-card">
          <p className="lousa-fs-stat-value neutral">{resumos.length}</p>
          <p className="lousa-fs-stat-label">Matérias</p>
        </div>
        <div className="lousa-fs-stat-card">
          <p className="lousa-fs-stat-value neutral">{comMedia}</p>
          <p className="lousa-fs-stat-label">Com nota lançada</p>
        </div>
      </div>

      <div className="lousa-acc-list">
        {resumos.map((r, i) => (
          <MateriaAccordion key={r.id} resumo={r} reduce={reduce} index={i} />
        ))}
      </div>
    </div>
  )
}

function MateriaAccordion({ resumo, reduce, index }) {
  const [open, setOpen] = useState(false)
  const cor = resumo.media != null ? corNotaMeta(resumo.media, resumo.meta) : '#71717a'
  const temNota = resumo.totalAval > 0

  return (
    <motion.div
      className="lousa-acc-item"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : 0.03 * index, duration: 0.25 }}
    >
      <button
        type="button"
        className="lousa-acc-head"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        disabled={!temNota}
      >
        <span className="lousa-acc-chev" data-open={open} aria-hidden>
          <ChevronDown size={16} strokeWidth={2} />
        </span>
        <span className="lousa-acc-nome">{resumo.nome}</span>
        <span className="lousa-acc-meta-info">
          {temNota
            ? `${resumo.countComNota}/${resumo.totalAval} ${resumo.totalAval === 1 ? 'avaliação' : 'avaliações'}`
            : 'sem avaliações'}
        </span>
        <span className="lousa-acc-media" style={{ color: cor }}>
          {resumo.media != null ? resumo.media.toFixed(1) : '—'}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && temNota && (
          <motion.div
            key="body"
            initial={reduce ? { opacity: 1 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="lousa-acc-body">
              <div className="lousa-acc-row lousa-acc-row-head">
                <span>Avaliação</span>
                <span>Peso</span>
                <span>Nota</span>
              </div>
              {resumo.avaliacoes.map((a, j) => {
                const semNota = a.nota === null || a.nota === undefined || a.nota === '' || Number.isNaN(Number(a.nota))
                return (
                  <div className="lousa-acc-row" key={a.id ?? j}>
                    <span style={{ color: '#e4e4e7', fontWeight: 600 }}>{(a.nome && String(a.nome).trim()) || 'Avaliação'}</span>
                    <span style={{ color: '#a1a1aa' }}>×{a.peso ?? 1}</span>
                    <span style={{ color: semNota ? '#71717a' : corNota(a.nota), fontWeight: 700 }}>
                      {semNota ? '—' : Number(a.nota).toFixed(1)}
                    </span>
                  </div>
                )
              })}
              <p className="lousa-acc-foot">
                Meta de aprovação: {resumo.meta} · {resumo.maxFaltas == null ? `${resumo.faltas} faltas (defina o limite)` : `${resumo.faltas}/${resumo.maxFaltas} faltas`} · edite em /notas
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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
