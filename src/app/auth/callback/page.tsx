'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@clerk/nextjs'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AuthCallback() {
  const router = useRouter()
  const { isLoaded, userId } = useAuth()

  useEffect(() => {
    if (isLoaded && userId) {
      // Successfully signed in, redirect to dashboard
      router.push('/dashboard')
    } else if (isLoaded && !userId) {
      // Not signed in, redirect to home
      router.push('/')
    }
  }, [isLoaded, userId, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
