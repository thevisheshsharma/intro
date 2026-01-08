'use client'

import { useState, useRef, useCallback, type FormEvent, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { ErrorDisplay } from '@/components/ui/error-display'
import { EnhancedMutualsTable } from '@/components/twitter/enhanced-mutuals-table'
import { DirectConnectionsSection } from '@/components/twitter/direct-connections-section'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { QuickActions } from '@/components/QuickActions'
import SearchForm from '@/components/SearchForm'
import DashboardHeader from '@/components/dashboard/DashboardHeader'
import { FeatureGate } from '@/components/FeatureGate'
import { BerriLoader } from '@/components/ui/BerriLoader'
import {
  extractTwitterUsername,
  transformTwitterUser,
  lookupTwitterUser,
} from '@/lib/twitter-helpers'

// Types for the API response
interface DirectConnections {
  orgDirect: any[]
  orgIndirect: any[]
  sharedThirdParty: any[]
  chainAffinity: any[]
}

interface UserStats {
  followers: number
  following: number
  berriPoints: number
}

export default function TwitterPage() {
  const { user, ready, authenticated } = usePrivy()
  const [searchUsername, setSearchUsername] = useState('')
  const [followingsLoading, setFollowingsLoading] = useState(false)
  const [followings, setFollowings] = useState<any[]>([])
  const [directConnections, setDirectConnections] = useState<DirectConnections | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchedProfile, setSearchedProfile] = useState<any | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)
  const [userStats, setUserStats] = useState<UserStats>({ followers: 0, following: 0, berriPoints: 0 })
  const [userProfile, setUserProfile] = useState<{ department?: string } | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const hasResults = searchedProfile || followings.length > 0

  useEffect(() => {
    if (ready && authenticated && user) {
      const username = extractTwitterUsername(user)
      if (username) {
        setTwitterUsername(username)
        // Fetch user stats when we have the username
        fetchUserStats(username)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, authenticated, user])

  // Fetch user stats from the API
  const fetchUserStats = async (username: string) => {
    try {
      // Use the existing lookupTwitterUser helper
      const data = await lookupTwitterUser(username)
      if (data) {
        setUserStats({
          followers: data.followers_count || 0,
          following: data.friends_count || 0,
          berriPoints: calculateBerriPoints(data) // Calculate based on profile completion + network
        })
        setUserProfile({
          department: data.department || data.description?.match(/\b(Marketing|Engineering|Design|Sales|Product|Growth|BD|Operations|Finance|HR|Legal|CEO|CTO|CFO|COO|CMO|Founder|Co-Founder)\b/i)?.[1] || undefined
        })
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    }
  }

  // Calculate Berri Points based on the formula
  const calculateBerriPoints = (userData: any): number => {
    let points = 100 // Base signup points

    // Part 1: Setup points
    if (userData.screen_name) points += 500 // Connected X
    // Discord/Telegram would add +750 each when connected

    // Part 2: Network power (simplified)
    const followers = userData.followers_count || 0
    const following = userData.friends_count || 0

    // Reputation bonus for high follower count
    if (followers >= 10000) points += 500
    else if (followers >= 5000) points += 250
    else if (followers >= 1000) points += 100

    // Network size contribution
    points += Math.floor(followers / 100) + Math.floor(following / 200)

    // Part 3: Activity multiplier (placeholder - grows with usage)
    const activityMultiplier = 1.0

    return Math.floor(points * activityMultiplier)
  }

  const handleSearchSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!searchUsername || !twitterUsername) return

    setFollowingsLoading(true)
    setSearchError(null)
    setFollowings([])
    setDirectConnections(null)
    setSearchedProfile(null)

    try {
      const username = searchUsername.replace('@', '')
      const userData = await lookupTwitterUser(username)
      setSearchedProfile(transformTwitterUser(userData))

      const response = await fetch('/api/find-mutuals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loggedInUserUsername: twitterUsername,
          searchUsername: username
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find mutual connections')
      }

      setFollowings(data.mutuals || [])
      if (data.directConnections) {
        setDirectConnections(data.directConnections)
      }

      const totalConnections = (data.mutuals?.length || 0) + (data.counts?.directConnections || 0)
      if (totalConnections === 0) {
        setSearchError('No connections found between you and the searched user.')
      }
    } catch (error: any) {
      setSearchError(error.message)
    } finally {
      setFollowingsLoading(false)
    }
  }, [searchUsername, twitterUsername])

  const focusSearch = () => {
    searchInputRef.current?.focus()
  }

  return (
    <FeatureGate feature="pathfinder">
      <div className="min-h-screen py-8 px-6 lg:px-10">
        <div className="max-w-4xl mx-auto">
          {/* Dashboard Header with Date, Profile Card, Stats */}
          <DashboardHeader
            user={{
              firstName: twitterUsername || undefined,
              imageUrl: undefined // Privy doesn't provide profile images directly
            }}
            profile={userProfile}
            stats={userStats}
          />

          {/* Search - Width = 2 quick action cards + 1 gap */}
          <section className="mb-8" style={{ width: hasResults ? '100%' : 'calc((100% - 40px) * 2/3 + 20px)' }}>
            <SearchForm
              ref={searchInputRef}
              value={searchUsername}
              onChange={setSearchUsername}
              onSubmit={handleSearchSubmit}
              loading={followingsLoading}
            />
          </section>

          {/* Quick Actions - only show when no results and not loading */}
          {!hasResults && !followingsLoading && (
            <section className="mb-10">
              <QuickActions onSearchFocus={focusSearch} />
            </section>
          )}

          {/* Inline Loading State */}
          {followingsLoading && !hasResults && (
            <section className="mb-10">
              <div className="bg-white rounded-2xl border border-gray-100 p-12 flex flex-col items-center justify-center">
                <BerriLoader
                  steps={[
                    'Analyzing profiles',
                    'Mapping connections',
                    'Calculating relevancy',
                    'Finding warm paths'
                  ]}
                  currentStep={1}
                  size="md"
                />
                <p className="text-gray-500 text-sm mt-4">
                  Discovering paths to @{searchUsername.replace('@', '')}...
                </p>
              </div>
            </section>
          )}

          {/* Error */}
          {searchError && (
            <div className="mb-6">
              <ErrorDisplay message={searchError} compact={true} />
            </div>
          )}

          {/* Results */}
          {hasResults && (
            <section className="space-y-6">
              {/* Profile + Connections Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Profile Card */}
                {searchedProfile && (
                  <div className="lg:col-span-4">
                    <SearchedProfileCard user={searchedProfile} />
                  </div>
                )}

                {/* Direct Connections */}
                <div className={searchedProfile ? 'lg:col-span-8' : 'lg:col-span-12'}>
                  {directConnections && (
                    <DirectConnectionsSection
                      connections={directConnections}
                      prospectScreenName={searchUsername.replace('@', '')}
                      loading={followingsLoading}
                    />
                  )}
                </div>
              </div>

              {/* Introducers Table */}
              {followings.length > 0 && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-[15px] font-semibold text-gray-900">
                      People who can introduce you
                    </h2>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {followings.length} mutual connection{followings.length !== 1 ? 's' : ''} found
                    </p>
                  </div>
                  <div className="p-6">
                    <EnhancedMutualsTable
                      mutuals={followings}
                      loading={followingsLoading}
                      searchedUserScreenName={searchUsername.replace('@', '')}
                    />
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </FeatureGate>
  )
}
