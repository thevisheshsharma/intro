'use client'

import { useEffect, useState, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { getProfile, type Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import Sidebar from '../Sidebar'
import { extractTwitterUsername } from '@/lib/twitter-helpers'
import { useAutoSyncFollowers } from '@/lib/hooks/useAutoSyncFollowers'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Auto-sync followers on login
  useAutoSyncFollowers()

  const loadProfile = useCallback(async () => {
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
  }, [user])

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      const username = extractTwitterUsername(user)
      if (username) {
        setTwitterUsername(username)
      }
    }
  }, [isLoaded, user, loadProfile])

  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) return <ErrorDisplay message={error} />

  return (
    <div className="flex min-h-screen w-full bg-[#181818]">
      {user && (
        <Sidebar
          user={user}
          profile={profile}
          twitterUsername={twitterUsername}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
