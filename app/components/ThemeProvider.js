'use client'
import { useEffect } from 'react'

export default function ThemeProvider({ children }) {
  useEffect(() => {
    const tema = localStorage.getItem('pointai_tema') || 'dark'
    document.documentElement.classList.toggle('dark', tema === 'dark')
  }, [])

  return <>{children}</>
}
