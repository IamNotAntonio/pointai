'use client'
import { createContext, useContext, useState, useEffect, useCallback } from 'react'

/*
 * BentoContext (renamed from OrbitalContext in D.3g).
 *
 * Only mode now is "fullscreen" — drawer/expand/minimize disappeared
 * with the orbital. Either an item id is active (fullscreen mounted)
 * or it isn't.
 */
const BentoContext = createContext({
  activeItem: null,
  openItem: () => {},
  closeItem: () => {},
})

export function BentoProvider({ children }) {
  const [activeItem, setActiveItem] = useState(null)

  const openItem = useCallback((id) => {
    setActiveItem(prev => (prev === id ? null : id))
  }, [])

  const closeItem = useCallback(() => setActiveItem(null), [])

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && activeItem) closeItem()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeItem, closeItem])

  return (
    <BentoContext.Provider value={{ activeItem, openItem, closeItem }}>
      {children}
    </BentoContext.Provider>
  )
}

export function useBento() {
  return useContext(BentoContext)
}
