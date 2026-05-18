'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronRight } from 'lucide-react'

/* ── Passos do tour ──────────────────────────────────────────── */
const STEPS = [
  {
    selector:  '[data-tour="materias"]',
    title:     'Suas Matérias',
    desc:      'Selecione uma matéria para o chat dedicado — cada uma tem histórico próprio. O Chat Geral serve para qualquer pergunta sem matéria específica.',
    prefer:    'right',
  },
  {
    selector:  '[data-tour="chat-area"]',
    title:     'Chat com IA',
    desc:      'Converse sobre dúvidas, peça resumos, exercícios ou explicações. A IA lembra do contexto ao longo da conversa.',
    prefer:    'center-right',
  },
  {
    selector:  '[data-tour="camera-btn"]',
    title:     'Envie Fotos',
    desc:      'Fotografe sua prova, tarefa ou anotação e envie direto. A IA analisa o conteúdo visual e te ajuda na hora.',
    prefer:    'top',
  },
  {
    selector:  '[data-tour="msg-bubble-first"]',
    title:     'Ações nas Mensagens',
    desc:      'Passe o mouse sobre qualquer resposta da IA para copiar, aprofundar o tema ou compartilhar com facilidade.',
    prefer:    'right',
  },
  {
    selector:  '[data-tour="pa-fab"]',
    title:     'Assistente Point',
    desc:      'O coach do app te guia por todas as funcionalidades. Clique para abrir e tirar dúvidas sobre o Point.AI.',
    prefer:    'left',
  },
  {
    selector:  '[data-tour="account-btn"]',
    title:     'Menu da Conta',
    desc:      'Edite seu perfil, veja planos de assinatura, alterne o tema claro/escuro e acesse todas as configurações.',
    prefer:    'right',
  },
]

const TOOLTIP_W = 300
const TOOLTIP_H = 220  // estimativa conservadora
const GAP       = 16
const MARGIN    = 14

/* ── Obtém rect do elemento com padding visual ────────────────── */
const PAD = 8

function elRect(selector) {
  try {
    const el = document.querySelector(selector)
    if (!el) return null
    const r = el.getBoundingClientRect()
    if (!r.width && !r.height) return null
    return {
      top:    r.top    - PAD,
      left:   r.left   - PAD,
      width:  r.width  + PAD * 2,
      height: r.height + PAD * 2,
      right:  r.right  + PAD,
      bottom: r.bottom + PAD,
      cx:     (r.left + r.right)  / 2,
      cy:     (r.top  + r.bottom) / 2,
    }
  } catch { return null }
}

/* ── Calcula posição do tooltip ──────────────────────────────── */
function computePos(rect, prefer, tooltipH) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const w  = TOOLTIP_W
  const h  = tooltipH

  // Candidatos em ordem de preferência
  function candidate(dir) {
    switch (dir) {
      case 'right':  return { left: rect.right  + GAP,              top:  clampY(rect.cy - h / 2, vh, h) }
      case 'left':   return { left: rect.left   - w - GAP,          top:  clampY(rect.cy - h / 2, vh, h) }
      case 'top':    return { left: clampX(rect.cx - w / 2, vw, w), top:  rect.top  - h - GAP }
      case 'bottom': return { left: clampX(rect.cx - w / 2, vw, w), top:  rect.bottom + GAP }
      // Para elementos muito grandes (chat-area), posicionar no canto superior direito da área
      case 'center-right': return { left: Math.min(rect.right - w - 10, vw - w - MARGIN), top: rect.top + GAP + 40 }
      default:       return center(vw, vh, w, h)
    }
  }

  function fits(pos) {
    return pos.left >= MARGIN
        && pos.top  >= MARGIN
        && pos.left + w <= vw - MARGIN
        && pos.top  + h <= vh - MARGIN
  }

  // Ordem de fallback por preferência
  const order = {
    'right':        ['right', 'left', 'bottom', 'top'],
    'left':         ['left',  'right', 'bottom', 'top'],
    'top':          ['top',   'bottom', 'right', 'left'],
    'bottom':       ['bottom','top',   'right',  'left'],
    'center-right': ['center-right', 'right', 'bottom', 'left', 'top'],
  }[prefer] ?? ['bottom', 'top', 'right', 'left']

  for (const dir of order) {
    const pos = candidate(dir)
    if (fits(pos)) return clamp(pos, vw, vh, w, h)
  }
  return center(vw, vh, w, h)
}

function clampX(x, vw, w) { return Math.max(MARGIN, Math.min(x, vw - w - MARGIN)) }
function clampY(y, vh, h) { return Math.max(MARGIN, Math.min(y, vh - h - MARGIN)) }
function clamp(pos, vw, vh, w, h) {
  return { left: clampX(pos.left, vw, w), top: clampY(pos.top, vh, h) }
}
function center(vw, vh, w, h) {
  return { left: clampX((vw - w) / 2, vw, w), top: clampY((vh - h) / 2, vh, h) }
}

