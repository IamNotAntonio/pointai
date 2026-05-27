'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { ChevronDown, X } from 'lucide-react'
import { useBento } from '../../lib/BentoContext'
import { CerebroCard, CerebroFullscreen } from './items/CerebroPointItem'
import { NotasCard, NotasFullscreen } from './items/NotasItem'
import { CalendarioCard, CalendarioFullscreen } from './items/CalendarioItem'
import { EvolucaoCard, EvolucaoFullscreen } from './items/EvolucaoItem'
import { AnaliseCard, AnaliseFullscreen } from './items/AnaliseItem'
import { SimuladoCard, SimuladoFullscreen } from './items/SimuladoItem'

const STORAGE_KEY = 'pointai_bento_expanded'
const EASE = [0.22, 1, 0.36, 1]

/*
 * Layout:
 *   Row 1: Cérebro (2 cols) + Notas (2 cols) → 4 cols
 *   Row 2: Calendário + Evolução + Análise + Simulado (1 col each)
 */
const ITEMS = [
  { id: 'cerebro',    Card: CerebroCard,    Fullscreen: CerebroFullscreen,    span: 2 },
  { id: 'notas',      Card: NotasCard,      Fullscreen: NotasFullscreen,      span: 2 },
  { id: 'calendario', Card: CalendarioCard, Fullscreen: CalendarioFullscreen, span: 1 },
  { id: 'evolucao',   Card: EvolucaoCard,   Fullscreen: EvolucaoFullscreen,   span: 1 },
  { id: 'analise',    Card: AnaliseCard,    Fullscreen: AnaliseFullscreen,    span: 1, isPro: true },
  { id: 'simulado',   Card: SimuladoCard,   Fullscreen: SimuladoFullscreen,   span: 1, isPro: true },
]

