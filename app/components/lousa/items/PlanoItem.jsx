'use client'
import { Brain, Plus } from 'lucide-react'
import { FullscreenSkeleton, ProPaywall, openPlansModal, sharedItemCss } from './_shared'

export function getPlanoBadge() {
  return null
}

export function PlanoDrawer({ isProUser }) {
  if (!isProUser) {
    return (
      <>
        <ProPaywall
          Icon={Brain}
          title="Plano de Estudos"
          description="Cronograma personalizado, gerado pela IA com base nas suas provas, tarefas e disponibilidade real de horários."
          bullets={[
            'Plano semanal gerado automaticamente',
            'Ajuste dinâmico conforme você marca tarefas como feitas',
            'Lembretes por tipo de tarefa (revisão, exercício, leitura)',
          ]}
          onSeePlans={openPlansModal}
        />
        <style>{sharedItemCss}</style>
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
      <Brain size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
      <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
        Nenhum plano de estudos criado ainda.
      </p>
      <button className="lousa-cta-btn">
        <Plus size={14} strokeWidth={2} /> Gerar plano semanal
      </button>
      <style>{sharedItemCss}</style>
    </div>
  )
}

export function PlanoFullscreen() {
  return (
    <FullscreenSkeleton
      Icon={Brain}
      title="Cronograma Personalizado — em construção"
      bullets={[
        'Geração de plano semanal a partir das provas e tarefas no calendário',
        'Rebalanceamento automático quando você atrasa ou adianta',
        'Distribuição inteligente entre revisão, leitura e exercícios',
        'Histórico de aderência ao plano com insights da IA',
      ]}
    />
  )
}
