'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import * as db from './db'

const ProfileContext = createContext({
  perfil: null,
  loading: true,
  refreshPerfil: async () => {},
  updatePerfil: () => {},
})

export function ProfileProvider({ children }) {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshPerfil = useCallback(async () => {
    const p = await db.getPerfil()
    if (p) setPerfil(p)
    setLoading(false)
    return p
  }, [])

  useEffect(() => {
    let alive = true
    db.getPerfil().then(p => {
      if (!alive) return
      if (p) setPerfil(p)
      setLoading(false)
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  // Optimistic merge + fire-and-forget persist.
  const updatePerfil = useCallback((patch) => {
    setPerfil(prev => {
      const merged = { ...(prev || {}), ...patch }
      db.savePerfil(merged).catch(() => {})
      return merged
    })
  }, [])

  return (
    <ProfileContext.Provider value={{ perfil, loading, refreshPerfil, updatePerfil }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
