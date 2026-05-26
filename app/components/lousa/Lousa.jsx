'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'
import * as db from '../../lib/db'
import { fetchPlano } from '../../lib/plano'
import { useProfile } from '../../lib/ProfileContext'
import Chat from '../Chat'
import GradientDots from './GradientDots'

// NOTE: items + OrbitalItem ficam dormentes durante D.3a.
//       Re-import in D.3c quando o orbital lateral nascer:
// import OrbitalItem from './OrbitalItem'
// import { getNotasBadge, NotasDrawer, NotasFullscreen } from './items/NotasItem'
// import { getCalendarioBadge, CalendarioDrawer, CalendarioFullscreen } from './items/CalendarioItem'
// import { getEvolucaoBadge, EvolucaoDrawer, EvolucaoFullscreen } from './items/EvolucaoItem'
// import { getSimuladoBadge, SimuladoDrawer, SimuladoFullscreen } from './items/SimuladoItem'
// import { getAnaliseBadge, AnaliseDrawer, AnaliseFullscreen } from './items/AnaliseItem'
// import { getPlanoBadge, PlanoDrawer, PlanoFullscreen } from './items/PlanoItem'

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

  // Data still loaded — D.3c will surface it again via the side orbital.
  // eslint-disable-next-line no-unused-vars
  const [notas, setNotas] = useState([])
  // eslint-disable-next-line no-unused-vars
  const [eventos, setEventos] = useState([])
  // eslint-disable-next-line no-unused-vars
  const [isProUser, setIsProUser] = useState(false)

  // Materia resolution: URL param > localStorage > 'geral'
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

  const materiaLabel = materia === 'geral' ? 'Chat Geral' : materia

  return (
    <div className="lousa-canvas">
      <style>{`
        .lousa-canvas{position:relative;width:100%;height:100%;min-height:calc(100vh - 64px);overflow:hidden;background:#0a0a0a}
        .lousa-chat-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(820px, calc(100vw - 320px));max-width:820px;min-width:340px;height:min(78vh, 720px);min-height:420px;background:#0d0d0d;border:1px solid rgba(255,255,255,.06);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.02);z-index:5}
        .lousa-chat-header{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid #161616;flex-shrink:0;background:#0a0a0a}
        .lousa-chat-header-title{font-size:13.5px;font-weight:700;color:#f4f4f5;letter-spacing:-.01em;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lousa-chat-header-sub{font-size:11px;color:#71717a;font-weight:600}
        .lousa-chat-body{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}

        @media (max-width:1023px){
          .lousa-chat-card{position:relative;inset:auto;transform:none;left:auto;top:auto;width:calc(100% - 24px);max-width:100%;height:calc(100vh - 64px - 24px);min-height:auto;margin:12px auto;z-index:5}
        }
        @media (max-width:767px){
          .lousa-chat-card{width:calc(100% - 16px);margin:8px auto;height:calc(100vh - 64px - 16px)}
        }
      `}</style>

      <GradientDots />

      <div className="lousa-chat-card">
        <div className="lousa-chat-header">
          <MessageSquare size={16} strokeWidth={1.7} style={{ color: materia === 'geral' ? '#3b82f6' : '#22c55e', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="lousa-chat-header-title">{materiaLabel}</p>
            <p className="lousa-chat-header-sub">Point AI · especialista acadêmico</p>
          </div>
        </div>
        <div className="lousa-chat-body">
          {perfil ? (
            <Chat materia={materia} />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13 }}>
              Carregando perfil…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
