'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle, Zap, BookOpen, ClipboardList, MessageSquare, TrendingUp } from 'lucide-react'
import { setProLocal } from '../../lib/plano'

const BENEFICIOS = [
  { Icon: MessageSquare, text: 'Mensagens ilimitadas todos os dias' },
  { Icon: BookOpen,       text: 'Análise de provas, tarefas e anotações com IA' },
  { Icon: ClipboardList,  text: 'Relatório semanal personalizado' },
  { Icon: TrendingUp,     text: 'Memória de conversas entre sessões' },
  { Icon: Zap,            text: 'Respostas com prioridade máxima' },
]

function SucessoConteudo() {
  const router = useRouter()
  const params = useSearchParams()
  const [estado, setEstado] = useState('verificando') // verificando | ok | pendente | erro

  useEffect(() => {
    const preapprovalId = params.get('preapproval_id')
    const status        = params.get('status')

    if (!preapprovalId) {
      // Might be a direct visit or a pending payment
      if (status === 'pending') {
        setProLocal()
        setEstado('pendente')
      } else {
        setEstado('ok')
        setProLocal()
      }
      return
    }

    fetch('/api/assinar/ativar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preapprovalId }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.autorizado) {
          setProLocal()
          setEstado('ok')
        } else if (d.status === 'pending') {
          setProLocal()
          setEstado('pendente')
        } else {
          setEstado('erro')
        }
      })
      .catch(() => {
        // Even if API fails, mark Pro optimistically — webhook will confirm
        setProLocal()
        setEstado('ok')
      })
  }, [params])

  if (estado === 'verificando') {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
        <p style={{ color: '#71717a', marginTop: 16 }}>Verificando pagamento…</p>
      </div>
    )
  }

  if (estado === 'erro') {
    return (
      <div style={styles.center}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>❌</p>
        <h2 style={styles.h2}>Algo deu errado</h2>
        <p style={styles.sub}>Não conseguimos confirmar o pagamento.</p>
        <button style={styles.btnGhost} onClick={() => router.push('/assinar/erro')}>
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <div style={styles.card}>
      {/* Animated checkmark */}
      <div style={styles.checkWrap}>
        <CheckCircle size={56} strokeWidth={1.5} style={{ color: '#22c55e', animation: 'popIn .5s cubic-bezier(.16,1,.3,1) both' }} />
      </div>

      <h1 style={styles.h1}>
        {estado === 'pendente' ? 'Pagamento em processamento!' : 'Bem-vindo ao Pro!'}
      </h1>
      <p style={styles.sub}>
        {estado === 'pendente'
          ? 'Assim que o pagamento for confirmado, seu plano Pro será ativado automaticamente.'
          : 'Sua assinatura está ativa. Aproveite todos os recursos sem limites.'}
      </p>

      <div style={styles.beneficiosList}>
        {BENEFICIOS.map(({ Icon, text }) => (
          <div key={text} style={styles.beneficioRow}>
            <CheckCircle size={15} strokeWidth={2} style={{ color: '#22c55e', flexShrink: 0 }} />
            <Icon size={15} strokeWidth={1.8} style={{ color: '#a1a1aa', flexShrink: 0 }} />
            <span style={{ fontSize: 13.5, color: '#d4d4d8' }}>{text}</span>
          </div>
        ))}
      </div>

      <button style={styles.btnPrimary} onClick={() => router.push('/dashboard')}>
        Começar a usar o Point.AI →
      </button>
    </div>
  )
}

export default function AssinarSucesso() {
  return (
    <>
      <style>{CSS}</style>
      <div style={styles.page}>
        <div style={styles.orb} />
        <header style={styles.header}>
          <span style={styles.logo}>Point.AI</span>
        </header>
        <main style={styles.main}>
          <Suspense fallback={<div style={styles.center}><div style={styles.spinner} /></div>}>
            <SucessoConteudo />
          </Suspense>
        </main>
      </div>
    </>
  )
}

const styles = {
  page:   { background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', WebkitFontSmoothing: 'antialiased' },
  orb:    { position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,.18) 0%, transparent 70%)', filter: 'blur(4px)', pointerEvents: 'none' },
  header: { padding: '18px 28px', display: 'flex', alignItems: 'center' },
  logo:   { fontSize: 15, fontWeight: 800, color: '#22c55e', letterSpacing: '-.3px' },
  main:   { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', zIndex: 1 },
  center: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#f4f4f5' },
  card:   { width: '100%', maxWidth: 440, background: '#111', border: '1px solid #1e1e1e', borderRadius: 20, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,.55), 0 0 0 1px rgba(26,122,74,.08)', textAlign: 'center' },
  checkWrap: { display: 'flex', justifyContent: 'center', marginBottom: 20 },
  h1:     { fontSize: 22, fontWeight: 800, color: '#f4f4f5', margin: '0 0 10px' },
  h2:     { fontSize: 20, fontWeight: 700, color: '#f4f4f5', margin: '0 0 8px' },
  sub:    { fontSize: 13.5, color: '#71717a', margin: '0 0 24px', lineHeight: 1.6 },
  beneficiosList: { display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28, textAlign: 'left' },
  beneficioRow:   { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#0d0d0d', borderRadius: 10, border: '1px solid #1a1a1a' },
  btnPrimary: { width: '100%', padding: '13px 0', borderRadius: 12, background: 'linear-gradient(135deg,#1a7a4a,#22c55e)', color: '#fff', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 0 24px rgba(26,122,74,.4)' },
  btnGhost:   { marginTop: 12, padding: '10px 24px', borderRadius: 10, background: 'transparent', border: '1px solid #262626', color: '#a1a1aa', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
  spinner: { width: 32, height: 32, border: '2px solid #1e1e1e', borderTop: '2px solid #22c55e', borderRadius: '50%', animation: 'spin 1s linear infinite' },
}

const CSS = `
  @keyframes popIn {
    from { opacity: 0; transform: scale(.6); }
    to   { opacity: 1; transform: scale(1); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`
