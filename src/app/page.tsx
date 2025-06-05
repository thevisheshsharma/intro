'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { LoginForm } from '@/components/auth/login-form'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'

export default function Home() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      // Find Twitter/X account
      const twitterAccount = user.externalAccounts?.find(
        account => account.provider === 'twitter' || account.provider === 'x'
      )
      if (twitterAccount?.username) {
        setTwitterUsername(twitterAccount.username)
      }
    }
  }, [isLoaded, user])

  async function loadProfile() {
    if (!user) return
    try {
      setLoading(true)
      setError(null)
      const data = await getProfile(user.id)
      setProfile(data)
    } catch (error: any) {
      setError(error.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return <ErrorDisplay message={error} />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
          {user ? `Welcome ${user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}` : 'Welcome to Next.js + Clerk'}
        </p>
      </div>

      <div className="relative flex place-items-center">
        {!user && <LoginForm />}
      </div>

      {user && (
        <div className="mt-8 w-full max-w-xl">
          {twitterUsername && (
            <p className="text-gray-600 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#1DA1F2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              @{twitterUsername}
            </p>
          )}
          <div className="mt-6">
            <pre className="rounded-lg bg-gray-50 p-4">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}