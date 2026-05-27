'use client'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { ProfileProvider } from '../lib/ProfileContext'
import { BentoProvider } from '../lib/BentoContext'

export default function DashboardLayout({ children }) {
  return (
    <ProfileProvider>
      <BentoProvider>
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#0a0a0a' }}>
          <TopBar />
          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            <Sidebar />
            <main style={{ flex: 1, minWidth: 0, overflow: 'hidden', position: 'relative' }}>
              {children}
            </main>
          </div>
        </div>
      </BentoProvider>
    </ProfileProvider>
  )
}
