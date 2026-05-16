'use client'

const FEATURES = [
  { icon: '💬', text: 'Mensagens ilimitadas todos os dias' },
  { icon: '🔬', text: 'Análise de provas, tarefas e anotações' },
  { icon: '📋', text: 'Relatório semanal personalizado com IA' },
  { icon: '🧠', text: 'Memória de conversas entre sessões' },
  { icon: '⚡', text: 'Respostas com prioridade máxima' },
]

export default function UpgradeModal({ onClose, mensagensHoje = 20, limite = 20 }) {
  return (
    <div className="upgrade-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="upgrade-modal">
        <div className="upgrade-gradient" />

        <div className="upgrade-modal-body">
          <p className="upgrade-icon">✨</p>
          <h2 className="upgrade-title">Point.AI Pro</h2>
          <p className="upgrade-subtitle">
            Você usou as {limite} mensagens de hoje.<br />
            Assine o Pro para estudar sem limites.
          </p>

          <div className="upgrade-features">
            {FEATURES.map(({ icon, text }) => (
              <div key={text} className="upgrade-feature">
                <span className="upgrade-feature-icon">{icon}</span>
                <span className="upgrade-feature-text">{text}</span>
              </div>
            ))}
          </div>

          <div className="upgrade-price-wrap">
            <p className="upgrade-price">R$14<span>,90</span></p>
            <p className="upgrade-price-period">por mês · cancele quando quiser</p>
          </div>

          <button className="upgrade-btn-primary">✨ Assinar Pro agora</button>
          <button className="upgrade-btn-ghost" onClick={onClose}>Continuar grátis</button>
          <p className="upgrade-notice">Pagamento integrado em breve · volte amanhã para mais 20 mensagens</p>
        </div>
      </div>
    </div>
  )
}
