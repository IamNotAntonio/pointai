'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

const navItems = [
  { href: '/dashboard', icon: '💬', label: 'Chat' },
  { href: '/notas', icon: '📊', label: 'Notas e Faltas' },
  { href: '/calendario', icon: '📅', label: 'Calendário' },
  { href: '/evolucao', icon: '📈', label: 'Minha Evolução' },
  { href: '/trabalhos', icon: '📝', label: 'Correção de Trabalhos' },
]

export default function Sidebar({ perfil, materias = [], materiaAtiva, onMateriaChange }) {
  const pathname = usePathname()
  const isDashboard = pathname === '/dashboard'
  const [tema, setTema] = useState('dark')

  useEffect(() => {
    const saved = localStorage.getItem('pointai_tema') || 'dark'
    setTema(saved)
    document.documentElement.classList.toggle('dark', saved === 'dark')
  }, [])

  function toggleTema() {
    const novo = tema === 'dark' ? 'light' : 'dark'
    setTema(novo)
    localStorage.setItem('pointai_tema', novo)
    document.documentElement.classList.toggle('dark', novo === 'dark')
  }

  return (
    <aside className="sidebar">
      {/* Logo + perfil */}
      <div className="sidebar-header">
        <Link href="/dashboard" className="sidebar-logo">
          Point.AI
        </Link>
        {perfil && (
          <div className="sidebar-profile">
            <div className="sidebar-avatar">
              {perfil.nome?.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-info">
              <p className="sidebar-profile-name">{perfil.nome}</p>
              <p className="sidebar-profile-sub">{perfil.curso} · {perfil.semestre}</p>
            </div>
          </div>
        )}
      </div>

      {/* Matérias (só no dashboard) */}
      {isDashboard && materias.length > 0 && (
        <div className="sidebar-section">
          <p className="sidebar-section-label">Matérias</p>
          <nav className="sidebar-nav">
            {materias.map((m, i) => (
              <button
                key={i}
                onClick={() => onMateriaChange?.(m)}
                className={`sidebar-materia-btn ${materiaAtiva === m ? 'active' : ''}`}
              >
                <span className="sidebar-materia-dot" />
                <span className="sidebar-materia-text">{m}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Navegação principal */}
      <div className="sidebar-section sidebar-nav-main">
        <p className="sidebar-section-label">Menu</p>
        <nav className="sidebar-nav">
          {navItems.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className={`sidebar-nav-link ${pathname === href ? 'active' : ''}`}
            >
              <span className="sidebar-nav-icon">{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* Theme toggle */}
      <div className="sidebar-theme-footer">
        <button onClick={toggleTema} className="sidebar-theme-btn" title={tema === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}>
          {tema === 'dark' ? <SunIcon /> : <MoonIcon />}
          <span>{tema === 'dark' ? 'Tema claro' : 'Tema escuro'}</span>
        </button>
      </div>
    </aside>
  )
}