/* ── Tooltip ─────────────────────────────────────────────────── */
function Tooltip({ step, stepIdx, total, rect, onNext, onSkip }) {
  const ref        = useRef(null)
  const [pos, setPos] = useState(null)

  // Após render, mede altura real e recalcula posição
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const h = el.offsetHeight || TOOLTIP_H
    if (rect) {
      setPos(computePos(rect, step.prefer, h))
    } else {
      const vw = window.innerWidth
      const vh = window.innerHeight
      setPos({ left: clampX((vw - TOOLTIP_W) / 2, vw, TOOLTIP_W), top: clampY(vh / 2 - h / 2, vh, h) })
    }
  }, [rect, step])

  const posStyle = pos
    ? { left: pos.left, top: pos.top, opacity: 1 }
    : { left: -9999, top: -9999, opacity: 0 }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      style={{
        position:     'fixed',
        zIndex:       10001,
        width:        TOOLTIP_W,
        background:   '#141414',
        border:       '1px solid #2a2a2a',
        borderRadius: 16,
        padding:      '18px 20px 16px',
        boxShadow:    '0 24px 60px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.04)',
        transition:   'opacity .18s',
        pointerEvents:'all',
        userSelect:   'none',
        ...posStyle,
      }}
    >
      {/* Cabeçalho */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span style={{ fontSize:10, fontWeight:700, color:'#52525b', letterSpacing:'.08em', textTransform:'uppercase' }}>
          {stepIdx + 1} / {total}
        </span>
        <button
          onClick={onSkip}
          aria-label="Fechar tutorial"
          style={{ background:'none', border:'none', cursor:'pointer', color:'#52525b', padding:2, display:'flex', lineHeight:1 }}
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>

      {/* Conteúdo */}
      <p style={{ fontSize:14.5, fontWeight:700, color:'#f4f4f5', marginBottom:6, letterSpacing:'-.2px', lineHeight:1.3 }}>
        {step.title}
      </p>
      <p style={{ fontSize:12.5, color:'#71717a', lineHeight:1.6, marginBottom:16 }}>
        {step.desc}
      </p>

      {/* Ações */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
        <button
          onClick={onSkip}
          style={{
            background:'none', border:'none', cursor:'pointer',
            fontSize:11.5, color:'#52525b', padding:0, fontFamily:'inherit',
            flexShrink:0,
          }}
        >
          Pular tutorial
        </button>
        <button
          onClick={onNext}
          style={{
            display:'flex', alignItems:'center', gap:5, flexShrink:0,
            background:'linear-gradient(135deg,#1a7a4a,#22c55e)',
            color:'#fff', border:'none', borderRadius:9,
            padding:'8px 16px', fontSize:13, fontWeight:600,
            cursor:'pointer', fontFamily:'inherit',
          }}
        >
          {stepIdx === total - 1 ? 'Concluir' : 'Próximo'}
          {stepIdx < total - 1 && <ChevronRight size={13} strokeWidth={2.5} />}
        </button>
      </div>

      {/* Dots de progresso */}
      <div style={{ display:'flex', gap:5, justifyContent:'center', marginTop:14 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              height:     6,
              width:      i === stepIdx ? 18 : 6,
              borderRadius: 3,
              background: i === stepIdx ? '#22c55e' : '#2a2a2a',
              transition: 'width .2s ease, background .2s ease',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/* ── Main export ─────────────────────────────────────────────── */
export default function TutorialOverlay({ onDone }) {
  const [mounted, setMounted] = useState(false)
  const [step,    setStep]    = useState(0)
  const [rect,    setRect]    = useState(null)

  useEffect(() => { setMounted(true) }, [])

  const syncRect = useCallback(() => {
    setRect(elRect(STEPS[step]?.selector))
  }, [step])

  useEffect(() => {
    syncRect()
    const id = setInterval(syncRect, 300)
    return () => clearInterval(id)
  }, [syncRect])

  function next() {
    if (step >= STEPS.length - 1) { finish(); return }
    setStep(s => s + 1)
  }

  function finish() {
    try { localStorage.setItem('pointai_tutorial_done', '1') } catch {}
    onDone?.()
  }

  if (!mounted) return null

  return createPortal(
    <>
      {/* ── Spotlight ── */}
      {rect ? (
        <div
          aria-hidden="true"
          style={{
            position:   'fixed',
            zIndex:     9999,
            top:        rect.top,
            left:       rect.left,
            width:      rect.width,
            height:     rect.height,
            borderRadius: 10,
            /* box-shadow cria o fundo escuro fora da área */
            boxShadow:  '0 0 0 9999px rgba(0,0,0,.65)',
            border:     '2px solid rgba(34,197,94,.55)',
            pointerEvents: 'none',
            transition: 'top .25s ease, left .25s ease, width .25s ease, height .25s ease',
          }}
        />
      ) : (
        /* Sem elemento: overlay simples */
        <div
          aria-hidden="true"
          style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,.65)', pointerEvents:'none' }}
        />
      )}

      {/* ── Intercepta cliques fora do tooltip ── */}
      <div
        aria-hidden="true"
        style={{ position:'fixed', inset:0, zIndex:10000 }}
        onClick={e => e.stopPropagation()}
      />

      {/* ── Tooltip ── */}
      <Tooltip
        step={STEPS[step]}
        stepIdx={step}
        total={STEPS.length}
        rect={rect}
        onNext={next}
        onSkip={finish}
      />
    </>,
    document.body
  )
}
