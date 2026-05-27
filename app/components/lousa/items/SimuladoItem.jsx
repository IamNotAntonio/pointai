'use client'
import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { ClipboardList, Plus, Lock } from 'lucide-react'
import { fetchPlano } from '../../../lib/plano'
import { FullscreenSkeleton, ProPaywall, openPlansModal, sharedItemCss } from './_shared'

export function SimuladoCard({ isProUser, onClick }) {
  const locked = !isProUser
  return (
    <motion.button
      type="button"
      layoutId="panel-simulado"
      onClick={onClick}
      className={`bento-card ${locked ? 'bento-card-locked' : ''}`}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      aria-label="Abrir Simulado Inteligente"
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
        <ClipboardList size={20} strokeWidth={1.7} />
      </div>
      <p className="bento-card-title">Simulado</p>
      <p className="bento-card-sub" style={{ marginTop: 6 }}>
        {locked ? 'Simulados ilimitados' : 'Criar simulado'}
      </p>
    </motion.button>
  )
}

export function SimuladoFullscreen() {
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
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '64px 16px' }}>
      <ClipboardList size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
      <p style={{ fontSize: 14, color: '#a1a1aa', marginBottom: 18 }}>Nenhum simulado feito ainda.</p>
      <button className="lousa-cta-btn" disabled title="Disponível em breve">
        <Plus size={14} strokeWidth={2} /> Criar novo simulado
      </button>
      <div style={{ marginTop: 40, maxWidth: 640 }}>
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
      </div>
      <style>{sharedItemCss}</style>
    </div>
  )
}
