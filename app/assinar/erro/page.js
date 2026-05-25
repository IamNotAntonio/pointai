'use client'
import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'

export default function AssinarErro() {
  const router = useRouter()

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
      `}</style>
      <div style={styles.page}>
        <div style={styles.orb} />
        <header style={styles.header}>
          <span style={styles.logo}>Point</span>
        </header>
        <main style={styles.main}>
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <XCircle size={56} strokeWidth={1.5} style={{ color: '#ef4444', animation: 'shake .4s ease both' }} />
            </div>
            <h1 style={styles.h1}>Algo deu errado</h1>
            <p style={styles.sub}>
              Não conseguimos processar seu pagamento.<br />
              Nenhum valor foi cobrado. Verifique seus dados e tente novamente.
            </p>
            <button style={styles.btnPrimary} onClick={() => router.push('/dashboard')}>
              Tentar novamente
            </button>
            <button style={styles.btnGhost} onClick={() => router.push('/dashboard')}>
              Voltar ao app
            </button>
          </div>
        </main>
      </div>
    </>
  )
}

const styles = {
  page:       { background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', WebkitFontSmoothing: 'antialiased' },
  orb:        { position: 'fixed', top: '-10%', left: '50%', transform: 'translateX(-50%)', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,.12) 0%, transparent 70%)', filter: 'blur(4px)', pointerEvents: 'none' },
  header:     { padding: '18px 28px' },
  logo:       { fontSize: 15, fontWeight: 800, color: '#22c55e', letterSpacing: '-.3px' },
  main:       { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px', position: 'relative', zIndex: 1 },
  card:       { width: '100%', maxWidth: 400, background: '#111', border: '1px solid #1e1e1e', borderRadius: 20, padding: '36px 32px', boxShadow: '0 24px 64px rgba(0,0,0,.55)', textAlign: 'center' },
  h1:         { fontSize: 22, fontWeight: 800, color: '#f4f4f5', margin: '0 0 10px' },
  sub:        { fontSize: 13.5, color: '#71717a', margin: '0 0 28px', lineHeight: 1.7 },
  btnPrimary: { display: 'block', width: '100%', padding: '13px 0', borderRadius: 12, background: '#1a7a4a', color: '#fff', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10 },
  btnGhost:   { display: 'block', width: '100%', padding: '11px 0', borderRadius: 12, background: 'transparent', border: '1px solid #262626', color: '#71717a', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' },
}
