'use client'
import { motion, useReducedMotion } from 'motion/react'
import { Brain } from 'lucide-react'
import { FullscreenSkeleton, sharedItemCss } from './_shared'

/* Neurons + synapses data used in both card mini-viz and fullscreen teaser */
export const NEURONS = [
  { cx: 60,  cy: 50,  r: 6, delay: 0.0 },
  { cx: 130, cy: 30,  r: 8, delay: 0.3 },
  { cx: 200, cy: 60,  r: 5, delay: 0.6 },
  { cx: 280, cy: 40,  r: 7, delay: 0.9 },
  { cx: 90,  cy: 110, r: 5, delay: 0.4 },
  { cx: 170, cy: 130, r: 9, delay: 0.7 },
  { cx: 250, cy: 110, r: 6, delay: 1.0 },
  { cx: 310, cy: 140, r: 5, delay: 1.3 },
]

export const SYNAPSES = [
  [0, 1], [1, 2], [2, 3],
  [4, 5], [5, 6], [6, 7],
  [1, 5], [3, 6],
]

function NeuronsSvg({ viewBox = '0 0 360 180', height = 60, reduce }) {
  return (
    <svg viewBox={viewBox} height={height} width="auto" style={{ display: 'block', maxWidth: '100%' }} aria-hidden>
      {SYNAPSES.map(([a, b], i) => {
        const A = NEURONS[a]; const B = NEURONS[b]
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
            duration: 2.5, repeat: Infinity, delay: n.delay, ease: 'easeInOut',
          }}
          style={{ transformOrigin: `${n.cx}px ${n.cy}px`, transformBox: 'fill-box' }}
        />
      ))}
    </svg>
  )
}

/* Mock values until the real graph is wired in D.4 */
const MOCK = { conceitos: 8, conexoes: 14 }

export function CerebroCard({ onClick }) {
  const reduce = useReducedMotion()
  return (
    <motion.button
      type="button"
      layoutId="panel-cerebro"
      onClick={onClick}
      className="bento-card bento-card-large"
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.99 }}
      aria-label="Abrir Cérebro Point"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bento-card-icon-wrap">
            <Brain size={22} strokeWidth={1.7} />
          </div>
          <p className="bento-card-title">Cérebro Point</p>
          <p className="bento-card-stat">
            <strong>{MOCK.conceitos}</strong> conceitos · <strong>{MOCK.conexoes}</strong> conexões
          </p>
        </div>
        <div className="bento-card-viz">
          <NeuronsSvg height={64} reduce={reduce} />
        </div>
      </div>
    </motion.button>
  )
}

export function CerebroFullscreen() {
  const reduce = useReducedMotion()
  return (
    <div style={{ maxWidth: 720, margin: '32px auto 0' }}>
      <div style={{
        background: '#0c0c0c',
        border: '1px solid #161616',
        borderRadius: 16,
        height: 220,
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 22,
      }}>
        <NeuronsSvg height={200} reduce={reduce} />
      </div>
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
      <style>{sharedItemCss}</style>
    </div>
  )
}
