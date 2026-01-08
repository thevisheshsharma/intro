'use client'

import React, { useState } from 'react'
import { BerriLoader } from '@/components/ui/BerriLoader'
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
    directAffiliatesFound: number;
    otherIndividualsFound: number;
    individualsFound: number;
    affiliatesFound: number;
    searchResultsFound: number;
    grokSuggestionsFound: number;
    followingAffiliatesFound: number;
    spamProfilesRemoved: number;
    grokOrganizationsRemoved?: number;
    rejectedProfilesCount: number;
    errorsEncountered: number;
  };
  individuals: any[];
  directAffiliates: any[];
  otherIndividuals: any[];
  rejectedProfiles: any[];
  grokAnalysisMetadata?: any[];
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
      const normalizedUsername = orgHandle.replace(/^@/, '').trim()
      setSearchStatus('Contacting API...')

      const response = await fetch('/api/find-from-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgUsername: normalizedUsername })
      })

      setSearchStatus('Processing results...')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.details || 'Failed to search organization')

      setResults(data)
      setSearchStatus('')
    } catch (err: any) {
      setError(err.message || 'An error occurred while searching')
      setSearchStatus('')
    } finally {
      setSearching(false)
      setSearchStatus('')
    }
  }

  const isValidHandle = orgHandle.trim().length > 0
  const showSearchForm = !results || error

  return (
    <div className="w-full flex flex-col items-center bg-gray-50 px-6 py-10 min-h-screen">
      {showSearchForm ? (
        <div className="flex flex-col items-center justify-center min-h-screen max-w-md w-full">
          <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Find from org</h2>
          <p className="text-gray-500 mb-8 text-center">
            Discover people associated with an organisation<br />using their Twitter handle
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-4">
            <input
              type="text"
              value={orgHandle}
              onChange={(e) => setOrgHandle(e.target.value)}
              placeholder="Enter the organisation's Twitter handle"
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-berri-raspberry/20 focus:border-berri-raspberry transition-all shadow-sm"
              disabled={searching}
            />

            <button
              type="submit"
              disabled={!isValidHandle || searching}
              className="w-full bg-berri-raspberry hover:bg-berri-raspberry/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl transition-all shadow-md shadow-berri-raspberry/25 flex items-center justify-center gap-2 font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search
            </button>
          </form>

          {/* Inline Loading State */}
          {searching && (
            <div className="mt-8 w-full bg-white rounded-2xl border border-gray-100 p-8 flex flex-col items-center">
              <BerriLoader
                steps={[
                  'Fetching organization profile',
                  'Discovering associated people',
                  'Classifying relationships',
                  'Filtering results'
                ]}
                currentStep={
                  searchStatus.includes('Initializing') ? 0 :
                    searchStatus.includes('Contacting') ? 1 :
                      searchStatus.includes('Processing') ? 2 : 3
                }
                size="md"
              />
              <p className="text-gray-500 text-sm mt-4">
                {searchStatus || 'Analyzing organization...'}
              </p>
            </div>
          )}

          {error && (
            <div className="mt-6 w-full">
              <ErrorDisplay message={error} />
              <button onClick={() => setError(null)} className="mt-4 text-berri-raspberry hover:text-berri-coral transition-colors font-medium">
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-6xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Results for @{results.orgUsername}</h2>
            <button
              onClick={() => { setResults(null); setError(null); setOrgHandle('') }}
              className="text-berri-raspberry hover:text-berri-coral transition-colors flex items-center gap-2 mx-auto font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              Search another organization
            </button>
          </div>

          {/* Summary Stats */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
              <svg className="w-6 h-6 text-berri-raspberry mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
              <div className="text-2xl font-bold text-gray-900">{results.summary.totalProfilesFound}</div>
              <div className="text-sm text-gray-500">Relevant Found</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{results.summary.individualsFound}</div>
              <div className="text-sm text-gray-500">Individuals</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-5 text-center shadow-sm">
              <div className="text-2xl font-bold text-amber-600">{results.summary.rejectedProfilesCount || 0}</div>
              <div className="text-sm text-gray-500">Rejected</div>
            </div>
          </div>

          {/* Data Sources */}
          <div className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { value: results.summary.affiliatesFound, label: 'API Affiliates', color: 'text-amber-600' },
              { value: results.summary.searchResultsFound, label: 'Search Results', color: 'text-orange-600' },
              { value: results.summary.grokSuggestionsFound, label: 'AI Suggestions', color: 'text-pink-600' },
              { value: results.summary.followingAffiliatesFound, label: 'Following List', color: 'text-cyan-600' }
            ].map((item, i) => (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 text-center shadow-sm">
                <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
              </div>
            ))}
          </div>

          {/* AI Analysis Stats */}
          {results.summary.grokOrganizationsRemoved !== undefined && results.summary.grokOrganizationsRemoved > 0 && (
            <div className="mb-6 bg-purple-50 border border-purple-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-4 bg-purple-500 rounded" />
                <h3 className="text-purple-900 font-semibold">AI Analysis Results</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-purple-800"><span className="font-medium">{results.summary.grokOrganizationsRemoved}</span> organization accounts filtered</div>
                <div className="text-purple-800"><span className="font-medium">{results.summary.individualsFound}</span> individuals with roles extracted</div>
              </div>
            </div>
          )}

          {/* Warnings */}
          {results.errors && results.errors.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <h3 className="text-amber-900 font-semibold">Warnings</h3>
              </div>
              <ul className="text-amber-800 text-sm space-y-1">
                {results.errors.map((error, idx) => <li key={idx}>• {error}</li>)}
              </ul>
            </div>
          )}

          {/* Results Layout */}
          <div className="flex flex-row gap-8 items-start">
            {results.orgProfile && (
              <div style={{ width: '25%', minWidth: 200, maxWidth: 280 }} className="flex-shrink-0">
                <SearchedProfileCard user={transformTwitterUser(results.orgProfile)} />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {(results.directAffiliates?.length > 0) || (results.otherIndividuals?.length > 0) ? (
                <div className="space-y-8">
                  {results.directAffiliates?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900">Direct Employees ({results.directAffiliates.length})</h3>
                        <span className="text-sm text-gray-500">(Currently at @{results.orgUsername})</span>
                      </div>
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                        <FollowingsTable followings={results.directAffiliates.map(transformTwitterUser)} loading={false} compact />
                      </div>
                    </div>
                  )}

                  {results.otherIndividuals?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900">Related Individuals ({results.otherIndividuals.length})</h3>
                        <span className="text-sm text-gray-500">(Associated but not current employees)</span>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                        <FollowingsTable followings={results.otherIndividuals.map(transformTwitterUser)} loading={false} compact />
                      </div>
                    </div>
                  )}

                  {results.rejectedProfiles?.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        <h3 className="text-lg font-semibold text-gray-900">Rejected Profiles ({results.rejectedProfiles.length})</h3>
                      </div>
                      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                        <p className="text-amber-800 text-sm mb-4">Profiles filtered for: organization accounts, spam, or no name match.</p>
                        <FollowingsTable followings={results.rejectedProfiles.map(transformTwitterUser)} loading={false} compact />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No associated people found</h3>
                  <p className="text-gray-500">Limited public employee data or private profiles.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
