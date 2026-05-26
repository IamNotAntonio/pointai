'use client'
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

/*
 * GradientDots — background canvas for the lousa.
 *
 * Adapted from https://21st.dev/r/efferd/gradient-dots (TSX, framer-motion)
 * — converted to JSX, reduced to a single brand-green halo that drifts over
 * a static dot grid. CSS-only (radial-gradient + animated background-position),
 * no <canvas>, no DPR concerns.
 *
 * Pauses the halo animation while the tab is hidden so the page doesn't burn
 * frames in the background. Reduce-motion users see a static gradient.
 */
export default function GradientDots({
  dotSize = 1.4,
  spacing = 28,
  duration = 14,
} = {}) {
  const reduce = useReducedMotion()
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    function onVis() { setPaused(document.hidden) }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const dotLayer = `radial-gradient(circle at 50% 50%, rgba(34,197,94,.07) 0 ${dotSize}px, transparent ${dotSize + 0.3}px)`
  const haloLayer = 'radial-gradient(circle at 50% 50%, rgba(34,197,94,.13), rgba(34,197,94,.05) 35%, transparent 60%)'

  return (
    <motion.div
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        backgroundColor: '#0a0a0a',
        backgroundImage: `${dotLayer}, ${haloLayer}`,
        backgroundSize: `${spacing}px ${spacing}px, 220% 220%`,
        backgroundPosition: '0 0, 30% 40%',
        backgroundRepeat: 'repeat, no-repeat',
      }}
      animate={reduce || paused ? {} : {
        backgroundPosition: [
          '0 0, 30% 40%',
          '0 0, 70% 60%',
          '0 0, 40% 70%',
          '0 0, 30% 40%',
        ],
      }}
      transition={{
        duration,
        ease: 'easeInOut',
        repeat: Infinity,
      }}
    />
  )
}
