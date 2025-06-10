'use client'

import { useEffect, useState, useRef, FormEvent } from 'react'
import { useUser, UserButton } from '@clerk/nextjs'
import { LoginForm } from '@/components/auth/login-form'
import { getProfile } from '@/lib/profile'
import type { Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { FollowingsTable } from '@/components/twitter/followings-table'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import Sidebar from './Sidebar'
import SearchForm from './SearchForm'

export default function Home() {
  // --- State ---
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
  const [searchedProfile, setSearchedProfile] = useState<any | null>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // --- Effects ---
  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      const username = getTwitterUsername(user)
      if (username) {
        setTwitterUsername(username)
        // Pre-fetch followers for cache
        fetch(`/api/twitter/followers?username=${username}`)
      }
    }
  }, [isLoaded, user])

  useEffect(() => {
    if (followings.length > 0) setContentAtTop(true)
  }, [followings])

  // --- Handlers ---
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

  // Main search handler: looks up user, gets followings, filters by your followers
  async function handleSearchSubmit(e: FormEvent) {
    e.preventDefault()
    if (!searchUsername) return
    setFollowingsLoading(true)
    setSearchError(null)
    setFollowings([])
    setSearchedProfile(null)
    try {
      const username = searchUsername.replace('@', '')
      // 1. Lookup searched user
      const userData = await lookupTwitterUser(username)
      setSearchedProfile({
        name: userData.name,
        screen_name: userData.screen_name || userData.username,
        profile_image_url_https: userData.profile_image_url_https || userData.profile_image_url,
        description: userData.description || userData.bio,
        followers_count: userData.followers_count,
        friends_count: userData.friends_count,
        location: userData.location,
        url: userData.url,
        verified: userData.verified,
      })
      const user_id = userData.id_str || userData.id
      // 2. Get followings for searched user
      const followingsList = await fetchFollowings(user_id, username)
      // 3. Get your followers
      if (!twitterUsername) throw new Error('Your Twitter account is not connected')
      const followersList = await fetchFollowers(twitterUsername)
      // 4. Filter followings to mutuals
      const followerIds = new Set(followersList.map((u: any) => u.id_str || u.id))
      const mutuals = followingsList.filter((u: any) => followerIds.has(u.id_str || u.id))
      const transformed = mutuals.map(transformUser)
      setFollowings(transformed)
      if (transformed.length === 0) {
        setSearchError('No mutual connections found between your followers and the searched user\'s followings.')
      }
    } catch (error: any) {
      console.error('Search error:', error)
      setSearchError(error.message)
    } finally {
      setFollowingsLoading(false)
    }
  }

  // --- Render ---
  if (!isLoaded || (user && loading)) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }
  if (error) return <ErrorDisplay message={error} />

  return (
    <div className="flex min-h-screen w-full" style={{ backgroundColor: "#181818" }}>
      {/* Left Sidebar */}
      {user && (
        <Sidebar
          user={user}
          profile={profile}
          twitterUsername={twitterUsername}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        <div
          ref={rightPanelRef}
          className={`max-w-4xl w-full flex flex-col items-center px-4 py-8 transition-all duration-500 ${contentAtTop ? 'mt-0' : 'mt-[40vh]'}`}
          style={{ transitionProperty: 'margin-top', height: 'calc(100vh - 64px)', maxHeight: '900px', minHeight: '600px' }}
        >
          <h2 className="text-3xl text-white mb-2 text-center">Connect with your next prospect</h2>
          <p className="text-gray-300 mb-8 text-center">Leverage your network, connect with anyone<br />with their twitter username</p>
          <SearchForm
            value={searchUsername}
            onChange={setSearchUsername}
            onSubmit={handleSearchSubmit}
            loading={followingsLoading}
          />
          {/* Profile Card and Results Row */}
          <div className="w-full flex flex-row gap-8 items-start mt-2 h-full" style={{ minHeight: 0 }}>
            {/* Profile Card (left, 32%) */}
            {searchedProfile && (
              <div style={{ width: '32%', minWidth: 220, maxWidth: 320, marginTop: '40px' }} className="flex-shrink-0">
                <SearchedProfileCard user={searchedProfile} />
              </div>
            )}
            {/* Results (right, remaining space) */}
            <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1">
              {searchError && (
                <div className="w-full mt-2">
                  <ErrorDisplay message={searchError} compact={true} />
                </div>
              )}
              {followingsLoading ? (
                <div className="w-full mt-8 flex justify-center">
                  <LoadingSpinner className="w-8 h-8" />
                </div>
              ) : (
                <FollowingsTable followings={followings} loading={false} compact />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper: Extract Twitter username from Clerk user
function getTwitterUsername(user: any): string | null {
  const twitterAccount = user?.externalAccounts?.find(
    (account: any) => account.provider === 'twitter' || account.provider === 'x'
  )
  return twitterAccount?.username || null
}

// Helper: Transform Twitter user data for table
function transformUser(user: any) {
  return {
    id: user.id_str || user.id,
    name: user.name,
    screen_name: user.screen_name || user.username,
    profile_image_url_https: user.profile_image_url_https || user.profile_image_url,
    description: user.description || user.bio,
    followers_count: user.followers_count,
    friends_count: user.friends_count,
    verified: user.verified,
  }
}

// Helper: Fetch and cache followers for a username
async function fetchFollowers(username: string) {
  const res = await fetch(`/api/twitter/followers?username=${username}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to fetch followers')
  if (!Array.isArray(data.users)) throw new Error('Invalid response format from server (followers)')
  return data.users
}

// Helper: Lookup Twitter user by username
async function lookupTwitterUser(username: string) {
  const res = await fetch(`/api/twitter/user-lookup?screen_name=${username}`)
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error || data.message || 'User not found')
  return data
}

// Helper: Fetch followings for a user_id
async function fetchFollowings(user_id: string, username: string) {
  const res = await fetch(`/api/twitter/following-list?user_id=${user_id}&username=${username}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to fetch followings')
  if (!Array.isArray(data.users)) throw new Error('Invalid response format from server (followings)')
  return data.users
}
