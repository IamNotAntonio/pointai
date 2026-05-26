'use client'
import { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Calendar, FileText, TrendingUp, ClipboardList, Search, Brain,
} from 'lucide-react'
import * as db from '../../lib/db'
import { fetchPlano } from '../../lib/plano'
import { useProfile } from '../../lib/ProfileContext'
import { useOrbital } from '../../lib/OrbitalContext'
import Chat from '../Chat'
import GradientDots from './GradientDots'
import OrbitalItem from './OrbitalItem'
import OrbitalLateral from './OrbitalLateral'
import { getNotasBadge, NotasDrawer, NotasFullscreen } from './items/NotasItem'
import { getCalendarioBadge, CalendarioDrawer, CalendarioFullscreen } from './items/CalendarioItem'
import { getEvolucaoBadge, EvolucaoDrawer, EvolucaoFullscreen } from './items/EvolucaoItem'
import { getSimuladoBadge, SimuladoDrawer, SimuladoFullscreen } from './items/SimuladoItem'
import { getAnaliseBadge, AnaliseDrawer, AnaliseFullscreen } from './items/AnaliseItem'
import { getCerebroBadge, CerebroDrawer, CerebroFullscreen } from './items/CerebroPointItem'

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
  const [chatFocused, setChatFocused] = useState(false)

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

  // Below 1500px the orbital lateral (≥300px wide) collides with the
  // centered chat content; fall back to the horizontal dock instead.
  const isCompact = layout.w > 0 && layout.w < 1500

  /*
   * Six items in clockwise order from 12 o'clock:
   *   0   topo:        Calendário
   *   60  dir-cima:    Notas e Faltas
   *   120 dir-baixo:   Minha Evolução
   *   180 baixo:       Cérebro Point (replaces Plano de Estudos)
   *   240 esq-baixo:   Análise de Materiais (PRO)
   *   300 esq-cima:    Simulado Inteligente (PRO)
   */
  const items = useMemo(() => [
    {
      id: 'calendario', Icon: Calendar, label: 'Calendário', shortLabel: 'Calendário', isPro: false,
      badge: getCalendarioBadge({ materia, eventos }),
      DrawerContent: () => <CalendarioDrawer materia={materia} eventos={eventos} />,
      FullscreenContent: CalendarioFullscreen,
    },
    {
      id: 'notas', Icon: FileText, label: 'Notas e Faltas', shortLabel: 'Notas', isPro: false,
      badge: getNotasBadge({ materia, notas }),
      DrawerContent: () => <NotasDrawer materia={materia} notas={notas} />,
      FullscreenContent: NotasFullscreen,
    },
    {
      id: 'evolucao', Icon: TrendingUp, label: 'Minha Evolução', shortLabel: 'Evolução', isPro: false,
      badge: getEvolucaoBadge(),
      DrawerContent: () => <EvolucaoDrawer materia={materia} />,
      FullscreenContent: EvolucaoFullscreen,
    },
    {
      id: 'cerebro', Icon: Brain, label: 'Cérebro Point', shortLabel: 'Cérebro', isPro: false,
      badge: getCerebroBadge(),
      DrawerContent: CerebroDrawer,
      FullscreenContent: CerebroFullscreen,
    },
    {
      id: 'analise', Icon: Search, label: 'Análise de Materiais', shortLabel: 'Análise', isPro: true,
      badge: getAnaliseBadge(),
      DrawerContent: () => <AnaliseDrawer isProUser={isProUser} />,
      FullscreenContent: AnaliseFullscreen,
    },
    {
      id: 'simulado', Icon: ClipboardList, label: 'Simulado Inteligente', shortLabel: 'Simulado', isPro: true,
      badge: getSimuladoBadge(),
      DrawerContent: () => <SimuladoDrawer isProUser={isProUser} />,
      FullscreenContent: SimuladoFullscreen,
    },
  ], [materia, eventos, notas, isProUser])

  return (
    <div ref={canvasRef} className="lousa-canvas">
      <style>{`
        .lousa-canvas{position:relative;width:100%;height:100%;min-height:calc(100vh - 64px);overflow:hidden;background:#0a0a0a}
        .lousa-chat-wrap{position:absolute;inset:0;z-index:5;display:flex;flex-direction:column;min-height:0}

        /* Mobile dock */
        .lousa-dock{position:fixed;left:0;right:0;bottom:0;z-index:30;height:88px;background:rgba(10,10,10,.92);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-top:1px solid rgba(255,255,255,.06);display:flex;align-items:center;gap:10px;padding:10px 14px;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
        .lousa-dock::-webkit-scrollbar{display:none}
        .lousa-dock-item{position:relative;flex-shrink:0;display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;width:64px;height:64px;border-radius:16px;background:#161616;border:1px solid rgba(255,255,255,.08);color:#d4d4d8;cursor:pointer;font-family:inherit;padding:6px 4px;transition:border-color .15s,color .15s,background .15s}
        .lousa-dock-item:hover{border-color:rgba(34,197,94,.4);color:#22c55e}
        .lousa-dock-item-label{font-size:10px;font-weight:500;color:#a1a1aa;line-height:1;text-align:center;white-space:nowrap}
        .lousa-dock-item:hover .lousa-dock-item-label{color:#86efac}
        .lousa-dock-item-pro{position:absolute;top:3px;right:3px;font-size:7px;font-weight:800;letter-spacing:.06em;color:#22c55e;background:rgba(26,122,74,.18);border:1px solid rgba(34,197,94,.32);padding:0 4px;border-radius:3px;line-height:1.4}

        @media (max-width:1499px){
          .lousa-chat-wrap{padding-bottom:88px}
        }
      `}</style>

      <GradientDots />

      <div className="lousa-chat-wrap">
        {perfil ? (
          <Chat materia={materia} onFocusChange={setChatFocused} />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: 13 }}>
            Carregando perfil…
          </div>
        )}
      </div>

      {/* OrbitalItem instances with hideChip — only the drawer/fullscreen
          surface renders. No off-screen rack needed since the chip is
          skipped entirely. */}
      {items.map(item => (
        <OrbitalItem
          key={item.id}
          id={item.id}
          Icon={item.Icon}
          label={item.label}
          badge={null}
          isPro={item.isPro}
          isProUser={isProUser}
          hideChip
          DrawerContent={item.DrawerContent}
          FullscreenContent={item.FullscreenContent}
        />
      ))}

      {/* Desktop: orbital lateral widget bottom-left */}
      {!isCompact && (
        <OrbitalLateral
          materia={materia}
          isProUser={isProUser}
          dimmed={chatFocused}
          items={items}
        />
      )}

      {/* Compact (≤1499 desktop + tablet + mobile): horizontal dock */}
      {isCompact && <MobileDock items={items} isProUser={isProUser} />}
    </div>
  )
}

function MobileDock({ items, isProUser }) {
  const orbital = useOrbital()
  return (
    <div className="lousa-dock" role="navigation" aria-label="Ferramentas">
      {items.map(item => {
        const proLocked = item.isPro && !isProUser
        return (
          <button
            key={item.id}
            type="button"
            className="lousa-dock-item"
            onClick={() => orbital.open(item.id)}
            aria-label={item.label}
          >
            {proLocked && <span className="lousa-dock-item-pro">PRO</span>}
            <item.Icon size={18} strokeWidth={1.6} />
            <span className="lousa-dock-item-label">{item.shortLabel || item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
