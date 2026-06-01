'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion, animate } from 'motion/react'
import { Plus, Settings2, Check, BookOpen, TrendingUp, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { calcularMedia } from '../lib/db'
import AvaliacaoRow from './AvaliacaoRow'

const TOTAL_AULAS_PADRAO = 60
const MEDIA_APROVACAO_PADRAO = 7.0
const REGRA_FALTA = 0.25
const LIMITE_VISIVEL = 4 // avaliações mostradas antes de "Ver todas"
const RING_SIZE = 104
const RING_STROKE = 9
const EASE = [0.16, 1, 0.3, 1]

const fmt1 = n => Number(n).toFixed(1).replace('.', ',') // "8,0" PT-BR

// Anel de progresso (média/10) com preenchimento + count-up no mount.
function RingMedia({ media, cor, reduce }) {
  const r = (RING_SIZE - RING_STROKE) / 2
  const circ = 2 * Math.PI * r
  const temNota = media !== null
  const progresso = temNota ? Math.max(0, Math.min(1, media / 10)) : 0
  const offsetAlvo = circ * (1 - progresso)

  // Count-up só no mount (depois reflete a média ao vivo nas edições).
  const [display, setDisplay] = useState(temNota && !reduce ? 0 : media)
  const [animando, setAnimando] = useState(temNota && !reduce)
  useEffect(() => {
    if (!temNota || reduce) return
    const ctrl = animate(0, media, {
      duration: 1, ease: EASE,
      onUpdate: v => setDisplay(v),
      onComplete: () => setAnimando(false),
    })
    return () => ctrl.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const numero = !temNota ? null : animando ? display : media

  return (
    <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={RING_STROKE} />
        <motion.circle
          cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none"
          stroke={cor} strokeWidth={RING_STROKE} strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: reduce ? offsetAlvo : circ }}
          animate={{ strokeDashoffset: offsetAlvo }}
          transition={{ duration: reduce ? 0 : 1, ease: EASE }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 28, fontWeight: 800, lineHeight: 1, color: cor, letterSpacing: '-.5px' }}>
          {numero === null ? '—' : fmt1(numero)}
        </span>
        <span style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 2 }}>de 10</span>
      </div>
    </div>
  )
}

