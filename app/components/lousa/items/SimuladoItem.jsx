'use client'
import { ClipboardList, Plus } from 'lucide-react'
import { FullscreenSkeleton, ProPaywall, openPlansModal, sharedItemCss } from './_shared'

export function getSimuladoBadge() {
  return null
}

export function SimuladoDrawer({ isProUser }) {
  if (!isProUser) {
    return (
      <>
        <ProPaywall
          Icon={ClipboardList}
          title="Simulado Inteligente"
          description="A IA gera simulados personalizados com base nas suas matérias e tópicos estudados — sem reciclar questões antigas."
          bullets={[
            'Questões inéditas geradas pela IA',
            'Correção automática com explicação detalhada',
            'Histórico de desempenho por matéria e tópico',
          ]}
          onSeePlans={openPlansModal}
        />
        <style>{sharedItemCss}</style>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
      <ClipboardList size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
      <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
        Nenhum simulado feito ainda. Que tal o primeiro?
      </p>
      <button className="lousa-cta-btn">
        <Plus size={14} strokeWidth={2} /> Criar novo simulado
      </button>
      <style>{sharedItemCss}</style>
    </div>
  )
}

export function SimuladoFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={ClipboardList}
      title="Configurador de Simulado — em construção"
      bullets={[
        'Escolha matéria, tópico, dificuldade e quantidade de questões',
        'Geração instantânea pela IA com base no seu histórico',
        'Correção comentada questão por questão',
        'Histórico exportável em PDF',
      ]}
    />
  )
}
