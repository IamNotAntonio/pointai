'use client'
import { TrendingUp, Flame } from 'lucide-react'
import { DrawerCard, FullscreenSkeleton, sharedItemCss } from './_shared'

function Sparkline({ valores, cor = '#22c55e' }) {
  if (!valores || valores.length < 2) return null
  const W = 240, H = 56, PAD = 4
  const min = Math.min(...valores)
  const max = Math.max(...valores)
  const span = max - min || 1
  const step = (W - PAD * 2) / (valores.length - 1)
  const pts = valores.map((v, i) => {
    const x = PAD + i * step
    const y = H - PAD - ((v - min) / span) * (H - PAD * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: H, display: 'block' }}>
      <polyline points={pts} fill="none" stroke={cor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function getEvolucaoBadge() {
  // D.3 wires real data; placeholder for now.
  return '+12% este mês'
}

export function EvolucaoDrawer({ materia }) {
  // Mocked values until D.3+ pulls real progress data
  const valores = [3.5, 4.2, 5.1, 5.8, 6.7, 7.5, 8.2]
  const isGeral = materia === 'geral'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <DrawerCard label={isGeral ? 'Evolução geral' : `Evolução em ${materia}`}>
        <Sparkline valores={valores} />
        <p style={{ fontSize: 12, color: '#a1a1aa', marginTop: 8 }}>
          Últimas 7 semanas — média subiu de <strong style={{ color: '#22c55e' }}>3.5</strong> pra <strong style={{ color: '#22c55e' }}>8.2</strong>.
        </p>
      </DrawerCard>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <MiniStat valor="14h" label="Estudadas" />
        <MiniStat valor="67%" label="Coberto" />
        <MiniStat valor="5d" label="Streak" Icon={Flame} accent="#fbbf24" />
      </div>

      <p style={{ fontSize: 12, color: '#71717a', textAlign: 'center', padding: '6px 0', lineHeight: 1.5 }}>
        Dados completos chegam em breve.
      </p>

      <style>{sharedItemCss}</style>
    </div>
  )
}

function MiniStat({ valor, label, Icon, accent = '#22c55e' }) {
  return (
    <div style={{
      background: '#101010', border: '1px solid #1a1a1a', borderRadius: 10,
      padding: '12px 10px', textAlign: 'center',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: accent }}>
        {Icon && <Icon size={12} strokeWidth={2} />}
        <p style={{ fontSize: 18, fontWeight: 800, color: '#f4f4f5', letterSpacing: '-.02em', lineHeight: 1 }}>{valor}</p>
      </div>
      <p style={{ fontSize: 10.5, color: '#71717a', marginTop: 5, fontWeight: 600 }}>{label}</p>
    </div>
  )
}

export function EvolucaoFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={TrendingUp}
      title="Minha Evolução — em construção"
      bullets={[
        'Evolução por tópico dentro de cada matéria',
        'Comparativo entre matérias em radar chart',
        'Relatório semanal automático com insights da IA',
        'Streaks, horas estudadas e metas pessoais',
      ]}
    />
  )
}