// Card de uma matéria (Visão A). row pode ser null (matéria ainda sem linha).
// Handlers async que propagam erro: onAddAvaliacao / onUpdateAvaliacao /
// onDeleteAvaliacao / onUpdateMateria.
export default function MateriaCard({
  nome, row, index = 0,
  onAddAvaliacao, onUpdateAvaliacao, onDeleteAvaliacao, onUpdateMateria,
}) {
  const reduce = useReducedMotion()
  const [adicionando, setAdicionando] = useState(false)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [expandido, setExpandido] = useState(false)

  const avaliacoes = row?.avaliacoes || []
  const faltas = row?.faltas ?? 0
  const totalAulas = row?.total_aulas ?? TOTAL_AULAS_PADRAO
  const meta = Number(row?.media_aprovacao ?? MEDIA_APROVACAO_PADRAO)
  const nAvaliadas = avaliacoes.filter(a => a.nota !== null && a.nota !== '').length
  // Condensa a exibição (o cálculo da média segue usando TODAS as avaliações).
  const visiveis = expandido ? avaliacoes : avaliacoes.slice(0, LIMITE_VISIVEL)
  const ocultas = avaliacoes.length - LIMITE_VISIVEL

  const media = calcularMedia(avaliacoes)
  const aprovado = media !== null && media >= meta
  const corMedia = media === null ? 'var(--text-4)' : aprovado ? '#22c55e' : '#dc2626'

  const maxFaltas = Math.floor(totalAulas * REGRA_FALTA)
  const restantes = maxFaltas - faltas
  const faltaLimite = restantes <= 0
  const faltaAlerta = restantes > 0 && restantes <= 3
  const corFalta = faltaLimite ? '#dc2626' : faltaAlerta ? '#d97706' : '#22c55e'

  // Selo + frase motivacional (tom acolhedor, nunca punitivo).
  let selo, frase
  if (media === null) {
    frase = 'Adicione suas notas pra ver seu progresso.'
  } else if (aprovado) {
    const diff = media - meta
    selo = { label: 'No caminho certo', Icon: TrendingUp, bg: 'rgba(34,197,94,.14)', cor: '#16a34a', borda: 'rgba(34,197,94,.3)' }
    frase = diff < 0.05
      ? `Você atingiu sua meta de ${fmt1(meta)}. Continue assim!`
      : `Você está ${fmt1(diff)} acima da sua meta de ${fmt1(meta)}. Continue assim!`
  } else {
    selo = { label: 'Atenção', Icon: AlertTriangle, bg: 'rgba(217,119,6,.14)', cor: '#d97706', borda: 'rgba(217,119,6,.32)' }
    frase = `Faltam ${fmt1(meta - media)} pra sua meta de ${fmt1(meta)}. Você consegue!`
  }

  async function handleAdd() {
    setAdicionando(true)
    setExpandido(true) // mostra a nova (anexada ao fim) mesmo se passar do limite
    try { await onAddAvaliacao(nome) } finally { setAdicionando(false) }
  }

  return (
    <motion.div
      layout={!reduce}
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? {} : { opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : Math.min(index * 0.06, 0.5) }}
      className="card"
      style={{ display: 'flex', flexDirection: 'column', gap: 16, borderRadius: 16 }}
    >
      {/* 1. Cabeçalho */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(34,197,94,.12)', color: '#16a34a',
        }}>
          <BookOpen size={19} strokeWidth={1.9} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-1)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nome}
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '2px 0 0' }}>
            {avaliacoes.length === 0 ? 'Sem avaliações' : `${avaliacoes.length} ${avaliacoes.length === 1 ? 'avaliação' : 'avaliações'}`}
            {avaliacoes.length > 0 && nAvaliadas < avaliacoes.length ? ` · ${nAvaliadas} com nota` : ''}
          </p>
        </div>
        <button
          onClick={() => setEditandoMeta(v => !v)}
          aria-label="Configurar média de aprovação"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 4, borderRadius: 6, flexShrink: 0, transition: 'color .15s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-4)')}
        >
          <Settings2 size={16} strokeWidth={1.8} />
        </button>
      </div>

      {/* Editor discreto da média de aprovação */}
      <AnimatePresence>
        {editandoMeta && (
          <motion.div
            initial={reduce ? false : { opacity: 0, height: 0 }}
            animate={reduce ? {} : { opacity: 1, height: 'auto' }}
            exit={reduce ? {} : { opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
              <label className="label" style={{ margin: 0 }}>Média p/ aprovação</label>
              <input
                type="number" min="0" max="10" step="0.5" defaultValue={meta}
                className="input"
                style={{ width: 80, padding: '6px 8px', fontSize: 13 }}
                autoFocus
                onBlur={async e => {
                  const v = Number(e.target.value)
                  if (!Number.isNaN(v) && v !== meta) await onUpdateMateria(nome, { media_aprovacao: v })
                  setEditandoMeta(false)
                }}
              />
              <Check size={14} style={{ color: '#22c55e' }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2+3. Anel + selo motivacional */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <RingMedia media={media} cor={corMedia} reduce={reduce} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {selo && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8,
              background: selo.bg, color: selo.cor, border: `1px solid ${selo.borda}`,
              borderRadius: 99, padding: '3px 10px', fontSize: 11.5, fontWeight: 700,
            }}>
              <selo.Icon size={13} strokeWidth={2.2} /> {selo.label}
            </span>
          )}
          <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: 0 }}>{frase}</p>
        </div>
      </div>

      {/* 4. Barra de faltas */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 13 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
          <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>
            Faltas: <strong style={{ color: 'var(--text-1)' }}>{faltas}</strong> de {maxFaltas}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: corFalta }}>
            {faltaLimite ? 'Limite atingido' : `${restantes} restantes`}
          </span>
        </div>
        <div style={{ height: 6, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
          <motion.div
            initial={reduce ? false : { width: 0 }}
            animate={{ width: `${Math.min(100, (faltas / Math.max(maxFaltas, 1)) * 100)}%` }}
            transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
            style={{ height: '100%', borderRadius: 99, background: corFalta }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 9 }}>
          <label style={{ flex: 1, fontSize: 11, color: 'var(--text-4)' }}>
            Faltas
            <input
              type="number" min="0" defaultValue={faltas}
              className="input"
              style={{ marginTop: 3, padding: '6px 8px', fontSize: 13 }}
              onBlur={async e => {
                const v = parseInt(e.target.value, 10) || 0
                if (v !== faltas) await onUpdateMateria(nome, { faltas: v })
              }}
            />
          </label>
          <label style={{ flex: 1, fontSize: 11, color: 'var(--text-4)' }}>
            Total de aulas
            <input
              type="number" min="0" defaultValue={totalAulas}
              className="input"
              style={{ marginTop: 3, padding: '6px 8px', fontSize: 13 }}
              onBlur={async e => {
                const v = parseInt(e.target.value, 10) || 0
                if (v !== totalAulas) await onUpdateMateria(nome, { total_aulas: v })
              }}
            />
          </label>
        </div>
      </div>

      {/* 5. Avaliações */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6 }}>
        {avaliacoes.length === 0 && (
          <p style={{ fontSize: 12.5, color: 'var(--text-4)', padding: '4px 0 2px' }}>
            Nenhuma avaliação ainda. Adicione a primeira abaixo.
          </p>
        )}
        <AnimatePresence initial={false}>
          {visiveis.map(av => (
            <AvaliacaoRow
              key={av.id}
              avaliacao={av}
              onSave={patch => onUpdateAvaliacao(av.id, patch)}
              onDelete={() => onDeleteAvaliacao(av.id)}
            />
          ))}
        </AnimatePresence>

        {/* Ver todas / Ver menos (só quando passa do limite) */}
        {avaliacoes.length > LIMITE_VISIVEL && (
          <button
            onClick={() => setExpandido(v => !v)}
            aria-expanded={expandido}
            style={{
              width: '100%', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '7px', fontSize: 12.5, fontWeight: 600, color: 'var(--text-3)',
              background: 'none', border: 'none', cursor: 'pointer', transition: 'color .15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#16a34a')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
          >
            {expandido
              ? <>Ver menos <ChevronUp size={14} strokeWidth={2} /></>
              : <>Ver todas as {avaliacoes.length} avaliações <ChevronDown size={14} strokeWidth={2} /></>}
          </button>
        )}

        {/* 6. Botão adicionar */}
        <button
          onClick={handleAdd}
          disabled={adicionando}
          style={{
            width: '100%', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            padding: '10px', fontSize: 13, fontWeight: 600, borderRadius: 11,
            border: '1.5px dashed var(--border-2)', background: 'transparent', color: 'var(--text-3)',
            cursor: adicionando ? 'default' : 'pointer', opacity: adicionando ? 0.6 : 1, transition: 'border-color .15s, color .15s',
          }}
          onMouseEnter={e => { if (!adicionando) { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#16a34a' } }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-3)' }}
        >
          <Plus size={15} strokeWidth={2.2} /> {adicionando ? 'Adicionando…' : 'Adicionar avaliação'}
        </button>
      </div>
    </motion.div>
  )
}
