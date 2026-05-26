'use client'
import { motion, useReducedMotion } from 'motion/react'
import { Brain } from 'lucide-react'
import { FullscreenSkeleton, sharedItemCss } from './_shared'

/* Neurônios pulsando — teaser visual do Cérebro Point. */
const NEURONS = [
  { cx: 60,  cy: 50,  r: 6, delay: 0.0 },
  { cx: 130, cy: 30,  r: 8, delay: 0.3 },
  { cx: 200, cy: 60,  r: 5, delay: 0.6 },
  { cx: 280, cy: 40,  r: 7, delay: 0.9 },
  { cx: 90,  cy: 110, r: 5, delay: 0.4 },
  { cx: 170, cy: 130, r: 9, delay: 0.7 },
  { cx: 250, cy: 110, r: 6, delay: 1.0 },
  { cx: 310, cy: 140, r: 5, delay: 1.3 },
]

// Synapses: (a, b) pairs — indices into NEURONS
const SYNAPSES = [
  [0, 1], [1, 2], [2, 3],
  [4, 5], [5, 6], [6, 7],
  [1, 5], [3, 6],
]

export function getCerebroBadge() {
  return 'Em construção'
}

export function CerebroDrawer() {
  const reduce = useReducedMotion()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{
        background: '#0c0c0c',
        border: '1px solid #161616',
        borderRadius: 14,
        height: 200,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 360 180"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
          aria-hidden
        >
          {/* Synapses behind neurons */}
          {SYNAPSES.map(([a, b], i) => {
            const A = NEURONS[a]
            const B = NEURONS[b]
            return (
              <line
                key={i}
                x1={A.cx} y1={A.cy} x2={B.cx} y2={B.cy}
                stroke="rgba(34,197,94,.22)"
                strokeWidth="1"
                strokeDasharray="3 4"
              />
            )
          })}

          {/* Neurons */}
          {NEURONS.map((n, i) => (
            <motion.circle
              key={i}
              cx={n.cx}
              cy={n.cy}
              r={n.r}
              fill="#22c55e"
              initial={reduce ? false : { opacity: 0.4, scale: 1 }}
              animate={reduce ? { opacity: 0.85 } : { opacity: [0.4, 1, 0.4], scale: [1, 1.15, 1] }}
              transition={reduce ? { duration: 0 } : {
                duration: 2.5,
                repeat: Infinity,
                delay: n.delay,
                ease: 'easeInOut',
              }}
              style={{ transformOrigin: `${n.cx}px ${n.cy}px`, transformBox: 'fill-box' }}
            />
          ))}
        </svg>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontSize: 13.5, color: '#d4d4d8', lineHeight: 1.65 }}>
          Conforme você usa o Point — conversa no chat, sobe materiais, faz exercícios —
          seu cérebro cresce aqui. Cada conceito vira um neurônio, cada relação vira uma sinapse.
        </p>

        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'Mapeamento automático de conceitos pelas conversas',
            'Conexões entre tópicos da mesma matéria',
            'Filtros: lacunas, mais estudados, recentes',
          ].map((b, i) => (
            <li key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', fontSize: 12.5, color: '#a1a1aa', lineHeight: 1.55 }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#22c55e', marginTop: 8, flexShrink: 0 }} />
              {b}
            </li>
          ))}
        </ul>
      </div>

      <style>{sharedItemCss}</style>
    </div>
  )
}

export function CerebroFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={Brain}
      title="Cérebro Point — em construção"
      bullets={[
        'Visualização interativa de todo o conhecimento construído com o Point',
        'Filtros por matéria, recência e profundidade',
        'Importação direta de notas do Obsidian (pós-launch)',
        'Modo de estudo: a IA identifica lacunas e sugere o que revisar',
      ]}
    />
  )
}
