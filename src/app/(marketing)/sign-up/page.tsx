'use client'

import { useEffect, useRef } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function SignUpPage() {
  const { ready, authenticated, login } = usePrivy()
  const router = useRouter()
  const openedLogin = useRef(false)

  useEffect(() => {
    if (!ready) return
    if (authenticated) {
      router.replace('/onboarding')
      return
    }
    if (!openedLogin.current) {
      openedLogin.current = true
      login()
    }
  }, [authenticated, login, ready, router])

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-heading font-bold text-gray-900">Start with Berri</h1>
        <p className="mt-3 text-gray-600">
          Sign in or create your account to connect X and see your personalized preview.
        </p>
        <Button className="mt-8" onClick={() => login()} disabled={!ready}>
          Continue
        </Button>
      </div>
    </main>
  )
}
