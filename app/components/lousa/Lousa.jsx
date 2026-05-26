'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Calendar, FileText, TrendingUp, ClipboardList, Search, Brain, MessageSquare } from 'lucide-react'
import * as db from '../../lib/db'
import { fetchPlano } from '../../lib/plano'
import { useProfile } from '../../lib/ProfileContext'
import Chat from '../Chat'
import OrbitalItem from './OrbitalItem'
import {
  getNotasBadge, NotasDrawer, NotasFullscreen,
} from './items/NotasItem'
import {
  getCalendarioBadge, CalendarioDrawer, CalendarioFullscreen,
} from './items/CalendarioItem'
import {
  getEvolucaoBadge, EvolucaoDrawer, EvolucaoFullscreen,
} from './items/EvolucaoItem'
import {
  getSimuladoBadge, SimuladoDrawer, SimuladoFullscreen,
} from './items/SimuladoItem'
import {
  getAnaliseBadge, AnaliseDrawer, AnaliseFullscreen,
} from './items/AnaliseItem'
import {
  getPlanoBadge, PlanoDrawer, PlanoFullscreen,
} from './items/PlanoItem'

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

  // Materia resolution: URL param > localStorage > 'geral'
  const urlMateria = searchParams.get('materia')
  const [materia, setMateria] = useState(() => {
    if (urlMateria) return urlMateria
    if (typeof window === 'undefined') return 'geral'
    try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
  })

  // Sync state when URL changes
  useEffect(() => {
    const next = urlMateria || (() => {
      try { return localStorage.getItem('pointai_materia_ativa') || 'geral' } catch { return 'geral' }
    })()
    if (next !== materia) setMateria(next)
  }, [urlMateria])

  // Persist current materia
  useEffect(() => {
    try { localStorage.setItem('pointai_materia_ativa', materia) } catch {}
  }, [materia])

  // Load notas / eventos / plano
  useEffect(() => {
    let alive = true
    db.getNotas().then(d => { if (alive) setNotas(d || []) }).catch(() => {})
    db.getEventos().then(d => { if (alive) setEventos(d || []) }).catch(() => {})
    fetchPlano().then(p => { if (alive) setIsProUser(p === 'pro') }).catch(() => {})
    return () => { alive = false }
  }, [])

  // Compute orbital positions
  const canvasRef = useRef(null)
  const [layout, setLayout] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const node = canvasRef.current
    if (!node) return
    function measure() {
      const r = node.getBoundingClientRect()
      setLayout({ w: r.width, h: r.height })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(node)
    return () => ro.disconnect()
  }, [])

  const isMobile = layout.w > 0 && layout.w < 1024
  const isXs = layout.w > 0 && layout.w < 768

  const orbitalPositions = useMemo(() => {
    if (isMobile) return null
    const { w, h } = layout
    if (!w || !h) return []
    const cx = w / 2
    const cy = h / 2
    const radius = Math.max(340, Math.min(440, h * 0.42))
    return Array.from({ length: 6 }, (_, i) => {
      const angle = ((i * 60 - 90) * Math.PI) / 180
      return {
        left: cx + radius * Math.cos(angle),
        top: cy + radius * Math.sin(angle),
        size: 96,
        floatDelay: (i * 0.6) % 3,
      }
    })
  }, [layout, isMobile])

  const materiaLabel = materia === 'geral' ? 'Chat Geral' : materia

  const items = useMemo(() => [
    {
      id: 'calendario', Icon: Calendar, label: 'Calendário', isPro: false,
      badge: getCalendarioBadge({ materia, eventos }),
      DrawerContent: () => <CalendarioDrawer materia={materia} eventos={eventos} />,
      FullscreenContent: CalendarioFullscreen,
    },
    {
      id: 'notas', Icon: FileText, label: 'Notas e Faltas', isPro: false,
      badge: getNotasBadge({ materia, notas }),
      DrawerContent: () => <NotasDrawer materia={materia} notas={notas} />,
      FullscreenContent: NotasFullscreen,
    },
    {
      id: 'evolucao', Icon: TrendingUp, label: 'Minha Evolução', isPro: false,
      badge: getEvolucaoBadge(),
      DrawerContent: () => <EvolucaoDrawer materia={materia} />,
      FullscreenContent: EvolucaoFullscreen,
    },
    {
      id: 'plano', Icon: Brain, label: 'Plano de Estudos', isPro: true,
      badge: getPlanoBadge(),
      DrawerContent: () => <PlanoDrawer isProUser={isProUser} />,
      FullscreenContent: PlanoFullscreen,
    },
    {
      id: 'analise', Icon: Search, label: 'Análise de Materiais', isPro: true,
      badge: getAnaliseBadge(),
      DrawerContent: () => <AnaliseDrawer isProUser={isProUser} />,
      FullscreenContent: AnaliseFullscreen,
    },
    {
      id: 'simulado', Icon: ClipboardList, label: 'Simulado Inteligente', isPro: true,
      badge: getSimuladoBadge(),
      DrawerContent: () => <SimuladoDrawer isProUser={isProUser} />,
      FullscreenContent: SimuladoFullscreen,
    },
  ], [materia, eventos, notas, isProUser])

  return (
    <div ref={canvasRef} className="lousa-canvas">
      <style>{`
        .lousa-canvas{position:relative;width:100%;height:100%;min-height:calc(100vh - 64px);overflow:hidden;background:#0a0a0a;background-image:radial-gradient(circle at 50% 45%, rgba(34,197,94,.05) 0%, transparent 600px)}
        .lousa-chat-card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(640px,calc(100vw - 720px));max-width:640px;min-width:340px;height:min(70vh,640px);min-height:480px;background:#0d0d0d;border:1px solid rgba(255,255,255,.06);border-radius:16px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.02);z-index:5}
        .lousa-chat-header{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid #161616;flex-shrink:0;background:#0a0a0a}
        .lousa-chat-header-title{font-size:13.5px;font-weight:700;color:#f4f4f5;letter-spacing:-.01em;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .lousa-chat-header-sub{font-size:11px;color:#71717a;font-weight:600}
        .lousa-chat-body{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden}

        /* Mobile dock */
        .lousa-dock{position:fixed;left:0;right:0;bottom:0;z-index:30;height:88px;background:rgba(10,10,10,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;padding:10px 14px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
        .lousa-dock::-webkit-scrollbar{display:none}
        .lousa-dock .orbital-chip{position:relative !important;left:auto !important;top:auto !important;transform:none !important;width:64px !important;height:64px !important;flex-shrink:0;padding:8px 4px 6px !important;border-radius:16px !important}
        .lousa-dock .orbital-chip svg{width:18px !important;height:18px !important;margin-top:0 !important}
        .lousa-dock .orbital-chip span{font-size:10px !important;margin-top:4px !important}
        .lousa-dock .orbital-chip [title]{display:none !important}

        @media (max-width:1023px){
          .lousa-chat-card{position:relative;inset:auto;transform:none;left:auto;top:auto;width:calc(100% - 24px);max-width:100%;height:calc(100vh - 64px - 88px - 24px);min-height:auto;margin:12px auto;z-index:1}
        }
        @media (max-width:767px){
          .lousa-chat-card{width:calc(100% - 16px);margin:8px auto}
        }
      `}</style>

      {/* Central chat card */}
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

      {/* Orbital — desktop only */}
      {!isMobile && orbitalPositions?.length === 6 && items.map((it, i) => (
        <OrbitalItem
          key={it.id}
          id={it.id}
          Icon={it.Icon}
          label={it.label}
          badge={it.badge}
          isPro={it.isPro}
          isProUser={isProUser}
          position={orbitalPositions[i]}
          DrawerContent={it.DrawerContent}
          FullscreenContent={it.FullscreenContent}
        />
      ))}

      {/* Mobile dock */}
      {isMobile && (
        <div className="lousa-dock" role="navigation" aria-label="Ferramentas">
          {items.map((it) => (
            <OrbitalItem
              key={it.id}
              id={it.id}
              Icon={it.Icon}
              label={it.label}
              badge={null}
              isPro={it.isPro}
              isProUser={isProUser}
              position={{ left: 'auto', top: 'auto', size: 64, floatDelay: 0 }}
              DrawerContent={it.DrawerContent}
              FullscreenContent={it.FullscreenContent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
