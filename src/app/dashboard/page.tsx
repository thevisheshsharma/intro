'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  async function loadProfile() {
    try {
      const data = await getProfile(user!.id)
      setProfile(data)
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="mt-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-medium text-gray-900">Welcome back!</h2>
            <div className="mt-4 space-y-4">
              <p className="text-gray-600">
                Email: {user?.email}
              </p>
              {profile?.username && (
                <p className="text-gray-600">
                  Username: {profile.username}
                </p>
              )}
              {profile?.full_name && (
                <p className="text-gray-600">
                  Full Name: {profile.full_name}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
