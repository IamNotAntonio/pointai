'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion, animate } from 'motion/react'
import {
  Plus, Minus, Settings2, Check, BookOpen, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, ShieldCheck, Ban, Info, Loader2,
} from 'lucide-react'
import { calcularMedia } from '../lib/db'
import AvaliacaoRow from './AvaliacaoRow'

const MEDIA_APROVACAO_PADRAO = 7.0
const LIMITE_VISIVEL = 4 // avaliações mostradas antes de "Ver todas"
const RING_SIZE = 104
const RING_STROKE = 9
const EASE = [0.16, 1, 0.3, 1]

const fmt1 = n => Number(n).toFixed(1).replace('.', ',') // "8,0" PT-BR
const plVez = n => (Math.abs(n) === 1 ? 'vez' : 'vezes')
const plFalta = n => (Math.abs(n) === 1 ? 'falta' : 'faltas')

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

// Anel de presença: mostra FALTAS RESTANTES no centro. Preenche conforme as
// faltas usadas se aproximam do limite. Mesma linguagem do anel de notas.
function RingFaltas({ restantes, faltas, limite, configurado, cor, reduce }) {
  const r = (RING_SIZE - RING_STROKE) / 2
  const circ = 2 * Math.PI * r
  // fração usada do teto (clamp 0..1); limite 0 → cheio se já faltou.
  const progresso = !configurado
    ? 0
    : limite > 0
      ? Math.max(0, Math.min(1, faltas / limite))
      : (faltas > 0 ? 1 : 0)
  const offsetAlvo = circ * (1 - progresso)

  const alvo = configurado ? Math.max(0, restantes) : 0
  const [display, setDisplay] = useState(configurado && !reduce ? 0 : alvo)
  const [animando, setAnimando] = useState(configurado && !reduce)
  useEffect(() => {
    if (!configurado || reduce) return
    const ctrl = animate(0, alvo, {
      duration: 0.9, ease: EASE,
      onUpdate: v => setDisplay(v),
      onComplete: () => setAnimando(false),
    })
    return () => ctrl.stop()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const numero = animando ? Math.round(display) : alvo

  return (
    <div style={{ position: 'relative', width: RING_SIZE, height: RING_SIZE, flexShrink: 0 }}>
      <svg width={RING_SIZE} height={RING_SIZE} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={RING_STROKE} />
        {configurado && (
          <motion.circle
            cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={r} fill="none"
            stroke={cor} strokeWidth={RING_STROKE} strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: reduce ? offsetAlvo : circ }}
            animate={{ strokeDashoffset: offsetAlvo }}
            transition={{ duration: reduce ? 0 : 0.9, ease: EASE }}
          />
        )}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {configurado ? (
          <>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: cor, letterSpacing: '-.5px' }}>{numero}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 2 }}>restantes</span>
          </>
        ) : (
          <>
            <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1, color: 'var(--text-4)' }}>—</span>
            <span style={{ fontSize: 10.5, color: 'var(--text-4)', marginTop: 2 }}>sem limite</span>
          </>
        )}
      </div>
    </div>
  )
}

// Botão redondo +/− para os steppers (sem setinhas type=number).
function StepBtn({ dir, onClick, disabled }) {
  const Icon = dir === 'up' ? Plus : Minus
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'up' ? 'Aumentar' : 'Diminuir'}
      style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '1.5px solid var(--border-2)', background: 'transparent',
        color: 'var(--text-2)', cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1, transition: 'border-color .15s, color .15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.borderColor = '#22c55e'; e.currentTarget.style.color = '#16a34a' } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-2)'; e.currentTarget.style.color = 'var(--text-2)' }}
    >
      <Icon size={17} strokeWidth={2.4} />
    </button>
  )
}

