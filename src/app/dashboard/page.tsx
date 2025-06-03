'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  async function loadProfile() {
    try {
      setLoading(true)
      setError(null)
      const data = await getProfile(user!.id)
      setProfile(data)
    } catch (error: any) {
      setError(error.message || 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (error) {
    return <ErrorDisplay message={error} retry={loadProfile} />
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user?.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Username</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile?.username || 'Not set'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{profile?.full_name || 'Not set'}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900">Account Status</h2>
            <div className="mt-4">
              <div className="flex items-center">
                <div className={`h-2.5 w-2.5 rounded-full ${user?.email_confirmed_at ? 'bg-green-500' : 'bg-yellow-500'} mr-2`} />
                <span className="text-sm text-gray-700">
                  {user?.email_confirmed_at ? 'Email verified' : 'Email not verified'}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                Last updated: {profile?.updated_at ? new Date(profile.updated_at).toLocaleDateString() : 'Never'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
