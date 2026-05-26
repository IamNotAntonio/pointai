'use client'
import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function ChatRedirectInner() {
  const router = useRouter()
  const sp = useSearchParams()

  useEffect(() => {
    const m = sp.get('materia')
    router.replace(m ? `/dashboard?materia=${encodeURIComponent(m)}` : '/dashboard')
  }, [router, sp])

  return null
}

export default function ChatRedirect() {
  return (
    <Suspense fallback={null}>
      <ChatRedirectInner />
    </Suspense>
  )
}
