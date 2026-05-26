'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, Suspense } from 'react'
import * as db from '../lib/db'
import { useProfile } from '../lib/ProfileContext'
import { Plus, Globe } from 'lucide-react'

export default function Sidebar() {
  return (
    <Suspense fallback={<aside className="sidebar-minimal" />}>
      <SidebarInner />
    </Suspense>
  )
}

function SidebarInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { perfil, updatePerfil } = useProfile()

  const [addOpen, setAddOpen] = useState(false)
  const [novaMateria, setNovaMateria] = useState('')

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

  return (
    <>
      <aside className="sidebar-minimal" aria-label="Matérias">
        <p className="sidebar-min-label">Matérias</p>

        <Link
          href="/dashboard"
          className={`sidebar-min-item ${isGeralActive ? 'active' : ''}`}
          title="Chat Geral"
        >
          <Globe size={14} strokeWidth={1.8} style={{ flexShrink: 0 }} />
          <span>Chat Geral</span>
        </Link>

        <div style={{ height: 6 }} />

        {materias.map(m => {
          const active = isDashboardChild && materiaParam === m
          return (
            <Link
              key={m}
              href={`/dashboard?materia=${encodeURIComponent(m)}`}
              className={`sidebar-min-item ${active ? 'active' : ''}`}
              title={m}
            >
              <span className="sidebar-min-dot" aria-hidden />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m}</span>
            </Link>
          )
        })}

        <button
          className="sidebar-min-add"
          onClick={() => setAddOpen(true)}
          aria-label="Adicionar nova matéria"
        >
          <Plus size={12} strokeWidth={2.5} /> Nova matéria
        </button>
      </aside>

      <style>{`
        .sidebar-minimal{width:240px;flex-shrink:0;background:#0a0a0a;border-right:1px solid #1a1a1a;display:flex;flex-direction:column;gap:2px;padding:18px 14px 22px;overflow-y:auto;height:calc(100vh - 64px)}
        .sidebar-min-label{font-size:10px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#52525b;padding:4px 8px;margin-top:6px;margin-bottom:10px}
        .sidebar-min-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;color:#a1a1aa;font-size:13px;font-weight:500;text-decoration:none;transition:background .12s,color .12s,border-color .12s;border-left:2px solid transparent;margin:1px 0}
        .sidebar-min-item:hover{background:rgba(255,255,255,.04);color:#e4e4e7}
        .sidebar-min-item.active{background:rgba(34,197,94,.08);color:#22c55e;border-left-color:#22c55e;font-weight:600}
        .sidebar-min-dot{width:6px;height:6px;border-radius:50%;background:#3a3a3a;flex-shrink:0;transition:background .12s,box-shadow .12s}
        .sidebar-min-item.active .sidebar-min-dot{background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18)}
        .sidebar-min-add{display:flex;align-items:center;gap:6px;background:none;border:1px dashed #2a2a2a;color:#71717a;font-size:12px;font-weight:600;padding:9px 12px;border-radius:8px;cursor:pointer;font-family:inherit;margin-top:8px;transition:border-color .15s,color .15s,background .15s}
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
