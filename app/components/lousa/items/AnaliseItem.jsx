'use client'
import { Search, Upload } from 'lucide-react'
import { FullscreenSkeleton, ProPaywall, openPlansModal, sharedItemCss } from './_shared'

export function getAnaliseBadge() {
  return null
}

export function AnaliseDrawer({ isProUser }) {
  if (!isProUser) {
    return (
      <>
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
      </>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '32px 12px' }}>
      <Search size={36} strokeWidth={1.4} style={{ color: '#52525b', marginBottom: 14 }} />
      <p style={{ fontSize: 13.5, color: '#a1a1aa', lineHeight: 1.55, marginBottom: 18 }}>
        Nenhum material analisado ainda.
      </p>
      <button className="lousa-cta-btn">
        <Upload size={14} strokeWidth={2} /> Enviar material
      </button>
      <style>{sharedItemCss}</style>
    </div>
  )
}

export function AnaliseFullscreen() {
  return (
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
  )
}