export default function BentoGrid({ materia, notas, eventos, isProUser }) {
  const bento = useBento()
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState(true)
  const [hydrated, setHydrated] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY)
      if (v != null) {
        setExpanded(v === 'true')
      } else {
        // No saved preference: default expanded, but collapse on short viewports.
        const shortViewport = typeof window !== 'undefined' && window.innerHeight < 700
        setExpanded(!shortViewport)
      }
    } catch {}
    setHydrated(true)
    setMounted(true)
  }, [])

  function toggle() {
    setExpanded(e => {
      const next = !e
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }

  const activeItem = ITEMS.find(i => i.id === bento.activeItem)

  return (
    <>
      <style>{BENTO_CSS}</style>

      <section className="bento-section" aria-label="Suas funções">
        <button
          type="button"
          className="bento-header"
          onClick={toggle}
          aria-label={expanded ? 'Recolher suas funções' : 'Expandir suas funções'}
          aria-expanded={expanded}
        >
          <motion.span
            className="bento-header-chev"
            animate={{ rotate: expanded ? 0 : -90 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
            aria-hidden
          >
            <ChevronDown size={14} strokeWidth={2} />
          </motion.span>
          <span className="bento-header-label">Suas funções</span>
        </button>

        <motion.div
          className="bento-grid-wrap"
          initial={false}
          animate={hydrated ? {
            height: expanded ? 'auto' : 0,
            opacity: expanded ? 1 : 0,
          } : undefined}
          transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
          style={{ overflow: 'hidden' }}
        >
          <div className="bento-grid">
            {ITEMS.map((item, i) => (
              <motion.div
                key={item.id}
                className={`bento-cell bento-cell-span-${item.span}`}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={expanded ? { opacity: 1, y: 0 } : undefined}
                transition={reduce ? { duration: 0 } : { delay: i * 0.05, duration: 0.3, ease: EASE }}
              >
                <item.Card
                  materia={materia}
                  notas={notas}
                  eventos={eventos}
                  isProUser={isProUser}
                  onClick={() => bento.openItem(item.id)}
                />
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* Fullscreen overlay rendered via portal into document.body —
          escapes the TopBar's sticky stacking context, so the X button
          actually receives clicks regardless of zoom level. */}
      {mounted && createPortal(
        <AnimatePresence>
          {activeItem && (
            <>
              <motion.div
                key="bento-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={bento.closeItem}
                style={{
                  position: 'fixed', inset: 0, zIndex: 100,
                  background: 'rgba(0,0,0,.75)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                }}
              />
              <motion.div
                key={`bento-fs-${activeItem.id}`}
                layoutId={`panel-${activeItem.id}`}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.7 }}
                style={{
                  position: 'fixed',
                  inset: 32,
                  background: '#0d0d0d',
                  border: '1px solid rgba(255,255,255,.08)',
                  borderRadius: 20,
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  zIndex: 110,
                  boxShadow: '0 40px 100px rgba(0,0,0,.7)',
                  pointerEvents: 'auto',
                }}
                className="bento-fs"
              >
                <header className="bento-fs-toolbar">
                  <button
                    type="button"
                    onClick={bento.closeItem}
                    className="bento-fs-close"
                    aria-label="Fechar"
                  >
                    <X size={18} strokeWidth={1.8} />
                  </button>
                </header>
                <div className="bento-fs-body">
                  <activeItem.Fullscreen />
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

const BENTO_CSS = `
  .bento-section{width:100%;max-width:1100px;margin:0 auto;padding:0 16px}
  /* Single clickable button: chevron + label grouped, generous hit area */
  .bento-header{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;margin:0 0 8px -4px;background:none;border:none;border-radius:8px;cursor:pointer;color:#71717a;font-family:inherit;transition:background .15s,color .15s}
  .bento-header:hover{background:rgba(255,255,255,.04);color:#a1a1aa}
  .bento-header-chev{display:inline-flex;align-items:center;justify-content:center;color:inherit;width:14px;height:14px}
  .bento-header-label{font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:inherit;line-height:1}
  .bento-grid-wrap{will-change:height,opacity}
  .bento-grid{display:grid;grid-template-columns:repeat(4, 1fr);gap:10px;padding-bottom:4px}
  .bento-cell-span-2{grid-column:span 2}
  .bento-cell-span-1{grid-column:span 1}

  /* Uniform card surface: same border-radius, border, bg, hover across all 6 */
  .bento-card{position:relative;width:100%;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:16px;padding:14px;min-height:110px;cursor:pointer;text-align:left;color:#d4d4d8;font-family:inherit;transition:background .15s,border-color .15s,box-shadow .15s;overflow:hidden;display:block}
  .bento-card:hover{background:rgba(255,255,255,.05);border-color:rgba(34,197,94,.3);box-shadow:0 0 20px rgba(34,197,94,.08)}
  .bento-card.bento-card-locked{opacity:.72}
  .bento-card.bento-card-locked:hover{opacity:.9}
  .bento-card-large{min-height:120px;padding:16px}
  .bento-card-icon-wrap{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;background:rgba(34,197,94,.10);color:#22c55e;border:1px solid rgba(34,197,94,.18);margin-bottom:6px}
  .bento-card-title{font-size:14px;font-weight:700;color:#f4f4f5;letter-spacing:-.01em;margin:0 0 4px}
  .bento-card-mega{font-size:29px;font-weight:800;letter-spacing:-.025em;line-height:1;margin:2px 0 4px}
  .bento-card-strong{font-size:14px;font-weight:700;color:#e4e4e7;margin:6px 0 4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .bento-card-stat{font-size:12.5px;color:#a1a1aa;line-height:1.4}
  .bento-card-stat strong{color:#e4e4e7;font-weight:700}
  .bento-card-sub{font-size:11.5px;color:#71717a;line-height:1.4}
  .bento-card-viz{flex-shrink:0;opacity:.85}
  .bento-card-pro{position:absolute;top:10px;right:10px;font-size:8.5px;font-weight:800;letter-spacing:.08em;color:#fbbf24;background:rgba(251,191,36,.10);border:1px solid rgba(251,191,36,.28);padding:2px 6px;border-radius:99px;line-height:1.3}
  .bento-card-lock{position:absolute;bottom:10px;right:10px;color:#71717a;display:inline-flex}

  .bento-fs-toolbar{display:flex;justify-content:flex-end;padding:12px 14px 0;flex-shrink:0;position:absolute;top:0;right:0;z-index:2}
  .bento-fs-close{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);color:#a1a1aa;width:34px;height:34px;border-radius:10px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s,border-color .15s}
  .bento-fs-close:hover{background:rgba(255,255,255,.08);color:#e4e4e7;border-color:rgba(255,255,255,.16)}
  .bento-fs-body{flex:1;overflow-y:auto;min-height:0}

  @media (max-width:1023px){
    .bento-section{padding:0 12px}
    .bento-grid{grid-template-columns:repeat(2, 1fr)}
    .bento-cell-span-2{grid-column:span 2}
    .bento-cell-span-1{grid-column:span 1}
  }
  @media (max-width:639px){
    .bento-grid{grid-template-columns:1fr}
    .bento-cell-span-2,.bento-cell-span-1{grid-column:span 1}
  }
  @media (max-width:767px){
    .bento-fs{inset:0 !important;border-radius:0 !important;border:none !important}
  }
`
