'use client'
import { useState } from 'react'
import { MessageSquare, BookOpen, ClipboardList, Zap, TrendingUp, Sparkles, X } from 'lucide-react'

const FEATURES = [
  { Icon: MessageSquare, text: 'Mensagens ilimitadas todos os dias' },
  { Icon: BookOpen,       text: 'Análise de provas, tarefas e anotações' },
  { Icon: ClipboardList,  text: 'Relatório semanal personalizado com IA' },
  { Icon: TrendingUp,     text: 'Memória de conversas entre sessões' },
  { Icon: Zap,            text: 'Respostas com prioridade máxima' },
]

async function getUserInfo() {
  try {
    const { getUser, getUserId } = await import('../lib/db')
    const user = await getUser()
    const perfil = JSON.parse(localStorage.getItem('pointai_perfil') || '{}')
    return {
      email:  user?.email || '',
      nome:   perfil.nome || '',
      userId: user?.id || getUserId(),
    }
  } catch {
    return { email: '', nome: '', userId: '' }
  }
}

export default function UpgradeModal({ onClose, mensagensHoje = 20, limite = 20 }) {
  const [carregando, setCarregando] = useState(false)
  const [erro,       setErro]       = useState(null)
  const [plano,      setPlano]      = useState('mensal')

  async function assinar() {
    setCarregando(true)
    setErro(null)
    try {
      const { email, nome, userId } = await getUserInfo()
      if (!email) {
        setErro('Faça login para assinar. Recarregue a página e tente novamente.')
        setCarregando(false)
        return
      }

      const resp = await fetch('/api/assinar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano, userId, email, nome }),
      })

      const data = await resp.json()

      if (data.erro) {
        setErro(data.erro)
        setCarregando(false)
        return
      }

      // Redirect to Mercado Pago checkout
      window.location.href = data.init_point
    } catch (e) {
      setErro('Erro de conexão. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="upgrade-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="upgrade-modal">
        <div className="upgrade-gradient" />

        <div className="upgrade-modal-body">
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 4 }}
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={2} />
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Sparkles size={32} strokeWidth={1.5} style={{ color: '#22c55e' }} />
          </div>
          <h2 className="upgrade-title">Point.AI Pro</h2>
          <p className="upgrade-subtitle">
            Você usou as {limite} mensagens de hoje.<br />
            Assine o Pro para estudar sem limites.
          </p>

          <div className="upgrade-features">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="upgrade-feature">
                <Icon size={14} strokeWidth={1.8} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span className="upgrade-feature-text">{text}</span>
              </div>
            ))}
          </div>

          {/* Plan toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, background: 'var(--surface-2)', borderRadius: 12, padding: 4 }}>
            {[
              { id: 'mensal',    label: 'Mensal',    preco: 'R$14,90/mês' },
              { id: 'semestral', label: 'Semestral', preco: 'R$59,90/6m', badge: '-33%' },
            ].map(p => (
              <button
                key={p.id}
                onClick={() => setPlano(p.id)}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none', cursor: 'pointer',
                  background: plano === p.id ? 'var(--surface)' : 'transparent',
                  color: plano === p.id ? 'var(--text-1)' : 'var(--text-4)',
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  boxShadow: plano === p.id ? 'var(--shadow)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {p.label}
                {p.badge && (
                  <span style={{ marginLeft: 4, background: '#1a7a4a', color: '#86efac', borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 700 }}>
                    {p.badge}
                  </span>
                )}
                <br />
                <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-4)' }}>{p.preco}</span>
              </button>
            ))}
          </div>

          <div className="upgrade-price-wrap">
            <p className="upgrade-price">
              {plano === 'mensal' ? <>R$14<span>,90</span></> : <>R$59<span>,90</span></>}
            </p>
            <p className="upgrade-price-period">
              {plano === 'mensal' ? 'por mês · cancele quando quiser' : 'a cada 6 meses · cancele quando quiser'}
            </p>
          </div>

          {erro && (
            <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center' }}>
              {erro}
            </p>
          )}

          <button
            className="upgrade-btn-primary"
            onClick={assinar}
            disabled={carregando}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: carregando ? .7 : 1 }}
          >
            {carregando ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite', width: 14, height: 14 }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                  <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Redirecionando…
              </>
            ) : (
              <><Sparkles size={14} strokeWidth={1.8} /> Assinar Pro agora</>
            )}
          </button>
          <button className="upgrade-btn-ghost" onClick={onClose}>Continuar grátis</button>
          <p className="upgrade-notice">Pagamento seguro via Mercado Pago · Cancele a qualquer momento</p>
        </div>
      </div>
    </div>
  )
}
