'use client'
import PointAssistant from './PointAssistant'

export default function ClientWrapper({ children }) {
  return (
    <>
      {children}
      <PointAssistant />
    </>
  )
}
