'use client'
import { useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react'

export default function ContainerScroll({ children, maxWidth = 1200 }) {
  const ref = useRef(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 85%', 'center center'],
  })

  const rotateX = useTransform(scrollYProgress, [0, 1], [22, 0])
  const scale = useTransform(scrollYProgress, [0, 1], [1.06, 1])
  const y = useTransform(scrollYProgress, [0, 1], [0, -40])

  if (reduce) {
    return (
      <div ref={ref} style={{ maxWidth, margin: '0 auto', padding: '0 24px' }}>
        {children}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={{
        perspective: 1400,
        maxWidth,
        margin: '0 auto',
        padding: '0 24px',
      }}
    >
      <motion.div
        style={{
          rotateX,
          scale,
          y,
          transformPerspective: 1400,
          transformStyle: 'preserve-3d',
          transformOrigin: 'center top',
          willChange: 'transform',
        }}
      >
        {children}
      </motion.div>
    </div>
  )
}
