'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    </aside>
  )
}
