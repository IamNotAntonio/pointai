'use client'
import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { BookOpen, Globe } from 'lucide-react'
import { useOrbital } from '../../lib/OrbitalContext'
import { acronym } from '../../lib/acronym'

/*
 * OrbitalLateral — floating widget at the lousa's bottom-left.
 *
 * Scales responsively across three breakpoints so it never collides
 * with the chat card:
 *   ≥1280px viewport: 300px widget
 *    1180–1279:        260px widget
 *    1024–1179:        220px widget
 *   <1024px:           hidden (mobile dock takes over, handled in Lousa)
 */
function getScale(w) {
  if (w >= 1280) return {
    container: 300, centerSize: 80, radius: 115, chipSize: 64,
    iconSize: 18, labelSize: 9.5, offset: 24,
  }
  if (w >= 1180) return {
    container: 260, centerSize: 70, radius: 100, chipSize: 56,
    iconSize: 16, labelSize: 9, offset: 20,
  }
  return {
    container: 220, centerSize: 60, radius: 85, chipSize: 48,
    iconSize: 14, labelSize: 8.5, offset: 16,
  }
}

export default function OrbitalLateral({ materia, isProUser, dimmed = false, items }) {
  const orbital = useOrbital()
  const reduce = useReducedMotion()
  const [vw, setVw] = useState(() => (typeof window === 'undefined' ? 1440 : window.innerWidth))

  useEffect(() => {
    function onResize() { setVw(window.innerWidth) }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const s = getScale(vw)
  const center = s.container / 2

  const isGeral = materia === 'geral'
  const acr = acronym(materia)
  const centerLabel = isGeral ? 'Chat Geral' : materia

  return (
    <div
      className="orbital-lateral"
      style={{
        position: 'absolute',
        bottom: s.offset,
        left: s.offset,
        width: s.container,
        height: s.container,
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
          initial={reduce ? false : { opacity: 0, scale: 0.92 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, scale: [1, 1.02, 1] }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
          transition={reduce ? { duration: 0 } : {
            opacity: { duration: 0.25, ease: [0.22, 1, 0.36, 1] },
            scale: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            position: 'absolute',
            left: center,
            top: center,
            transform: 'translate(-50%, -50%)',
            width: s.centerSize,
            height: s.centerSize,
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
            ? <Globe size={s.centerSize >= 80 ? 22 : 18} strokeWidth={1.7} style={{ color: '#22c55e' }} />
            : <BookOpen size={s.centerSize >= 80 ? 20 : 16} strokeWidth={1.7} style={{ color: '#22c55e' }} />
          }
          <span style={{
            fontSize: s.centerSize >= 80 ? 11 : 9.5,
            fontWeight: 800,
            letterSpacing: '.06em',
            color: '#22c55e',
            lineHeight: 1,
          }}>
            {acr}
          </span>
        </motion.div>
      </AnimatePresence>

      {/* 6 nodes — chip 64×64 (or scaled), icon + label inside */}
      {items.map((item, i) => {
        const angle = ((i * 60 - 90) * Math.PI) / 180
        const x = center + s.radius * Math.cos(angle)
        const y = center + s.radius * Math.sin(angle)
        const floatDelay = (i * 0.55) % 3
        const floatDur = reduce ? 0 : 4 + (i % 2) * 0.6
        const proLocked = item.isPro && !isProUser

        return (
          <motion.button
            key={item.id}
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
              width: s.chipSize,
              height: s.chipSize,
              borderRadius: 18,
              background: '#161616',
              border: '1px solid rgba(255,255,255,.08)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px 4px',
              gap: 3,
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
                position: 'absolute', top: 3, right: 3,
                fontSize: 7, fontWeight: 800, letterSpacing: '.06em',
                color: '#22c55e', background: 'rgba(26,122,74,.18)',
                border: '1px solid rgba(34,197,94,.32)',
                padding: '0 4px', borderRadius: 3, lineHeight: 1.4,
              }}>PRO</span>
            )}
            <item.Icon size={s.iconSize} strokeWidth={1.7} />
            <span className="ol-node-label" style={{
              fontSize: s.labelSize,
              fontWeight: 600,
              lineHeight: 1.1,
              letterSpacing: '.01em',
              color: '#d4d4d8',
              maxWidth: '100%',
              padding: '0 2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              transition: 'color .18s',
            }}>
              {item.shortLabel || item.label}
            </span>
          </motion.button>
        )
      })}

      <style>{`
        .orbital-lateral .ol-node:hover{border-color:rgba(34,197,94,.45) !important;color:#22c55e !important;box-shadow:0 0 18px rgba(34,197,94,.18) !important}
        .orbital-lateral .ol-node:hover .ol-node-label{color:#22c55e !important}
      `}</style>
    </div>
  )
}
