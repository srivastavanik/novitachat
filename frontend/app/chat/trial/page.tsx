'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function TrialChatPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Redirect to main chat with trial mode
  useEffect(() => {
    const query = searchParams.get('q')
    const redirectUrl = query 
      ? `/chat?trial=true&q=${encodeURIComponent(query)}`
      : `/chat?trial=true`
    
    router.replace(redirectUrl)
  }, [router, searchParams])

  return (
    <div className="flex h-screen bg-[var(--nova-bg-primary)] items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--nova-primary)] mx-auto"></div>
        <p className="text-sm text-[var(--nova-text-secondary)] mt-2">Redirecting to Chat...</p>
      </div>
    </div>
  )
}
