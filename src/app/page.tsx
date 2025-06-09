'use client'

import { useEffect, useState, useRef } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
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
  const [contentAtTop, setContentAtTop] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      const twitterAccount = user.externalAccounts?.find(
        account => account.provider === 'twitter' || account.provider === 'x'
      )
      if (twitterAccount?.username) {
        setTwitterUsername(twitterAccount.username)
        // Fetch and cache followers on login
        fetch(`/api/twitter/followers?username=${twitterAccount.username}`)
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

      // Step 2: Get followings by user_id (searched user)
      const followingsRes = await fetch(`/api/twitter/following-list?user_id=${user_id}&username=${username}`)
      const followingsData = await followingsRes.json()
      if (!followingsRes.ok) {
        throw new Error(followingsData.error || followingsData.message || 'Failed to fetch followings')
      }
      if (!Array.isArray(followingsData.users)) {
        throw new Error('Invalid response format from server (followings)')
      }
      // Step 3: Get followers of logged-in user (from cache if possible)
      if (!twitterUsername) throw new Error('Your Twitter account is not connected')
      const followersRes = await fetch(`/api/twitter/followers?username=${twitterUsername}`)
      const followersData = await followersRes.json()
      if (!followersRes.ok) {
        throw new Error(followersData.error || followersData.message || 'Failed to fetch your followers')
      }
      if (!Array.isArray(followersData.users)) {
        throw new Error('Invalid response format from server (followers)')
      }
      // Build a Set of follower IDs for fast lookup
      const followerIds = new Set(followersData.users.map((u: any) => u.id_str || u.id))
      // Filter followings to only those who are also in your followers
      const filtered = followingsData.users.filter((user: any) => followerIds.has(user.id_str || user.id))
      // Transform the data to match our table component's expectations
      const transformedData = filtered.map((user: any) => ({
        id: user.id_str || user.id,
        name: user.name,
        screen_name: user.screen_name || user.username,
        profile_image_url_https: user.profile_image_url_https || user.profile_image_url,
        description: user.description || user.bio,
        followers_count: user.followers_count
      }))
      setFollowings(transformedData)
      if (transformedData.length === 0) {
        setSearchError('No mutual connections found between your followers and the searched user\'s followings.')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      setSearchError(error.message)
    } finally {
      setFollowingsLoading(false)
    }
  }

  // Animate right panel position on search
  useEffect(() => {
    if (followings.length > 0) {
      setContentAtTop(true)
    }
  }, [followings])

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
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "#181818" }}>
      {/* Left Sidebar */}
      {user && (
        <div className={`flex flex-col justify-between h-screen border-r border-gray-700 sticky top-0 left-0 transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-[280px]'} bg-[#181818]`} style={{ maxWidth: sidebarCollapsed ? 80 : 320, minWidth: sidebarCollapsed ? 80 : 280 }}>
          {/* Top Bar */}
          <div className="h-16 flex items-center px-4 border-b border-gray-700 justify-between">
            <span className="text-2xl font-bold text-white">intro</span>
            <button
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed((c) => !c)}
              className="ml-2 p-2 rounded hover:bg-gray-800 transition-colors"
            >
              {sidebarCollapsed ? (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
              )}
            </button>
          </div>
          {/* Sidebar Content */}
          <div className={`flex-1 flex flex-col ${sidebarCollapsed ? 'items-center px-0 py-4' : 'px-8 py-6'}`}>
            <div className={`mb-8 w-full ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
              {!sidebarCollapsed && (
                <>
                  <p className="text-xl text-white mb-1">Welcome {user.firstName || user.emailAddresses[0]?.emailAddress || 'User'}</p>
                  {twitterUsername && (
                    <p className="text-gray-400 flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-[#1DA1F2]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      @{twitterUsername}
                    </p>
                  )}
                  <p className="text-gray-400 text-sm whitespace-pre-line">{profile?.bio || ''}</p>
                </>
              )}
            </div>
            <nav className={`flex flex-col gap-2 text-white w-full ${sidebarCollapsed ? 'items-center' : ''}`}>
              {/* Sidebar menu items */}
              {[
                {
                  key: 'twitter',
                  label: 'Twitter',
                  icon: (
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M22.46 6c-.77.35-1.6.59-2.47.7a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04A4.28 4.28 0 0 0 16.11 4c-2.37 0-4.29 1.92-4.29 4.29 0 .34.04.67.11.99C7.69 9.13 4.07 7.38 1.64 4.7c-.37.64-.58 1.38-.58 2.17 0 1.5.76 2.82 1.92 3.6-.71-.02-1.38-.22-1.97-.54v.05c0 2.1 1.5 3.85 3.5 4.25-.36.1-.74.16-1.13.16-.28 0-.54-.03-.8-.08.54 1.7 2.1 2.94 3.95 2.97A8.6 8.6 0 0 1 2 19.54c-.65 0-1.28-.04-1.9-.11A12.13 12.13 0 0 0 7.29 21.5c7.55 0 11.68-6.26 11.68-11.68 0-.18-.01-.36-.02-.54A8.18 8.18 0 0 0 22.46 6z" /></svg>
                  ),
                },
                {
                  key: 'events',
                  label: 'Events',
                  icon: (
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" /></svg>
                  ),
                },
                {
                  key: 'organisation',
                  label: 'Organisation',
                  icon: (
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 0 0-3-3.87M9 20H4v-2a4 4 0 0 1 3-3.87m9-4V7a4 4 0 1 0-8 0v2m12 4a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                  ),
                },
                {
                  key: 'daos',
                  label: 'DAOs',
                  icon: (
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h4v4m0-4V8" /></svg>
                  ),
                },
              ].map((item) => (
                <a
                  key={item.key}
                  href="#"
                  className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${sidebarCollapsed ? 'justify-center' : ''} ${item.key === 'twitter' ? 'bg-[#343434]' : ''}`}
                  style={{ minHeight: 44, background: item.key === 'twitter' ? '#343434' : 'none' }}
                >
                  {item.icon}
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                </a>
              ))}
            </nav>
            <div className="flex-1" />
            {/* Profile management moved here */}
            <div className={`mt-8 flex items-center ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <UserButton afterSignOutUrl="/" />
              {!sidebarCollapsed && <span className="ml-2 text-white text-sm">Profile</span>}
            </div>
          </div>
          {/* Footer */}
          <div className={`px-8 py-4 border-t border-gray-700 ${sidebarCollapsed ? 'px-0 flex justify-center' : ''}`}>
            {!sidebarCollapsed && <p className="text-gray-400 text-xs">Terms | Privacy policy</p>}
          </div>
        </div>
      )}
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        <div
          ref={rightPanelRef}
          className={`max-w-4xl w-full flex flex-col items-center px-4 py-8 transition-all duration-500 ${contentAtTop ? 'mt-0' : 'mt-[40vh]'}`}
          style={{ transitionProperty: 'margin-top' }}
        >
          <h2 className="text-3xl text-white mb-2 text-center">Connect with your next prospect</h2>
          <p className="text-gray-300 mb-8 text-center">Leverage your network, connect with anyone<br />with their twitter username</p>
          <form onSubmit={handleSearchSubmit} className="w-full flex flex-col items-center">
            <div className="flex w-full mb-4">
              <input
                type="text"
                placeholder="Type @username"
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                style={{ backgroundColor: "#181818" }}
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
