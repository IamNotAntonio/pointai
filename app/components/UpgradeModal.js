'use client'
import { useState } from 'react'
import { MessageSquare, BookOpen, ClipboardList, Zap, TrendingUp, Sparkles, X, Check } from 'lucide-react'

const FEATURES = [
  { Icon: MessageSquare, text: 'Mensagens ilimitadas todos os dias' },
  { Icon: BookOpen,       text: 'Análise de provas, tarefas e anotações' },
  { Icon: ClipboardList,  text: 'Relatório semanal personalizado com IA' },
  { Icon: TrendingUp,     text: 'Memória de conversas entre sessões' },
  { Icon: Zap,            text: 'Respostas com prioridade máxima' },
]

const PLANOS = [
  { id: 'gratis',    label: 'Grátis',    detalhe: '20 msgs/dia',    preco: null },
  { id: 'mensal',    label: 'Mensal',    detalhe: 'R$14,90/mês',    preco: { reais: '14', centavos: ',90', periodo: 'por mês' } },
  { id: 'semestral', label: 'Semestral', detalhe: 'R$59,90/6 meses', preco: { reais: '59', centavos: ',90', periodo: 'a cada 6 meses' }, badge: '-33%' },
]

async function getUserInfo() {
  try {
    const { getUser, getUserId } = await import('../lib/db')
    const user   = await getUser()
    const perfil = JSON.parse(localStorage.getItem('pointai_perfil') || '{}')
    return {
      email:  user?.email  || '',
      nome:   perfil.nome  || user?.user_metadata?.full_name || '',
      userId: user?.id     || getUserId(),
    }
  } catch {
    return { email: '', nome: '', userId: '' }
  }
}

export default function UpgradeModal({ onClose, mensagensHoje = 20, limite = 20 }) {
  const [plano,      setPlano]      = useState('mensal')
  const [carregando, setCarregando] = useState(false)
  const [erro,       setErro]       = useState(null)

  const isGratis = plano === 'gratis'
  const planoAtivo = PLANOS.find(p => p.id === plano)

  async function assinar() {
    if (isGratis || carregando) return
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
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plano, userId, email, nome }),
      })

      const data = await resp.json()

      if (data.erro) {
        setErro(data.erro)
        setCarregando(false)
        return
      }

      window.location.href = data.init_point
    } catch {
      setErro('Erro de conexão. Tente novamente.')
      setCarregando(false)
    }
  }

  return (
    <div className="upgrade-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className="upgrade-modal">
        <div className="upgrade-gradient" />

        <div className="upgrade-modal-body">
          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={16} strokeWidth={2} />
          </button>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
            <Sparkles size={28} strokeWidth={1.5} style={{ color: '#22c55e' }} />
          </div>
          <h2 className="upgrade-title">Point.AI Pro</h2>
          <p className="upgrade-subtitle">
            Você usou {mensagensHoje} de {limite} mensagens hoje.<br />
            Assine o Pro para estudar sem limites.
          </p>

          {/* Features */}
          <div className="upgrade-features">
            {FEATURES.map(({ Icon, text }) => (
              <div key={text} className="upgrade-feature">
                <Icon size={14} strokeWidth={1.8} style={{ color: '#22c55e', flexShrink: 0 }} />
                <span className="upgrade-feature-text">{text}</span>
              </div>
            ))}
          </div>

          {/* Plan selector */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: 'var(--surface-2)', borderRadius: 12, padding: 4 }}>
            {PLANOS.map(p => {
              const sel = plano === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setPlano(p.id)}
                  style={{
                    flex: 1, padding: '8px 4px', borderRadius: 9, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600,
                    background: sel ? 'var(--surface)' : 'transparent',
                    color:      sel ? 'var(--text-1)'  : 'var(--text-4)',
                    boxShadow:  sel ? 'var(--shadow)'  : 'none',
                    transition: 'all .15s',
                    position: 'relative',
                  }}
                >
                  {p.badge && (
                    <span style={{ position: 'absolute', top: -6, right: 2, background: '#1a7a4a', color: '#86efac', borderRadius: 4, padding: '1px 5px', fontSize: 9, fontWeight: 800 }}>
                      {p.badge}
                    </span>
                  )}
                  {p.label}
                  <br />
                  <span style={{ fontSize: 10, fontWeight: 400, color: sel ? 'var(--text-3)' : 'var(--text-4)' }}>
                    {p.detalhe}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Price */}
          {!isGratis && planoAtivo?.preco && (
            <div className="upgrade-price-wrap">
              <p className="upgrade-price">
                R${planoAtivo.preco.reais}<span>{planoAtivo.preco.centavos}</span>
              </p>
              <p className="upgrade-price-period">
                {planoAtivo.preco.periodo} · cancele quando quiser
              </p>
            </div>
          )}

          {/* Error */}
          {erro && (
            <p style={{ fontSize: 12, color: '#f87171', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.18)', borderRadius: 8, padding: '8px 12px', marginBottom: 12, textAlign: 'center' }}>
              {erro}
            </p>
          )}

          {/* CTA */}
          <button
            className="upgrade-btn-primary"
            onClick={isGratis ? undefined : assinar}
            disabled={isGratis || carregando}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity:  isGratis ? .5 : carregando ? .75 : 1,
              cursor:   isGratis ? 'default' : 'pointer',
            }}
          >
            {isGratis ? (
              <><Check size={14} strokeWidth={2.5} /> Plano atual</>
            ) : carregando ? (
              <>
                <svg style={{ animation: 'spin 1s linear infinite', width: 14, height: 14, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity=".25"/>
                  <path fill="currentColor" opacity=".75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Redirecionando…
              </>
            ) : (
              <><Sparkles size={14} strokeWidth={1.8} /> Assinar agora</>
            )}
          </button>

          {!isGratis && (
            <button className="upgrade-btn-ghost" onClick={onClose}>
              Continuar grátis
            </button>
          )}

          <p className="upgrade-notice">
            Pagamento seguro via Mercado Pago
          </p>
        </div>
      </div>
    </div>
  )
}
