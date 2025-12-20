'use client'

import { useState, useRef, useCallback, type FormEvent, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { ErrorDisplay } from '@/components/ui/error-display'
import { EnhancedMutualsTable } from '@/components/twitter/enhanced-mutuals-table'
import { DirectConnectionsSection } from '@/components/twitter/direct-connections-section'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import SearchForm from '../SearchForm'
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

export default function TwitterPage() {
  const { user, isLoaded } = useUser()
  const [searchUsername, setSearchUsername] = useState('')
  const [followingsLoading, setFollowingsLoading] = useState(false)
  const [followings, setFollowings] = useState<any[]>([])
  const [directConnections, setDirectConnections] = useState<DirectConnections | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [contentAtTop, setContentAtTop] = useState(false)
  const [searchedProfile, setSearchedProfile] = useState<any | null>(null)
  const [twitterUsername, setTwitterUsername] = useState<string | null>(null)
  const rightPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isLoaded && user) {
      const username = extractTwitterUsername(user)
      if (username) {
        setTwitterUsername(username)
      }
    }
  }, [isLoaded, user])

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

      // 1. Lookup searched user for display
      const userData = await lookupTwitterUser(username)
      setSearchedProfile(transformTwitterUser(userData))

      // 2. Use the find-mutuals API
      const response = await fetch('/api/find-mutuals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          loggedInUserUsername: twitterUsername,
          searchUsername: username
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to find mutual connections')
      }

      // Store introducers (legacy mutuals field) for the table
      setFollowings(data.mutuals || [])

      // Store direct connections for the new section
      if (data.directConnections) {
        setDirectConnections(data.directConnections)
      }

      // Check if no results at all
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

  useEffect(() => {
    if (followings.length > 0) setContentAtTop(true)
  }, [followings])

  return (
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

          {/* Direct Connections Section (Your connections to the prospect) */}
          {directConnections && (
            <DirectConnectionsSection
              connections={directConnections}
              prospectScreenName={searchUsername.replace('@', '')}
              loading={followingsLoading}
            />
          )}

          {/* Introducers Table (People who can introduce you) */}
          {followings.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                People who can introduce you
              </h3>
              <EnhancedMutualsTable
                mutuals={followings}
                loading={followingsLoading}
                searchedUserScreenName={searchUsername.replace('@', '')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
