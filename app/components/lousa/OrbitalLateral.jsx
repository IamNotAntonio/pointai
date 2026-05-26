'use client'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { BookOpen, Globe } from 'lucide-react'
import { useOrbital } from '../../lib/OrbitalContext'
import { acronym } from '../../lib/acronym'

/*
 * OrbitalLateral — small floating widget at the lousa's bottom-left.
 *
 * Centre bubble (80px) shows an icon + acronym derived from the active
 * matéria; cross-fades when the matéria changes. Six 52px squircles
 * orbit at radius 110, each with its label rendered just outside the
 * ring. Clicking a chip dispatches to OrbitalContext — the drawer /
 * fullscreen are rendered by the dormant OrbitalItem instances in Lousa.
 *
 * Props:
 *   materia   - active matéria string ('geral' or matéria name)
 *   isProUser - boolean (gates the PRO badge)
 *   dimmed    - boolean (fades widget to 0.4 when chat input is focused)
 *   items     - array of { id, Icon, label, shortLabel, isPro }
 */
const CONTAINER = 300
const CENTER = CONTAINER / 2
const RADIUS = 110
const NODE_SIZE = 52
const LABEL_RADIUS = RADIUS + NODE_SIZE / 2 + 14

export default function OrbitalLateral({ materia, isProUser, dimmed = false, items }) {
  const orbital = useOrbital()
  const reduce = useReducedMotion()
  const isGeral = materia === 'geral'
  const acr = acronym(materia)
  const centerLabel = isGeral ? 'Chat Geral' : materia

  return (
    <div
      className="orbital-lateral"
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: CONTAINER,
        height: CONTAINER,
        zIndex: 6,
        overflow: 'visible',
        opacity: dimmed ? 0.4 : 1,
        pointerEvents: dimmed ? 'none' : 'auto',
        transition: 'opacity .25s ease',
      }}
      aria-label="Ferramentas da matéria"
    >
      {/* Centre bubble */}
      <AnimatePresence mode="wait">
        <motion.div
          key={materia}
          className="ol-center"
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [1, 1.02, 1] }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={reduce ? { duration: 0 } : {
            opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            position: 'absolute',
            left: CENTER,
            top: CENTER,
            transform: 'translate(-50%, -50%)',
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#161616',
            border: '1px solid rgba(34,197,94,.28)',
            boxShadow: '0 0 0 4px rgba(34,197,94,.06), 0 0 24px rgba(34,197,94,.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 3,
            willChange: 'transform',
          }}
          title={centerLabel}
        >
          {isGeral
            ? <Globe size={22} strokeWidth={1.7} style={{ color: '#22c55e' }} />
            : <BookOpen size={20} strokeWidth={1.7} style={{ color: '#22c55e' }} />
          }
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.06em',
            color: '#22c55e',
            lineHeight: 1,
          }}>
            {acr}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* 6 nodes */}
      {items.map((item, i) => {
        const angle = ((i * 60 - 90) * Math.PI) / 180
        const cosA = Math.cos(angle)
        const sinA = Math.sin(angle)
        const x = CENTER + RADIUS * cosA
        const y = CENTER + RADIUS * sinA
        const lx = CENTER + LABEL_RADIUS * cosA
        const ly = CENTER + LABEL_RADIUS * sinA
        const floatDelay = (i * 0.55) % 3
        const floatDur = reduce ? 0 : 4 + (i % 2) * 0.6
        const proLocked = item.isPro && !isProUser

        return (
          <div key={item.id} style={{ position: 'absolute', left: 0, top: 0, width: 0, height: 0 }}>
            <motion.button
              type="button"
              className="ol-node"
              onClick={() => orbital.open(item.id)}
              animate={reduce ? {} : { y: [0, -2, 0, 2, 0] }}
              transition={reduce ? {} : {
                duration: floatDur,
                repeat: Infinity,
                delay: floatDelay,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.96 }}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                transform: 'translate(-50%, -50%)',
                width: NODE_SIZE,
                height: NODE_SIZE,
                borderRadius: 16,
                background: '#161616',
                border: '1px solid rgba(255,255,255,.08)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#d4d4d8',
                cursor: 'pointer',
                fontFamily: 'inherit',
                willChange: 'transform',
                transition: 'border-color .18s, color .18s, box-shadow .18s',
              }}
              aria-label={item.label}
            >
              {proLocked && (
                <span style={{
                  position: 'absolute', top: 4, right: 4,
                  fontSize: 7, fontWeight: 800, letterSpacing: '.06em',
                  color: '#22c55e', background: 'rgba(26,122,74,.18)',
                  border: '1px solid rgba(34,197,94,.32)',
                  padding: '0 4px', borderRadius: 3, lineHeight: 1.4,
                }}>PRO</span>
              )}
              <item.Icon size={18} strokeWidth={1.7} />
            </motion.button>

            <span
              className="ol-label"
              style={{
                position: 'absolute',
                left: lx,
                top: ly,
                transform: 'translate(-50%, -50%)',
                fontSize: 10.5,
                fontWeight: 500,
                color: '#a1a1aa',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                letterSpacing: '.01em',
              }}
              aria-hidden
            >
              {item.shortLabel || item.label}
            </span>
          </div>
        )
      })}

      <style>{`
        .orbital-lateral .ol-node:hover{border-color:rgba(34,197,94,.45) !important;color:#22c55e !important;box-shadow:0 0 18px rgba(34,197,94,.18) !important}
      `}</style>
    </div>
  )
}
