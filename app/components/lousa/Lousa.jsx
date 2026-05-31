'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import * as db from '../../lib/db'
import { fetchPlano } from '../../lib/plano'
import { useProfile } from '../../lib/ProfileContext'
import Chat from '../Chat'
import GradientDots from './GradientDots'
import BentoGrid from './BentoGrid'

export default function Lousa() {
  return (
    <Suspense fallback={<div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b' }}>Carregando…</div>}>
      <LousaInner />
    </Suspense>
  )
}

function LousaInner() {
  const { perfil } = useProfile()
  const searchParams = useSearchParams()

  const [notas, setNotas] = useState([])
  const [eventos, setEventos] = useState([])
  const [isProUser, setIsProUser] = useState(false)
  // chatFocused was used to dim the orbital lateral — orbital is gone in D.3g.
  // Kept the onFocusChange prop on Chat as a no-op for now in case a future
  // surface wants the signal.

  const urlMateria = searchParams.get('materia')
  const [materia, setMateria] = useState(() => {
    if (urlMateria) return urlMateria
    if (typeof window === 'undefined') return 'geral'
    try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
  })

  useEffect(() => {
    const next = urlMateria || (() => {
      try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
    })()
    if (next !== materia) setMateria(next)
  }, [urlMateria])

  useEffect(() => {
    try { localStorage.setItem('pointai_materia_ativa', materia) } catch {}
  }, [materia])

  useEffect(() => {
    let alive = true
    db.getNotas().then(d => { if (alive) setNotas(d || []) }).catch(() => {})
    db.getEventos().then(d => { if (alive) setEventos(d || []) }).catch(() => {})
    fetchPlano().then(p => { if (alive) setIsProUser(p === 'pro') }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Refresh notas/eventos when an import lands so the Bento cards update
  // without a manual reload. Reads localStorage directly to avoid a Supabase
  // round-trip that could lose the race against the just-finished upsert.
  useEffect(() => {
    function onImport(e) {
      const kind = e.detail?.kind
      try {
        if (kind === 'notas') {
          const d = JSON.parse(localStorage.getItem('pointai_notas') || 'null')
          if (d && typeof d === 'object') setNotas(d)
        } else if (kind === 'eventos') {
          // Eventos é per-row no Supabase — vale uma releitura completa.
          db.getEventos().then(evs => setEventos(evs || [])).catch(() => {})
        }
      } catch {}
    }
    window.addEventListener('pointai-import-done', onImport)
    return () => window.removeEventListener('pointai-import-done', onImport)
  }, [])

  return (
    <div className="lousa-canvas">
      <style>{`
        .lousa-canvas{position:relative;width:100%;height:100%;min-height:calc(100vh - 64px);overflow:hidden;background:#0a0a0a}
        .lousa-stack{position:absolute;inset:0;display:flex;flex-direction:column;min-height:0;z-index:5}
        .lousa-chat-shell{flex:1;min-height:360px;display:flex;flex-direction:column}
        .lousa-bento-shell{flex-shrink:0;padding:8px 0 22px}

        @media (max-width:767px){
          .lousa-bento-shell{padding:6px 0 16px}
        }
      `}</style>

      <GradientDots />

      <div className="lousa-stack">
        <div className="lousa-chat-shell">
          {perfil ? (
            <Chat materia={materia} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13 }}>
              Carregando perfil…
            </div>
          )}
        </div>

        <div className="lousa-bento-shell">
          <BentoGrid
            materia={materia}
            notas={notas}
            eventos={eventos}
            isProUser={isProUser}
          />
        </div>
      </div>
    </div>
  )
}
