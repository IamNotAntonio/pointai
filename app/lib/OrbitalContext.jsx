'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const OrbitalContext = createContext({
  activeId: null,
  mode: 'closed',
  open: () => {},
  expand: () => {},
  minimize: () => {},
  close: () => {},
})

export function OrbitalProvider({ children }) {
  const [activeId, setActiveId] = useState(null)
  const [mode, setMode] = useState('closed')

  const open = useCallback((id) => {
    setActiveId(prev => {
      // Clicking the active item closes it.
      if (prev === id) {
        setMode('closed')
        return null
      }
      setMode('drawer')
      return id
    })
  }, [])

  const expand = useCallback(() => setMode(m => (activeId ? 'fullscreen' : m)), [activeId])
  const minimize = useCallback(() => setMode(m => (activeId ? 'drawer' : m)), [activeId])
  const close = useCallback(() => {
    setActiveId(null)
    setMode('closed')
  }, [])

  // Esc always closes — direct to closed, never back to drawer.
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && mode !== 'closed') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, close])

  return (
    <OrbitalContext.Provider value={{ activeId, mode, open, expand, minimize, close }}>
      {children}
    </OrbitalContext.Provider>
  )
}

export function useOrbital() {
  return useContext(OrbitalContext)
}
