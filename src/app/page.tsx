'use client'

import { useEffect, useState, useRef, useCallback, type FormEvent } from 'react'
import { useUser } from '@clerk/nextjs'
import { getProfile, type Profile } from '@/lib/profile'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { FollowingsTable } from '@/components/twitter/followings-table'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import Sidebar from './Sidebar'
import SearchForm from './SearchForm'
import ManageOrgPanel from '@/components/icp/manage-org-panel'
import FindFromOrgPanel from '@/components/icp/find-from-org-panel'
import { 
  extractTwitterUsername, 
  transformTwitterUser, 
  fetchFollowers, 
  lookupTwitterUser, 
  fetchFollowings 
} from '@/lib/twitter-helpers'

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
  const [selectedPanel, setSelectedPanel] = useState<'twitter' | 'manage-org' | 'find-from-org'>('twitter')
  const rightPanelRef = useRef<HTMLDivElement>(null)

  // --- Handlers ---
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

  const handleSearchSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!searchUsername || !twitterUsername) return
    
    setFollowingsLoading(true)
    setSearchError(null)
    setFollowings([])
    setSearchedProfile(null)
    
    try {
      const username = searchUsername.replace('@', '')
      
      // 1. Lookup searched user
      const userData = await lookupTwitterUser(username)
      setSearchedProfile(transformTwitterUser(userData))
      const user_id = userData.id_str || userData.id
      
      // 2. Get followings for searched user and your followers in parallel
      const [followingsList, followersList] = await Promise.all([
        fetchFollowings(user_id, username),
        fetchFollowers(twitterUsername)
      ])
      
      // 3. Filter followings to mutuals
      const followerIds = new Set(followersList.map((u: any) => u.id_str || u.id))
      const mutuals = followingsList.filter((u: any) => followerIds.has(u.id_str || u.id))
      const transformed = mutuals.map(transformTwitterUser)
      
      setFollowings(transformed)
      
      if (transformed.length === 0) {
        setSearchError('No mutual connections found between your followers and the searched user\'s followings.')
      }
    } catch (error: any) {
      setSearchError(error.message)
    } finally {
      setFollowingsLoading(false)
    }
  }, [searchUsername, twitterUsername])

  // --- Effects ---
  useEffect(() => {
    if (isLoaded && user) {
      loadProfile()
      const username = extractTwitterUsername(user)
      if (username) {
        setTwitterUsername(username)
        // Pre-fetch followers for cache
        fetchFollowers(username).catch(() => {}) // Silent fail for background cache
      }
    }
  }, [isLoaded, user, loadProfile])

  useEffect(() => {
    if (followings.length > 0) setContentAtTop(true)
  }, [followings])

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
    <div className="flex min-h-screen w-full bg-[#181818]">
      {/* Left Sidebar */}
      {user && (
        <Sidebar
          user={user}
          profile={profile}
          twitterUsername={twitterUsername}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
          selectedPanel={selectedPanel}
          setSelectedPanel={setSelectedPanel}
        />
      )}
      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center overflow-y-auto">
        {selectedPanel === 'twitter' ? (
          <div
            ref={rightPanelRef}
            className={`max-w-4xl w-full flex flex-col items-center px-4 py-8 transition-all duration-500 ${
              contentAtTop ? 'mt-0' : 'mt-[40vh]'
            }`}
            style={{ 
              transitionProperty: 'margin-top', 
              height: 'calc(100vh - 64px)', 
              maxHeight: '900px', 
              minHeight: '600px' 
            }}
          >
            <h2 className="text-3xl text-white mb-2 text-center">
              Connect with your next prospect
            </h2>
            <p className="text-gray-300 mb-8 text-center">
              Leverage your network, connect with anyone<br />
              with their twitter username
            </p>
            <SearchForm
              value={searchUsername}
              onChange={setSearchUsername}
              onSubmit={handleSearchSubmit}
              loading={followingsLoading}
            />
            {/* Profile Card and Results Row */}
            <div className="w-full flex flex-row gap-8 items-start mt-2 h-full" style={{ minHeight: 0 }}>
              {/* Profile Card (left, 25%) */}
              {searchedProfile && (
                <div 
                  style={{ width: '25%', minWidth: 200, maxWidth: 280, marginTop: '45px' }} 
                  className="flex-shrink-0"
                >
                  <SearchedProfileCard user={searchedProfile} />
                </div>
              )}
              {/* Results (center, remaining space) */}
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
        ) : selectedPanel === 'manage-org' ? (
          <div className="w-full flex flex-col items-center px-4 py-8">
            <ManageOrgPanel />
          </div>
        ) : (
          <div className="w-full flex flex-col items-center px-4 py-8">
            <FindFromOrgPanel />
          </div>
        )}
      </div>
    </div>
  )
}
