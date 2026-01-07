// ManageOrgPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { EnhancedICPDisplay } from '@/components/icp/enhanced-icp-display'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { lookupTwitterUser, transformTwitterUser } from '../../lib/twitter-helpers'
import SearchForm from '@/components/SearchForm'

interface Organization {
  id: string
  name: string
  twitter_username: string
  created_at?: string
  updated_at?: string
}

export default function ManageOrgPanel() {
  const { user, ready, authenticated, getAccessToken } = usePrivy()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [icp, setIcp] = useState<Record<string, any> | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgTwitterProfile, setOrgTwitterProfile] = useState<any | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)

  const isICPAnalysisStale = (icp: Record<string, any> | null): boolean => {
    const timestamp = icp?.timestamp_utc || icp?.last_icp_analysis
    if (!timestamp) return true
    const lastAnalysis = new Date(timestamp)
    const now = new Date()
    const daysDiff = (now.getTime() - lastAnalysis.getTime()) / (1000 * 60 * 60 * 24)
    return daysDiff > 60
  }

  useEffect(() => {
    if (ready && authenticated && user) loadOrganizationData()
  }, [ready, authenticated, user])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      setError(null)
      const lastSearched = localStorage.getItem('lastSearchedOrg')
      if (lastSearched) {
        setSearchValue(lastSearched)
        try {
          const userData = await lookupTwitterUser(lastSearched)
          const profile = transformTwitterUser(userData)
          setOrgTwitterProfile(profile)
        } catch (e) { }
        const response = await fetch(`/api/organization-icp-analysis/save?twitter_username=${lastSearched}`)
        const data = await response.json()
        if (response.ok && data.organization) {
          setOrganization(data.organization)
          if (data.icp && !isICPAnalysisStale(data.icp)) setIcp(data.icp)
        }
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeICP = async () => {
    try {
      setAnalyzing(true)
      setError(null)
      setSuccess(null)

      let usernameToAnalyze = ''
      if (organization) usernameToAnalyze = organization.twitter_username.replace(/^@/, '').toLowerCase()
      else if (searchValue) usernameToAnalyze = searchValue.replace(/^@/, '').toLowerCase()
      else { setError('Please search for an organization first'); return }

      const token = await getAccessToken()
      const response = await fetch('/api/grok-analyze-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ twitterUsername: usernameToAnalyze })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to analyze ICP')

      if (data.organization) setOrganization(data.organization)
      if (data.icp) setIcp(data.icp)
      setSuccess(data.fromCache ? 'Loaded existing ICP analysis!' : 'ICP analysis completed!')
      if (usernameToAnalyze) localStorage.setItem('lastSearchedOrg', usernameToAnalyze)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchValue.trim()) return

    setError(null)
    setSuccess(null)
    setOrgTwitterProfile(null)
    setOrganization(null)
    setIcp(null)
    setSearching(true)

    try {
      const normalizedUsername = searchValue.replace(/^@/, '').toLowerCase()
      localStorage.setItem('lastSearchedOrg', normalizedUsername)
      const userData = await lookupTwitterUser(normalizedUsername)
      const profile = transformTwitterUser(userData)
      setOrgTwitterProfile(profile)

      const response = await fetch(`/api/organization-icp-analysis/save?twitter_username=${normalizedUsername}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load organization')

      if (data.organization) {
        setOrganization(data.organization)
        if (data.icp) {
          const isStale = isICPAnalysisStale(data.icp)
          if (!isStale) { setIcp(data.icp); setSuccess('Loaded existing ICP analysis') }
          else { setIcp(null); setSuccess('Organization found - ICP analysis is outdated') }
        } else { setSuccess('Organization found - ready for ICP analysis') }
      } else {
        if (profile) setSuccess('Twitter profile found - analyze to create ICP')
        else setSuccess('No organization found - analyze to create ICP')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingSpinner />
      </div>
    )
  }

  if (!authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h1>
          <p className="text-gray-500">Please sign in to manage your organization.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center px-6 py-10 transition-all duration-500 min-h-screen bg-gray-50">
      <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Manage Your Organization</h2>
      <p className="text-gray-500 mb-8 text-center">
        Search for your organization by Twitter username and analyze your ideal customer profile
      </p>

      {/* Search Form */}
      <div className="w-full max-w-xl mb-0">
        <SearchForm value={searchValue} onChange={setSearchValue} onSubmit={handleSearchSubmit} loading={searching} />
        {orgTwitterProfile && <SearchedProfileCard user={orgTwitterProfile} />}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 w-full max-w-xl"><ErrorDisplay message={error} /></div>
      )}
      {success && (
        <div className="mb-4 w-full max-w-xl bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-green-800">{success}</p>
        </div>
      )}

      {/* Main Content */}
      <div className="w-full flex flex-row gap-8 items-start mt-4 max-w-4xl">
        <div className="flex-1 min-w-0">
          {(organization || orgTwitterProfile) && (
            <div className="space-y-6">
              {!icp && (
                <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center shadow-sm">
                  <div className="w-14 h-14 rounded-full bg-berri-raspberry/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-7 h-7 text-berri-raspberry" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Analyze Your ICP?</h3>
                  <p className="text-gray-500 mb-6">
                    {organization
                      ? "Organization found. Let Grok analyze and create a comprehensive Ideal Customer Profile."
                      : "Let Grok analyze this Twitter profile and create a comprehensive ICP using AI insights."
                    }
                  </p>
                  <button
                    onClick={handleAnalyzeICP}
                    disabled={analyzing}
                    className="bg-berri-raspberry hover:bg-berri-raspberry/90 disabled:opacity-50 text-white px-6 py-3 rounded-xl transition-all shadow-md shadow-berri-raspberry/25 flex items-center gap-2 mx-auto font-medium"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Analyzing with Grok AI...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        Analyze ICP with Grok
                      </>
                    )}
                  </button>
                </div>
              )}
              {icp && (
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">ICP Analysis</h2>
                  <EnhancedICPDisplay icp={icp} editable={false} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
