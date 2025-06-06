'use client'

import { useEffect, useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { LoginForm } from '@/components/auth/login-form'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { FollowingsTable } from '@/components/twitter/followings-table'

export default function Home() {
  const { user, isLoaded } = useUser()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)
  const [searchUsername, setSearchUsername] = useState('')
  const [followingsLoading, setFollowingsLoading] = useState(false)
  const [followings, setFollowings] = useState<any[]>([])
  const [searchError, setSearchError] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
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

  async function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!searchUsername) return

    setFollowingsLoading(true)
    setSearchError(null)
    setFollowings([])

    try {
      const username = searchUsername.replace('@', '')
      // Step 1: Lookup user to get user_id
      const userRes = await fetch(`/api/twitter/user-lookup?screen_name=${username}`)
      const userData = await userRes.json()
      if (!userRes.ok || !userData.id) {
        throw new Error(userData.error || userData.message || 'User not found')
      }
      const user_id = userData.id_str || userData.id
      // Step 2: Get followings by user_id
      const followingsRes = await fetch(`/api/twitter/following-list?user_id=${user_id}`)
      const followingsData = await followingsRes.json()
      if (!followingsRes.ok) {
        throw new Error(followingsData.error || followingsData.message || 'Failed to fetch followings')
      }
      if (!Array.isArray(followingsData.users)) {
        throw new Error('Invalid response format from server')
      }
      // Transform the data to match our table component's expectations
      const transformedData = followingsData.users.map((user: any) => ({
        id: user.id_str || user.id,
        name: user.name,
        screen_name: user.screen_name || user.username,
        profile_image_url_https: user.profile_image_url_https || user.profile_image_url,
        description: user.description || user.bio,
        followers_count: user.followers_count
      }))
      setFollowings(transformedData)
    } catch (error: any) {
      console.error('Search error:', error)
      setSearchError(error.message)
    } finally {
      setFollowingsLoading(false)
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
    <div className="flex min-h-screen w-full" style={{ backgroundColor:"#1f1f23"}}>
      {/* Left Sidebar */}
      {user && (
        <div className="flex flex-col justify-between h-screen border-r border-gray-700">
          {/* Top Bar */}
          <div className="h-16 flex items-center px-8 border-b border-gray-700">
            <span className="text-2xl font-bold text-white">intro</span>
          </div>
          {/* Sidebar Content */}
          <div className="flex-1 flex flex-col px-8 py-6">
            <div className="mb-8">
              <p className="text-xl font-bold text-white mb-1">Welcome {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}</p>
              {twitterUsername && (
                <p className="text-gray-400 flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-[#1DA1F2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  @{twitterUsername}
                </p>
              )}
              <p className="text-gray-400 text-sm whitespace-pre-line">
                {profile?.bio || 'fetched bio from the twitter account'}
              </p>
            </div>
            
            <nav className="flex flex-col gap-2 text-white">
              <a href="#" className="bg-gray-800 p-2 rounded-lg transition-colors">Twitter</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">Events</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">Organisation</a>
              <a href="#" className="hover:bg-gray-800 p-2 rounded-lg transition-colors">DAOs</a>
              
            </nav>
            <div className="flex-1" />
            <a href="#" className="text-white text-sm mt-8">Profile</a>
          </div>
          {/* Footer */}
          <div className="px-8 py-4 border-t border-gray-700">
            <p className="text-gray-400 text-xs">Terms | Privacy policy</p>
          </div>
        </div>
      )}
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        <div className="max-w-4xl w-full flex flex-col items-center px-4 py-8">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Connect with your next prospect</h2>
          <p className="text-gray-300 mb-8 text-center">Leverage your network, connect with anyone<br />with their twitter username</p>
          <form onSubmit={handleSearchSubmit} className="w-full flex flex-col items-center">
            <div className="flex w-full mb-4">
              <input
                type="text"
                placeholder="Type @username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                style={{ backgroundColor:"#1f1f23"}}
                className="flex-1 rounded-l-lg px-4 py-3 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
              />
              <button 
                type="submit" 
                className="rounded-r-lg px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center text-lg"
                disabled={followingsLoading}
              >
                {followingsLoading ? (
                  <LoadingSpinner className="w-6 h-6" />
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                )}
              </button>
            </div>
          </form>

          {searchError && (
            <div className="w-full mt-4">
              <ErrorDisplay message={searchError} compact={true} />
            </div>
          )}

          {followingsLoading ? (
            <div className="w-full mt-8 flex justify-center">
              <LoadingSpinner className="w-8 h-8" />
            </div>
          ) : (
            <FollowingsTable followings={followings} loading={false} />
          )}
        </div>
      </div>
    </div>
  )
}