// Card de uma matéria. row pode ser null (matéria ainda sem linha).
// Handlers async que propagam erro: onAddAvaliacao / onUpdateAvaliacao /
// onDeleteAvaliacao / onUpdateMateria.
export default function MateriaCard({
  nome, row, index = 0,
  onAddAvaliacao, onUpdateAvaliacao, onDeleteAvaliacao, onUpdateMateria,
}) {
  const reduce = useReducedMotion()
  const [aba, setAba] = useState('notas') // 'notas' | 'presenca'
  const [adicionando, setAdicionando] = useState(false)
  const [editandoMeta, setEditandoMeta] = useState(false)
  const [expandido, setExpandido] = useState(false)

  // Steppers de presença: status de salvamento p/ micro-feedback (igual /notas).
  const [statusFaltas, setStatusFaltas] = useState('idle') // idle | saving | saved
  const [statusLimite, setStatusLimite] = useState('idle')
  const [editLimite, setEditLimite] = useState(false)
  const [limiteInput, setLimiteInput] = useState('')

  const avaliacoes = row?.avaliacoes || []
  const faltas = row?.faltas ?? 0
  const meta = Number(row?.media_aprovacao ?? MEDIA_APROVACAO_PADRAO)
  const nAvaliadas = avaliacoes.filter(a => a.nota !== null && a.nota !== '').length
  // Condensa a exibição (o cálculo da média segue usando TODAS as avaliações).
  const visiveis = expandido ? avaliacoes : avaliacoes.slice(0, LIMITE_VISIVEL)

  const media = calcularMedia(avaliacoes)
  const aprovado = media !== null && media >= meta
  const corMedia = media === null ? 'var(--text-4)' : aprovado ? '#22c55e' : '#dc2626'

  // ── Presença: limite_faltas é o teto explícito de faltas (coluna nova,
  // nullable). NULL = não configurado. total_aulas NÃO é usado aqui. ──
  const limiteRaw = row?.limite_faltas
  const limiteConfigurado = limiteRaw != null
  const limite = limiteConfigurado ? Number(limiteRaw) : null
  const restantes = limite != null ? limite - faltas : null

  let corPresenca, estadoPres
  if (!limiteConfigurado) { estadoPres = 'nao-config'; corPresenca = 'var(--text-4)' }
  else if (restantes < 0) { estadoPres = 'estourado'; corPresenca = '#dc2626' }
  else if (restantes === 0) { estadoPres = 'limite'; corPresenca = '#dc2626' }
  else if (restantes <= 2) { estadoPres = 'atencao'; corPresenca = '#d97706' }
  else { estadoPres = 'ok'; corPresenca = '#22c55e' }

  // Selo + frase protetora da presença (tom acolhedor, nunca punitivo).
  let seloPres = null, frasePres
  if (estadoPres === 'nao-config') {
    frasePres = 'Defina abaixo quantas faltas sua faculdade permite nesta matéria.'
  } else if (estadoPres === 'ok') {
    seloPres = { label: 'Margem confortável', Icon: ShieldCheck, bg: 'rgba(34,197,94,.14)', cor: '#16a34a', borda: 'rgba(34,197,94,.3)' }
    frasePres = `Você usou ${faltas} de ${limite} faltas. Ainda pode faltar ${restantes} ${plVez(restantes)}.`
  } else if (estadoPres === 'atencao') {
    seloPres = { label: 'Atenção', Icon: AlertTriangle, bg: 'rgba(217,119,6,.14)', cor: '#d97706', borda: 'rgba(217,119,6,.32)' }
    frasePres = `Cuidado: só pode faltar mais ${restantes} ${plVez(restantes)}.`
  } else if (estadoPres === 'limite') {
    seloPres = { label: 'Limite atingido', Icon: Ban, bg: 'rgba(220,38,38,.14)', cor: '#dc2626', borda: 'rgba(220,38,38,.32)' }
    frasePres = `Você usou todas as ${limite} faltas permitidas. Evite faltar mais para não reprovar por presença.`
  } else { // estourado
    seloPres = { label: 'Limite ultrapassado', Icon: Ban, bg: 'rgba(220,38,38,.14)', cor: '#dc2626', borda: 'rgba(220,38,38,.32)' }
    frasePres = `Você passou do limite de ${limite} ${plFalta(limite)} (usou ${faltas}). Procure a coordenação da sua faculdade.`
  }

  // Selo + frase motivacional das notas (tom acolhedor, nunca punitivo).
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

  // Salva faltas usadas. Erro propaga via toast no parent; aqui só reverte status.
  async function ajustarFaltas(delta) {
    const novo = Math.max(0, faltas + delta)
    if (novo === faltas) return
    setStatusFaltas('saving')
    try {
      await onUpdateMateria(nome, { faltas: novo })
      setStatusFaltas('saved')
      setTimeout(() => setStatusFaltas(s => (s === 'saved' ? 'idle' : s)), 1200)
    } catch { setStatusFaltas('idle') }
  }

  // Salva o limite de faltas (persistido na coluna limite_faltas). Aceita
  // null→base 0 quando ainda não configurado. Mínimo 0.
  async function salvarLimite(novo) {
    const v = Math.max(0, novo)
    if (limite != null && v === limite) return
    setStatusLimite('saving')
    try {
      await onUpdateMateria(nome, { limite_faltas: v })
      setStatusLimite('saved')
      setTimeout(() => setStatusLimite(s => (s === 'saved' ? 'idle' : s)), 1200)
    } catch { setStatusLimite('idle') }
  }

  function ajustarLimite(delta) {
    salvarLimite((limite ?? 0) + delta)
  }

  function abrirEditLimite() {
    setLimiteInput(limite != null ? String(limite) : '')
    setEditLimite(true)
  }
  async function confirmarEditLimite() {
    setEditLimite(false)
    const v = parseInt(limiteInput, 10)
    if (Number.isNaN(v)) return
    await salvarLimite(v)
  }

  const StatusIcon = ({ status }) => (
    <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center', flexShrink: 0 }}>
      {status === 'saving' && <Loader2 size={14} style={{ color: 'var(--text-4)', animation: 'spin 1s linear infinite' }} />}
      {status === 'saved' && (
        <motion.span initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }}>
          <Check size={15} style={{ color: '#22c55e' }} strokeWidth={2.5} />
        </motion.span>
      )}
    </span>
  )

  const abas = [{ id: 'notas', label: 'Notas' }, { id: 'presenca', label: 'Presença' }]

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

      {/* 2. Abas: Notas / Presença */}
      <div style={{
        position: 'relative', display: 'flex', gap: 4, padding: 4,
        background: 'var(--surface-2)', borderRadius: 12, border: '1px solid var(--border)',
      }}>
        {abas.map(t => {
          const ativo = aba === t.id
          return (
            <button
              key={t.id}
              onClick={() => setAba(t.id)}
              aria-pressed={ativo}
              style={{
                position: 'relative', flex: 1, padding: '8px 10px', borderRadius: 9,
                border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                color: ativo ? '#16a34a' : 'var(--text-3)', transition: 'color .2s',
              }}
            >
              {ativo && (
                <motion.span
                  layoutId={`aba-ind-${nome}`}
                  transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
                  style={{
                    position: 'absolute', inset: 0, borderRadius: 9, zIndex: 0,
                    background: 'var(--surface-1)', border: '1px solid rgba(34,197,94,.3)',
                    boxShadow: '0 1px 3px rgba(0,0,0,.12)',
                  }}
                />
              )}
              <span style={{ position: 'relative', zIndex: 1 }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      {/* 3. Conteúdo da aba (troca animada) */}
      <AnimatePresence mode="wait" initial={false}>
        {aba === 'notas' ? (
          <motion.div
            key="notas"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={reduce ? {} : { opacity: 1, x: 0 }}
            exit={reduce ? {} : { opacity: 0, x: 8 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Anel de média + selo motivacional */}
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

            {/* Avaliações */}
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

              {/* Botão adicionar */}
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
        ) : (
          <motion.div
            key="presenca"
            initial={reduce ? false : { opacity: 0, x: 8 }}
            animate={reduce ? {} : { opacity: 1, x: 0 }}
            exit={reduce ? {} : { opacity: 0, x: -8 }}
            transition={{ duration: reduce ? 0 : 0.22, ease: EASE }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Anel de faltas restantes + selo protetor */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <RingFaltas
                restantes={restantes ?? 0}
                faltas={faltas}
                limite={limite ?? 0}
                configurado={limiteConfigurado}
                cor={corPresenca}
                reduce={reduce}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                {seloPres && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 8,
                    background: seloPres.bg, color: seloPres.cor, border: `1px solid ${seloPres.borda}`,
                    borderRadius: 99, padding: '3px 10px', fontSize: 11.5, fontWeight: 700,
                  }}>
                    <seloPres.Icon size={13} strokeWidth={2.2} /> {seloPres.label}
                  </span>
                )}
                <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-2)', margin: 0 }}>{frasePres}</p>
              </div>
            </div>

            {/* Controles +/− */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Faltas usadas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Faltas usadas</span>
                  <StatusIcon status={statusFaltas} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StepBtn dir="down" onClick={() => ajustarFaltas(-1)} disabled={faltas <= 0} />
                  <motion.span
                    key={faltas}
                    animate={statusFaltas === 'saved' && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35 }}
                    style={{ minWidth: 40, textAlign: 'center', fontSize: 24, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-.5px' }}
                  >
                    {faltas}
                  </motion.span>
                  <StepBtn dir="up" onClick={() => ajustarFaltas(1)} />
                </div>
              </div>

              {/* Limite de faltas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: 'var(--text-3)' }}>Limite de faltas</span>
                  <StatusIcon status={statusLimite} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <StepBtn dir="down" onClick={() => ajustarLimite(-1)} disabled={(limite ?? 0) <= 0} />
                  {editLimite ? (
                    <input
                      aria-label="Limite de faltas"
                      type="text" inputMode="numeric"
                      value={limiteInput}
                      autoFocus
                      onChange={e => setLimiteInput(e.target.value.replace(/[^\d]/g, ''))}
                      onBlur={confirmarEditLimite}
                      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
                      placeholder="—"
                      style={{
                        width: 56, textAlign: 'center', padding: '4px 4px', fontSize: 22, fontWeight: 800,
                        borderRadius: 9, background: 'var(--surface-3)', color: 'var(--text-1)', fontFamily: 'inherit',
                        border: '1.5px solid var(--border)', outline: 'none',
                      }}
                    />
                  ) : (
                    <motion.button
                      onClick={abrirEditLimite}
                      aria-label={limite != null ? `Limite ${limite} — editar` : 'Definir limite de faltas'}
                      animate={statusLimite === 'saved' && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                      style={{
                        minWidth: 56, textAlign: 'center', padding: 0, background: 'none', border: 'none', cursor: 'pointer',
                        fontSize: 24, fontWeight: 800, color: limite != null ? 'var(--text-1)' : 'var(--text-4)', letterSpacing: '-.5px',
                      }}
                    >
                      {limite != null ? limite : '—'}
                    </motion.button>
                  )}
                  <StepBtn dir="up" onClick={() => ajustarLimite(1)} />
                </div>
              </div>

              {/* Dica discreta */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, paddingTop: 2 }}>
                <Info size={13} strokeWidth={1.9} style={{ color: 'var(--text-4)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--text-4)', margin: 0 }}>
                  Coloque o limite de faltas que sua faculdade permite nesta matéria. Cada faculdade conta de um jeito.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
