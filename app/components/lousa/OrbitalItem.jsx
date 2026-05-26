'use client'
import { motion, AnimatePresence, useReducedMotion } from 'motion/react'
import { Maximize2, Minimize2, X } from 'lucide-react'
import { useOrbital } from '../../lib/OrbitalContext'

/*
 * OrbitalItem — renders a single orbital chip + its drawer + its fullscreen
 * overlay. Uses `layoutId` so motion morphs the chip into the panel and back.
 *
 * Props:
 *   id              - one of the 6 orbital ids (calendario / notas / ...)
 *   Icon            - lucide component
 *   label           - chip label
 *   badge           - small data badge (e.g. "Média 8.4") or null
 *   isPro           - feature gated to Pro plan
 *   isProUser       - current user's plan
 *   position        - { left, top, size, floatDelay } from Lousa
 *   DrawerContent   - React component rendered inside the drawer
 *   FullscreenContent - React component rendered inside the fullscreen panel
 */
export default function OrbitalItem({
  id, Icon, label, badge, isPro = false, isProUser = false,
  position, DrawerContent, FullscreenContent,
}) {
  const orbital = useOrbital()
  const reduce = useReducedMotion()
  const isActive = orbital.activeId === id
  const mode = isActive ? orbital.mode : 'closed'

  const floatDelay = position?.floatDelay ?? 0
  const floatDuration = reduce ? 0 : 5 + (floatDelay % 2)
  const floatKeyframes = reduce ? [0, 0] : [0, -3, 0, 3, 0]

  const chipSize = position?.size ?? 96

  return (
    <>
      {/* Closed: orbital chip */}
      {mode === 'closed' && (
        <motion.button
          layoutId={`orbital-${id}`}
          onClick={() => orbital.open(id)}
          animate={reduce ? {} : { y: floatKeyframes }}
          transition={reduce ? { duration: 0 } : {
            duration: floatDuration, repeat: Infinity, delay: floatDelay, ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.04 }}
          style={{
            position: 'absolute',
            left: position?.left ?? '50%',
            top: position?.top ?? '50%',
            translate: '-50% -50%',
            width: chipSize,
            height: chipSize,
            borderRadius: 22,
            background: '#161616',
            border: '1px solid rgba(255,255,255,.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '14px 6px 8px',
            cursor: 'pointer',
            color: '#d4d4d8',
            fontFamily: 'inherit',
            textAlign: 'center',
            willChange: 'transform',
            transition: 'border-color .18s, box-shadow .18s, color .18s',
          }}
          aria-label={label}
          className="orbital-chip"
        >
          {isPro && !isProUser && (
            <span style={{
              position: 'absolute', top: 7, right: 7,
              fontSize: 8, fontWeight: 800, letterSpacing: '.06em',
              color: '#22c55e', background: 'rgba(26,122,74,.18)',
              border: '1px solid rgba(34,197,94,.32)',
              padding: '1px 5px', borderRadius: 4,
            }}>PRO</span>
          )}
          <Icon size={26} strokeWidth={1.6} style={{ marginTop: 2 }} />
          <span style={{ fontSize: 11.5, fontWeight: 500, marginTop: 8, lineHeight: 1.2, color: '#e4e4e7' }}>{label}</span>
          {badge && (
            <span
              title={badge}
              style={{
                fontSize: 9.5, fontWeight: 600, color: '#86efac',
                marginTop: 4, maxWidth: '100%', padding: '0 4px',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}
            >
              {badge}
            </span>
          )}
        </motion.button>
      )}

      {/* Backdrop */}
      <AnimatePresence>
        {mode !== 'closed' && (
          <motion.div
            key={`backdrop-${mode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={orbital.close}
            style={{
              position: 'fixed', inset: 0, zIndex: 40,
              background: mode === 'fullscreen' ? 'rgba(0,0,0,.75)' : 'rgba(0,0,0,.5)',
              backdropFilter: mode === 'fullscreen' ? 'blur(14px)' : 'blur(8px)',
              WebkitBackdropFilter: mode === 'fullscreen' ? 'blur(14px)' : 'blur(8px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Drawer */}
      {mode === 'drawer' && (
        <motion.div
          layoutId={`orbital-${id}`}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          style={{
            position: 'fixed',
            right: 24, top: 88,
            width: 'min(420px, calc(100vw - 48px))',
            height: 'calc(100vh - 112px)',
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 24px 60px rgba(0,0,0,.65)',
          }}
          className="orbital-panel"
        >
          <PanelHeader
            Icon={Icon}
            label={label}
            actions={[
              { Icon: Maximize2, onClick: orbital.expand, label: 'Expandir' },
              { Icon: X, onClick: orbital.close, label: 'Fechar' },
            ]}
            big={false}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px 20px', minHeight: 0 }}>
            {DrawerContent ? <DrawerContent /> : null}
          </div>
        </motion.div>
      )}

      {/* Fullscreen */}
      {mode === 'fullscreen' && (
        <motion.div
          layoutId={`orbital-${id}`}
          transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          style={{
            position: 'fixed',
            inset: 32,
            background: '#0d0d0d',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 20,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 50,
            boxShadow: '0 40px 100px rgba(0,0,0,.7)',
          }}
          className="orbital-panel orbital-panel-full"
        >
          <PanelHeader
            Icon={Icon}
            label={label}
            actions={[
              { Icon: Minimize2, onClick: orbital.minimize, label: 'Minimizar' },
              { Icon: X, onClick: orbital.close, label: 'Fechar' },
            ]}
            big={true}
          />
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 36px 36px', minHeight: 0 }}>
            {FullscreenContent ? <FullscreenContent /> : null}
          </div>
        </motion.div>
      )}

      <style>{`
        .orbital-chip:hover{border-color:rgba(34,197,94,.4) !important;box-shadow:0 0 24px rgba(34,197,94,.12) !important;color:#22c55e !important}
        .orb-panel-btn{background:none;border:none;color:#a1a1aa;padding:8px;border-radius:8px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s}
        .orb-panel-btn:hover{background:#181818;color:#e4e4e7}
        @media (max-width: 768px){
          .orbital-panel{right:0 !important;top:64px !important;width:100vw !important;height:calc(100vh - 64px) !important;border-radius:0 !important;border:none !important;inset:auto !important}
          .orbital-panel-full{inset:64px 0 0 0 !important;border-radius:0 !important;border:none !important}
          .orb-panel-btn{padding:11px}
        }
      `}</style>
    </>
  )
}

function PanelHeader({ Icon, label, actions, big }) {
  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: big ? 14 : 10,
      padding: big ? '20px 26px' : '14px 16px',
      borderBottom: '1px solid #161616',
      flexShrink: 0,
    }}>
      <Icon size={big ? 22 : 18} strokeWidth={1.7} style={{ color: '#22c55e', flexShrink: 0 }} />
      <span style={{
        flex: 1, minWidth: 0,
        fontSize: big ? 18 : 14,
        fontWeight: big ? 800 : 700,
        color: '#f4f4f5',
        letterSpacing: big ? '-.02em' : '-.01em',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}>{label}</span>
      {actions.map((a, i) => (
        <button key={i} onClick={a.onClick} className="orb-panel-btn" aria-label={a.label}>
          <a.Icon size={big ? 17 : 15} strokeWidth={1.8} />
        </button>
      ))}
    </header>
  )
}
