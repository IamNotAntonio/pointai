'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useProfile } from '../lib/ProfileContext'
import { Plus, Globe, ChevronLeft, ChevronRight } from 'lucide-react'

const STORAGE_KEY = 'pointai_sidebar_collapsed'

export default function Sidebar() {
  return (
    <Suspense fallback={<aside style={{ width: 240, flexShrink: 0 }} />}>
      <SidebarInner />
    </Suspense>
  )
}

function SidebarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const reduce = useReducedMotion()
  const { perfil, updatePerfil } = useProfile()

  const [collapsed, setCollapsed] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [novaMateria, setNovaMateria] = useState('')

  // Hydrate collapsed flag from localStorage post-mount (avoid SSR mismatch)
  useEffect(() => {
    try { setCollapsed(localStorage.getItem(STORAGE_KEY) === 'true') } catch {}
    setHydrated(true)
  }, [])

  function toggleCollapsed() {
    setCollapsed(c => {
      const next = !c
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch {}
      return next
    })
  }

  const materiaParam = searchParams.get('materia')
  const isDashboardChild = pathname === '/dashboard' || pathname.startsWith('/dashboard/')
  const isGeralActive = isDashboardChild && !materiaParam

  const materias = perfil?.materias
    ? perfil.materias.split(',').map(m => m.trim()).filter(Boolean)
    : []

  function confirmarNovaMateria() {
    const nome = novaMateria.trim()
    if (!nome) return
    const novaLista = [...materias, nome]
    updatePerfil({ materias: novaLista.join(', ') })
    setNovaMateria('')
    setAddOpen(false)
  }

  const width = collapsed ? 56 : 240
  const transition = reduce ? { duration: 0 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }

  return (
    <>
      <motion.aside
        className={`sidebar-minimal ${collapsed ? 'is-collapsed' : ''}`}
        aria-label="Matérias"
        initial={false}
        animate={hydrated ? { width } : undefined}
        style={{ width }}
        transition={transition}
      >
        {/* Header: label (expanded) or spacer + toggle button */}
        <div className="sidebar-min-header">
          {!collapsed && <span className="sidebar-min-label">Matérias</span>}
          <button
            className="sidebar-min-toggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
            title={collapsed ? 'Expandir' : 'Recolher'}
          >
            {collapsed
              ? <ChevronRight size={14} strokeWidth={2} />
              : <ChevronLeft  size={14} strokeWidth={2} />}
          </button>
        </div>

        {/* Items */}
        <div className="sidebar-min-items">
          <SidebarItem
            href="/dashboard"
            active={isGeralActive}
            collapsed={collapsed}
            label="Chat Geral"
            icon={<Globe size={collapsed ? 16 : 14} strokeWidth={1.8} />}
            isGeral
          />

          <div style={{ height: 6 }} />

          {materias.map(m => {
            const active = isDashboardChild && materiaParam === m
            return (
              <SidebarItem
                key={m}
                href={`/dashboard?materia=${encodeURIComponent(m)}`}
                active={active}
                collapsed={collapsed}
                label={m}
                initial={m.charAt(0).toUpperCase()}
              />
            )
          })}

          <button
            className="sidebar-min-add"
            onClick={() => setAddOpen(true)}
            aria-label="Adicionar nova matéria"
            title="Nova matéria"
          >
            <Plus size={collapsed ? 14 : 12} strokeWidth={2.5} />
            {!collapsed && <span>Nova matéria</span>}
          </button>
        </div>
      </motion.aside>

      <style>{`
        .sidebar-minimal{flex-shrink:0;background:#0a0a0a;border-right:1px solid #1a1a1a;display:flex;flex-direction:column;overflow:hidden;height:calc(100vh - 64px);position:relative}
        .sidebar-min-header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 12px 10px;min-height:46px}
        .sidebar-min-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#52525b;padding-left:6px;white-space:nowrap;overflow:hidden}
        .sidebar-min-toggle{background:none;border:1px solid #1a1a1a;cursor:pointer;color:#71717a;width:28px;height:28px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;transition:background .15s,color .15s,border-color .15s;flex-shrink:0;padding:0}
        .sidebar-min-toggle:hover{background:#181818;color:#e4e4e7;border-color:#2a2a2a}
        .sidebar-min-items{flex:1;display:flex;flex-direction:column;gap:2px;padding:0 8px 18px;overflow-y:auto;overflow-x:hidden}
        .sidebar-min-items::-webkit-scrollbar{width:6px}
        .sidebar-min-items::-webkit-scrollbar-thumb{background:#1a1a1a;border-radius:8px}

        .sidebar-min-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;color:#a1a1aa;font-size:13px;font-weight:500;text-decoration:none;transition:background .12s,color .12s,border-color .12s;border-left:2px solid transparent;margin:1px 0;min-height:36px}
        .sidebar-min-item:hover{background:rgba(255,255,255,.04);color:#e4e4e7}
        .sidebar-min-item.active{background:rgba(34,197,94,.08);color:#22c55e;border-left-color:#22c55e;font-weight:600}
        .sidebar-min-item-label{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
        .sidebar-min-item-icon{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;width:20px;height:20px}
        .sidebar-min-dot{width:6px;height:6px;border-radius:50%;background:#3a3a3a;flex-shrink:0;transition:background .12s,box-shadow .12s}
        .sidebar-min-item.active .sidebar-min-dot{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}

        /* Collapsed bubble */
        .is-collapsed .sidebar-min-item{padding:0;justify-content:center;border-left:none}
        .is-collapsed .sidebar-min-item-bubble{width:36px;height:36px;border-radius:50%;background:#101010;border:1px solid #1a1a1a;display:flex;align-items:center;justify-content:center;color:#a1a1aa;font-size:12.5px;font-weight:700;transition:border-color .15s,background .15s,color .15s}
        .is-collapsed .sidebar-min-item:hover .sidebar-min-item-bubble{border-color:#2a2a2a;color:#e4e4e7}
        .is-collapsed .sidebar-min-item.active .sidebar-min-item-bubble{background:rgba(26,122,74,.14);border-color:rgba(34,197,94,.4);color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}

        .sidebar-min-add{display:flex;align-items:center;justify-content:center;gap:6px;background:none;border:1px dashed #2a2a2a;color:#71717a;font-size:12px;font-weight:600;padding:9px 12px;border-radius:8px;cursor:pointer;font-family:inherit;margin-top:10px;transition:border-color .15s,color .15s,background .15s}
        .is-collapsed .sidebar-min-add{padding:9px 0}
        .sidebar-min-add:hover{border-color:rgba(34,197,94,.35);color:#22c55e;background:rgba(26,122,74,.05)}

        @media (max-width:1023px){.sidebar-minimal{display:none}}
      `}</style>

      {addOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setAddOpen(false)}>
          <div className="sb-modal" style={{ maxWidth: 380 }}>
            <div className="sb-modal-header">
              <p className="sb-modal-title">Nova matéria</p>
              <button className="sb-modal-close" onClick={() => setAddOpen(false)}>×</button>
            </div>
            <div className="sb-form-group">
              <label className="sb-label">Nome da matéria</label>
              <input
                className="sb-input"
                placeholder="Ex: Cálculo II, Banco de Dados…"
                value={novaMateria}
                onChange={e => setNovaMateria(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && confirmarNovaMateria()}
                autoFocus
              />
            </div>
            <div className="sb-modal-footer">
              <button className="btn btn-ghost" onClick={() => { setAddOpen(false); setNovaMateria('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovaMateria} disabled={!novaMateria.trim()}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function SidebarItem({ href, active, collapsed, label, icon, initial, isGeral }) {
  return (
    <Link
      href={href}
      className={`sidebar-min-item ${active ? 'active' : ''}`}
      title={label}
      aria-label={collapsed ? label : undefined}
    >
      {collapsed ? (
        <div className="sidebar-min-item-bubble">
          {isGeral ? icon : initial}
        </div>
      ) : (
        <>
          {icon || <span className="sidebar-min-dot" aria-hidden />}
          <span className="sidebar-min-item-label">{label}</span>
        </>
      )}
    </Link>
  )
}
