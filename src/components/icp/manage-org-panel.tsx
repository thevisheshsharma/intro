// ManageOrgPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Bot, 
  Loader,
  CheckCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { EnhancedICPDisplay } from '@/components/icp/enhanced-icp-display'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { lookupTwitterUser, transformTwitterUser } from '../../lib/twitter-helpers'
import type { Organization, OrganizationICP } from '@/lib/organization'
import SearchForm from '@/app/SearchForm'

export default function ManageOrgPanel() {
  const { user, isLoaded } = useUser()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [icp, setIcp] = useState<OrganizationICP | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgTwitterProfile, setOrgTwitterProfile] = useState<any | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (isLoaded && user) {
      loadOrganizationData()
    }
    // eslint-disable-next-line
  }, [isLoaded, user])

  const loadOrganizationData = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/organization-icp-analysis/save')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load organization data')
      }
      if (data.organization) {
        setOrganization(data.organization)
      }
      if (data.icp) {
        setIcp(data.icp)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyzeICP = async () => {
    if (!organization) {
      setError('Please save your organization details first')
      return
    }
    try {
      setAnalyzing(true)
      setError(null)
      setSuccess(null)
      // Normalize username for API call
      const normalizedUsername = organization.twitter_username.replace(/^@/, '').toLowerCase()
      const response = await fetch('/api/grok-analyze-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twitterUsername: normalizedUsername
        })
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze ICP')
      }
      setIcp(data.icp)
      setSuccess('ICP analysis completed successfully!')
    } catch (error: any) {
      setError(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle search submit (find org by Twitter username)
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
      // Normalize username: remove '@' and lowercase
      const normalizedUsername = searchValue.replace(/^@/, '').toLowerCase()
      // Lookup Twitter user and org
      const userData = await lookupTwitterUser(normalizedUsername)
      const profile = transformTwitterUser(userData)
      setOrgTwitterProfile(profile)
      // Try to load org data for this username
      const response = await fetch('/api/organization-icp-analysis/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twitter_username: normalizedUsername })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load organization')
      setOrganization(data.organization)
      if (data.icp) setIcp(data.icp)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#181818]">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#181818]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          <p className="text-gray-400">Please sign in to manage your organization.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col items-center px-4 py-8 transition-all duration-500 min-h-screen bg-[#181818]">
      <h2 className="text-3xl text-white mb-2 text-center">Manage Your Organization</h2>
      <p className="text-gray-300 mb-8 text-center">
        Search for your organization by Twitter username and analyze your ideal customer profile
      </p>
      {/* Search Form */}
      <div className="w-full max-w-xl mb-0"> {/* Remove margin below search bar */}
        <SearchForm
          value={searchValue}
          onChange={setSearchValue}
          onSubmit={handleSearchSubmit}
          loading={searching}
        />
        {/* Org Profile Card directly below search bar, no gap, same width */}
        {orgTwitterProfile && (
          <SearchedProfileCard user={orgTwitterProfile} />
        )}
      </div>
      {/* Error/Success Messages */}
      {error && (
        <div className="mb-4 w-full max-w-xl">
          <ErrorDisplay message={error} />
        </div>
      )}
      {success && (
        <div className="mb-4 w-full max-w-xl bg-green-900/50 border border-green-600 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
          <p className="text-green-200">{success}</p>
        </div>
      )}
      {/* Main Content Row */}
      <div className="w-full flex flex-row gap-8 items-start mt-2 h-full max-w-4xl" style={{ minHeight: 0 }}>
        {/* ICP Analysis (right) */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1">
          {/* ICP Analysis Section */}
          {organization && (
            <div className="space-y-6">
              {/* Analyze Button */}
              {!icp && (
                <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 text-center">
                  <Bot className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze Your ICP?</h3>
                  <p className="text-gray-400 mb-4">
                    Let Grok analyze your organization&apos;s Twitter presence and create a comprehensive Ideal Customer Profile using live web search and AI insights.
                  </p>
                  <button
                    onClick={handleAnalyzeICP}
                    disabled={analyzing}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-6 py-3 rounded-lg transition-colors flex items-center gap-2 mx-auto"
                  >
                    {analyzing ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        Analyzing with Grok AI...
                      </>
                    ) : (
                      <>
                        <Bot className="w-5 h-5" />
                        Analyze ICP with Grok
                      </>
                    )}
                  </button>
                </div>
              )}
              {/* Existing ICP */}
              {icp && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-semibold text-white">Your ICP Analysis</h2>
                    <button
                      onClick={handleAnalyzeICP}
                      disabled={analyzing}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm"
                    >
                      {analyzing ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Re-analyzing...
                        </>
                      ) : (
                        <>
                          <Bot className="w-4 h-4" />
                          Re-analyze with Grok
                        </>
                      )}
                    </button>
                  </div>
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
