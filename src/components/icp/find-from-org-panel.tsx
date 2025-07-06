'use client'

import React, { useState } from 'react'
import { Search, Loader, Users, AlertCircle, CheckCircle, Building2, User } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { FollowingsTable } from '@/components/twitter/followings-table'
import { transformTwitterUser } from '@/lib/twitter-helpers'

interface SearchResults {
  success: boolean;
  orgUsername: string;
  orgProfile: any;
  summary: {
    totalProfilesFound: number;
    organizationsFound: number;
    individualsFound: number;
    affiliatesFound: number;
    searchResultsFound: number;
    grokSuggestionsFound: number;
    followingAffiliatesFound: number;
    spamProfilesRemoved: number;
    errorsEncountered: number;
  };
  profiles: any[];
  organizations: any[];
  individuals: any[];
  spamProfiles: any[];
  errors?: string[];
}

export default function FindFromOrgPanel() {
  const [orgHandle, setOrgHandle] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchStatus, setSearchStatus] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgHandle.trim()) return

    setSearching(true)
    setError(null)
    setResults(null)
    setSearchStatus('Initializing search...')

    try {
      // Normalize username: remove '@' and trim
      const normalizedUsername = orgHandle.replace(/^@/, '').trim()
      
      console.log('🔍 Searching for organization:', normalizedUsername)
      setSearchStatus('Contacting API...')

      const response = await fetch('/api/find-from-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          orgUsername: normalizedUsername
        })
      })

      setSearchStatus('Processing results...')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to search organization')
      }

      setResults(data)
      setSearchStatus('')
      console.log('✅ Search completed:', data.summary)

    } catch (err: any) {
      console.error('❌ Search error:', err)
      setError(err.message || 'An error occurred while searching')
      setSearchStatus('')
    } finally {
      setSearching(false)
      setSearchStatus('')
    }
  }

  const isValidHandle = orgHandle.trim().length > 0

  // Show search form if no results or if there was an error
  const showSearchForm = !results || error

  return (
    <div className="w-full flex flex-col items-center bg-[#181818] px-4 py-8 min-h-screen">
      {showSearchForm ? (
        // Search Form View
        <div className="flex flex-col items-center justify-center min-h-screen max-w-md w-full">
          <h2 className="text-3xl text-white mb-2 text-center">
            Find from org
          </h2>
          <p className="text-gray-300 mb-8 text-center">
            Discover people associated with an organisation<br />
            using their Twitter handle
          </p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <div className="relative">
              <input
                type="text"
                value={orgHandle}
                onChange={(e) => setOrgHandle(e.target.value)}
                placeholder="Enter the organisation's Twitter handle"
                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={searching}
              />
            </div>
            
            <button
              type="submit"
              disabled={!isValidHandle || searching}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  {searchStatus || 'Searching...'}
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </button>
          </form>

          {/* Error Display */}
          {error && (
            <div className="mt-6 w-full">
              <ErrorDisplay message={error} />
              <button
                onClick={() => setError(null)}
                className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
              >
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        // Results View
        <div className="w-full max-w-6xl">
          {/* Header with Search Again Option */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl text-white mb-2">
              Results for @{results.orgUsername}
            </h2>
            <button
              onClick={() => {
                setResults(null)
                setError(null)
                setOrgHandle('')
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-2 mx-auto"
            >
              <Search className="w-4 h-4" />
              Search another organization
            </button>
          </div>

          {/* Summary Stats */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
              <Users className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{results.summary.totalProfilesFound}</div>
              <div className="text-sm text-gray-400">Total Valid</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{results.summary.organizationsFound}</div>
              <div className="text-sm text-gray-400">Organizations</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{results.summary.individualsFound}</div>
              <div className="text-sm text-gray-400">Individuals</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{results.summary.spamProfilesRemoved || 0}</div>
              <div className="text-sm text-gray-400">Spam Filtered</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-yellow-400">{results.summary.affiliatesFound}</div>
              <div className="text-xs text-gray-400">API Affiliates</div>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-400">{results.summary.searchResultsFound}</div>
              <div className="text-xs text-gray-400">Search Results</div>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-pink-400">{results.summary.grokSuggestionsFound}</div>
              <div className="text-xs text-gray-400">AI Suggestions</div>
            </div>
            <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-cyan-400">{results.summary.followingAffiliatesFound}</div>
              <div className="text-xs text-gray-400">Following List</div>
            </div>
          </div>

          {/* Spam Filter Info */}
          {results.summary.spamProfilesRemoved > 0 && (
            <div className="mb-6 bg-blue-900/30 border border-blue-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-400" />
                <h3 className="text-blue-200 font-semibold">Spam Filtering Applied</h3>
              </div>
              <p className="text-blue-100 text-sm">
                {results.summary.spamProfilesRemoved} account{results.summary.spamProfilesRemoved !== 1 ? 's' : ''} with fewer than 10 followers AND fewer than 10 following were filtered out to improve result quality.
              </p>
            </div>
          )}

          {/* Warnings/Errors */}
          {results.errors && results.errors.length > 0 && (
            <div className="mb-6 bg-yellow-900/50 border border-yellow-600 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h3 className="text-yellow-200 font-semibold">
                  {results.errors.some(e => e.includes('not available')) ? 'Info' : 'Warnings'}
                </h3>
              </div>
              <ul className="text-yellow-100 text-sm space-y-1">
                {results.errors.map((error, idx) => (
                  <li key={idx}>
                    • {error.includes('Affiliates API not available') 
                      ? 'Some data sources were unavailable, but we found results using alternative methods'
                      : error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Results Layout */}
          <div className="flex flex-row gap-8 items-start">
            {/* Organization Profile Card (left, 25%) */}
            {results.orgProfile && (
              <div 
                style={{ width: '25%', minWidth: 200, maxWidth: 280 }} 
                className="flex-shrink-0"
              >
                <SearchedProfileCard user={transformTwitterUser(results.orgProfile)} />
              </div>
            )}

            {/* People Results (right, remaining space) */}
            <div className="flex-1 min-w-0">
              {results.profiles.length > 0 ? (
                <div className="space-y-8">
                  {/* Organizations Section */}
                  {results.organizations && results.organizations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <Building2 className="w-5 h-5 text-purple-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Organizations ({results.organizations.length})
                        </h3>
                        <span className="text-sm text-gray-400">
                          (Verified business accounts)
                        </span>
                      </div>
                      <div className="bg-purple-900/20 border border-purple-800 rounded-lg p-4">
                        <FollowingsTable 
                          followings={results.organizations.map(transformTwitterUser)} 
                          loading={false} 
                          compact 
                        />
                      </div>
                    </div>
                  )}

                  {/* Individuals Section */}
                  {results.individuals && results.individuals.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <User className="w-5 h-5 text-green-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Individuals ({results.individuals.length})
                        </h3>
                        <span className="text-sm text-gray-400">
                          (Personal accounts)
                        </span>
                      </div>
                      <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                        <FollowingsTable 
                          followings={results.individuals.map(transformTwitterUser)} 
                          loading={false} 
                          compact 
                        />
                      </div>
                    </div>
                  )}

                  {/* Combined view fallback (if categorization data is missing) */}
                  {(!results.organizations && !results.individuals) && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Associated People ({results.profiles.length})
                        </h3>
                      </div>
                      <FollowingsTable 
                        followings={results.profiles.map(transformTwitterUser)} 
                        loading={false} 
                        compact 
                      />
                    </div>
                  )}

                  {/* Spam Filtered Profiles Section */}
                  {results.spamProfiles && results.spamProfiles.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <h3 className="text-xl font-semibold text-white">
                          Spam Filtered ({results.spamProfiles.length})
                        </h3>
                        <span className="text-sm text-gray-400">
                          (Accounts with &lt;10 followers and &lt;10 following)
                        </span>
                      </div>
                      <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                        <p className="text-red-200 text-sm mb-4">
                          These accounts were automatically filtered out as they appear to be spam or inactive accounts.
                        </p>
                        <FollowingsTable 
                          followings={results.spamProfiles.map(transformTwitterUser)} 
                          loading={false} 
                          compact 
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">No associated people found</h3>
                  <p className="text-gray-400">
                    We couldn&apos;t find any people associated with this organization.
                    This could mean the organization is private or has limited public associations.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
