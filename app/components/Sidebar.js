'use client'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import * as db from '../lib/db'
import {
  Home, BookOpen, Calendar, TrendingUp, FileText, Search, BarChart2,
  Plus, Globe, ClipboardList, Brain,
} from 'lucide-react'

const IC_NAV = { size: 14, strokeWidth: 1.8 }

export default function Sidebar(props) {
  // useSearchParams below requires a Suspense boundary for SSG.
  return (
    <Suspense fallback={null}>
      <SidebarInner {...props} />
    </Suspense>
  )
}

function SidebarInner() {
  const pathname     = usePathname()
  const searchParams = useSearchParams()

  const isHome        = pathname === '/dashboard'
  const isChat        = pathname === '/dashboard/chat'
  const materiaParam  = searchParams.get('materia')
  const isGeralActive = isChat && !materiaParam

  const [perfil, setPerfil] = useState(null)
  const [addMateriaOpen, setAddMateriaOpen] = useState(false)
  const [novaMateria, setNovaMateria] = useState('')

  useEffect(() => {
    db.getPerfil().then(p => { if (p) setPerfil(p) }).catch(() => {})
  }, [])

  const materias = perfil?.materias
    ? perfil.materias.split(',').map(m => m.trim()).filter(Boolean)
    : []

  function confirmarNovaMateria() {
    const nome = novaMateria.trim()
    if (!nome) return
    const novaLista = [...materias, nome]
    const novoPerf  = { ...(perfil || {}), materias: novaLista.join(', ') }
    db.savePerfil(novoPerf)
    setPerfil(novoPerf)
    setNovaMateria('')
    setAddMateriaOpen(false)
  }

  /* ── Nav items (single source of truth) ─────────────────── */
  const NAV_ITEMS = [
    { href: '/dashboard',      Icon: Home,         label: 'Home',                   active: isHome },
    { href: '/dashboard/chat', Icon: Globe,        label: 'Chat Geral',             active: isGeralActive },
    { href: '/notas',          Icon: BookOpen,     label: 'Notas e Faltas',         active: pathname === '/notas' },
    { href: '/calendario',     Icon: Calendar,     label: 'Calendário',             active: pathname === '/calendario' },
    { href: '/evolucao',       Icon: TrendingUp,   label: 'Minha Evolução',         active: pathname === '/evolucao' },
    { href: '/trabalhos',      Icon: FileText,     label: 'Correção de Trabalhos',  active: pathname === '/trabalhos' },
    { href: '/analise',        Icon: Search,       label: 'Análise de Materiais',   active: pathname === '/analise',   pro: true },
    { href: '/relatorio',      Icon: BarChart2,    label: 'Relatório Semanal',      active: pathname === '/relatorio', pro: true },
    { href: '/simulado',       Icon: ClipboardList,label: 'Simulado Inteligente',   active: pathname === '/simulado',  pro: true },
    { href: '/plano',          Icon: Brain,        label: 'Plano de Estudos',       active: pathname === '/plano',     pro: true },
  ]

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-section sidebar-nav-main" style={{ paddingTop: 20 }}>
          <p className="sidebar-section-label">Menu</p>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map(({ href, Icon, label, pro, active }) => (
              <Link
                key={href + label}
                href={href}
                title={label}
                className={`sidebar-nav-link ${active ? 'active' : ''}`}
              >
                <span className="sidebar-nav-icon">
                  <Icon {...IC_NAV} />
                </span>
                <span>{label}</span>
                {pro && <span className="sb-pro-badge">Pro</span>}
              </Link>
            ))}
          </nav>
        </div>

        {materias.length > 0 && (
          <div className="sidebar-section" data-tour="materias">
            <p className="sidebar-section-label">Minhas Matérias</p>
            <nav className="sidebar-nav">
              {materias.map(m => {
                const ativo = isChat && materiaParam === m
                return (
                  <Link
                    key={m}
                    href={`/dashboard/chat?materia=${encodeURIComponent(m)}`}
                    className={`sidebar-materia-btn ${ativo ? 'active' : ''}`}
                    title={m}
                  >
                    <span className="sidebar-materia-dot" />
                    <span className="sidebar-materia-text">{m}</span>
                  </Link>
                )
              })}
              <button className="sb-add-materia" onClick={() => setAddMateriaOpen(true)}>
                <Plus size={11} strokeWidth={2.5} /> Nova matéria
              </button>
            </nav>
          </div>
        )}
      </aside>

      {addMateriaOpen && (
        <div className="sb-overlay" onClick={e => e.target === e.currentTarget && setAddMateriaOpen(false)}>
          <div className="sb-modal" style={{ maxWidth: 380 }}>
            <div className="sb-modal-header">
              <p className="sb-modal-title">Nova matéria</p>
              <button className="sb-modal-close" onClick={() => setAddMateriaOpen(false)}>×</button>
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
              <button className="btn btn-ghost" onClick={() => { setAddMateriaOpen(false); setNovaMateria('') }}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmarNovaMateria} disabled={!novaMateria.trim()}>Adicionar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
