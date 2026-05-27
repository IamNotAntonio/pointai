'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Search, Upload, Lock } from 'lucide-react'
import { fetchPlano } from '../../../lib/plano'
import { FullscreenSkeleton, ProPaywall, openPlansModal, sharedItemCss } from './_shared'

/* ─── Bento card (PRO-gated visual) ────────────────────────────── */
export function AnaliseCard({ isProUser, onClick }) {
  const locked = !isProUser
  return (
    <motion.button
      type="button"
      layoutId="panel-analise"
      onClick={onClick}
      className={`bento-card ${locked ? 'bento-card-locked' : ''}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Abrir Análise de Materiais"
      title={locked ? 'Disponível no PRO' : undefined}
    >
      {locked && (
        <>
          <span className="bento-card-pro">PRO</span>
          <span className="bento-card-lock" aria-hidden>
            <Lock size={11} strokeWidth={2} />
          </span>
        </>
      )}
      <div className="bento-card-icon-wrap">
        <Search size={20} strokeWidth={1.7} />
      </div>
      <p className="bento-card-title">Análise</p>
      <p className="bento-card-sub" style={{ marginTop: 6 }}>
        {locked ? 'Análises detalhadas' : 'Suba materiais'}
      </p>
    </motion.button>
  )
}

/* ─── Fullscreen ────────────────────────────────────────────────── */
export function AnaliseFullscreen() {
  const [isProUser, setIsProUser] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    fetchPlano().then(p => {
      if (!alive) return
      setIsProUser(p === 'pro')
      setLoaded(true)
    }).catch(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])

  if (!loaded) return <div style={{ padding: 32, color: '#52525b' }}>Carregando…</div>

  if (!isProUser) {
    return (
      <div style={{ maxWidth: 640, margin: '40px auto 0' }}>
        <ProPaywall
          Icon={Search}
          title="Análise de Materiais"
          description="Suba PDFs ou fotos de slides/livros e a IA devolve resumo, mapa mental e flashcards prontos pra revisar."
          bullets={[
            'Upload de PDF ou foto, até 50MB',
            'Resumo estruturado em segundos',
            'Flashcards exportáveis pra revisão espaçada',
          ]}
          onSeePlans={openPlansModal}
        />
        <style>{sharedItemCss}</style>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 16px' }}>
      <Search size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 18 }}>Nenhum material analisado ainda.</p>
      <button className="lousa-cta-btn" disabled title="Disponível em breve">
        <Upload size={14} strokeWidth={2} /> Enviar material
      </button>
      <div style={{ marginTop: 40, maxWidth: 640 }}>
        <FullscreenSkeleton
          Icon={Search}
          title="Upload de Materiais — em construção"
          bullets={[
            'Suporte a PDF, imagens (slides, fotos de livro) e textos longos',
            'Resumo, mapa mental e flashcards gerados pela IA',
            'Vinculação automática à matéria e tópico',
            'Biblioteca pessoal com busca interna',
          ]}
        />
      </div>
      <style>{sharedItemCss}</style>
    </div>
  )
}
