'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the OAuth response from the URL
        const hashParams = new URLSearchParams(window.location.hash.slice(1))
        const queryParams = new URLSearchParams(window.location.search)
        
        // Check both hash and query parameters for auth response
        const code = hashParams.get('code') || queryParams.get('code')
        const error = hashParams.get('error') || queryParams.get('error')
        
        if (error) {
          console.error('Error during auth:', error)
          router.push('/?error=auth')
          return
        }

        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Error getting session:', sessionError.message)
          router.push('/')
          return
        }

        if (session) {
          router.push('/dashboard')
        } else {
          router.push('/')
        }
      } catch (err) {
        console.error('Callback error:', err)
        router.push('/')
      }
    }

    handleAuthCallback()
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner />
    </div>
  )
}
