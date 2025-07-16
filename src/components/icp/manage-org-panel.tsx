// ManageOrgPanel.tsx
'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Bot, 
  Loader,
  CheckCircle,
  RefreshCw
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
      
      console.log('🔄 Loading organization data...')
      
      // Just get any previously searched organization from local storage or state
      const lastSearched = localStorage.getItem('lastSearchedOrg')
      console.log('💾 Last searched from localStorage:', lastSearched)
      
      if (lastSearched) {
        console.log('🏢 Fetching organization for:', lastSearched)
        setSearchValue(lastSearched) // Set the search value immediately
        
        try {
          // First try to lookup the Twitter user to set the profile
          const userData = await lookupTwitterUser(lastSearched)
          const profile = transformTwitterUser(userData)
          setOrgTwitterProfile(profile)
          console.log('✅ Twitter profile loaded on refresh:', profile)
        } catch (twitterError) {
          console.log('⚠️ Could not load Twitter profile on refresh:', twitterError)
        }
        
        const response = await fetch(`/api/organization-icp-analysis/save?twitter_username=${lastSearched}`)
        const data = await response.json()
        
        console.log('📊 Load organization response:', { status: response.status, data })
        
        if (response.ok && data.organization) {
          setOrganization(data.organization)
          console.log('✅ Organization loaded:', data.organization)
          if (data.icp) {
            setIcp(data.icp)
            console.log('✅ ICP loaded:', data.icp)
          }
        } else {
          console.log('ℹ️ No organization found for last searched username')
        }
      } else {
        console.log('ℹ️ No last searched organization in localStorage')
      }
    } catch (error: any) {
      console.error('❌ Load organization error:', error)
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
      
      if (organization) {
        // Use existing organization's username
        usernameToAnalyze = organization.twitter_username.replace(/^@/, '').toLowerCase()
        console.log('📊 Analyzing existing organization:', usernameToAnalyze)
      } else if (searchValue) {
        // Use search value if no organization but we have a search value
        usernameToAnalyze = searchValue.replace(/^@/, '').toLowerCase()
        console.log('📊 Analyzing from search value:', usernameToAnalyze)
      } else {
        setError('Please search for an organization first')
        return
      }
      
      console.log('🤖 Starting Grok analysis for:', usernameToAnalyze)
      
      const response = await fetch('/api/grok-analyze-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twitterUsername: usernameToAnalyze
        })
      })
      const data = await response.json()
      
      console.log('🤖 Grok analysis response:', { status: response.status, data })
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze ICP')
      }
      
      // Update both organization and ICP from the response
      if (data.organization) {
        setOrganization(data.organization)
        console.log('✅ Organization updated from analysis:', data.organization)
      }
      
      if (data.icp) {
        setIcp(data.icp)
        console.log('✅ ICP created/updated:', data.icp)
      }
      
      setSuccess(data.fromCache ? 'Loaded existing ICP analysis from cache!' : 'ICP analysis completed successfully!')
      
      // Update localStorage to ensure persistence
      if (usernameToAnalyze) {
        localStorage.setItem('lastSearchedOrg', usernameToAnalyze)
        console.log('💾 Updated localStorage after analysis:', usernameToAnalyze)
      }
    } catch (error: any) {
      console.error('❌ Analysis error:', error)
      setError(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle search submit (find org by Twitter username)
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchValue.trim()) return
    
    console.log('🔍 Starting search for:', searchValue)
    setError(null)
    setSuccess(null)
    setOrgTwitterProfile(null)
    setOrganization(null)
    setIcp(null)
    setSearching(true)
    
    try {
      // Normalize username: remove '@' and lowercase
      const normalizedUsername = searchValue.replace(/^@/, '').toLowerCase()
      console.log('🔍 Normalized username:', normalizedUsername)
      
      // Save to local storage
      localStorage.setItem('lastSearchedOrg', normalizedUsername)
      console.log('💾 Saved to localStorage:', normalizedUsername)
      
      // Lookup Twitter user
      console.log('🐦 Looking up Twitter user...')
      const userData = await lookupTwitterUser(normalizedUsername)
      const profile = transformTwitterUser(userData)
      setOrgTwitterProfile(profile)
      console.log('✅ Twitter profile found:', profile)
      
      // Load org data (now checks globally, not user-specific)
      console.log('🏢 Fetching organization data...')
      
      // First check for duplicates (debug)
      await checkForDuplicates()
      
      const response = await fetch(`/api/organization-icp-analysis/save?twitter_username=${normalizedUsername}`)
      const data = await response.json()
      
      console.log('📊 Organization API response:', { status: response.status, data })
      
      if (!response.ok) throw new Error(data.error || 'Failed to load organization')
      
      if (data.organization) {
        setOrganization(data.organization)
        console.log('✅ Organization loaded:', data.organization)
        if (data.icp) {
          setIcp(data.icp)
          console.log('✅ ICP data loaded:', data.icp)
          setSuccess('Loaded existing ICP analysis')
        } else {
          console.log('ℹ️ No ICP data found for organization')
          setSuccess('Organization found - ready for ICP analysis')
        }
      } else {
        console.log('ℹ️ No organization found in database')
        // Still show the Twitter profile and allow analysis
        if (profile) {
          setSuccess('Twitter profile found - analyze to create ICP')
        } else {
          setSuccess('No organization found - analyze to create ICP')
        }
      }
    } catch (err: any) {
      console.error('❌ Search error:', err)
      setError(err.message)
    } finally {
      setSearching(false)
    }
  }

  // Function to refresh current organization data
  const refreshCurrentOrganization = async () => {
    if (!searchValue.trim()) return
    
    console.log('🔄 Refreshing current organization data for:', searchValue)
    setError(null)
    
    try {
      const normalizedUsername = searchValue.replace(/^@/, '').toLowerCase()
      
      // Check for duplicates first
      await checkForDuplicates()
      
      // Fetch fresh data from database
      const response = await fetch(`/api/organization-icp-analysis/save?twitter_username=${normalizedUsername}&t=${Date.now()}`)
      const data = await response.json()
      
      console.log('📊 Refresh organization response:', { status: response.status, data })
      
      if (response.ok) {
        if (data.organization) {
          setOrganization(data.organization)
          console.log('✅ Organization refreshed:', data.organization)
          if (data.icp) {
            setIcp(data.icp)
            console.log('✅ ICP refreshed:', data.icp)
            setSuccess('Data refreshed - ICP found')
          } else {
            console.log('ℹ️ No ICP data after refresh')
            setSuccess('Data refreshed - no ICP yet')
          }
        } else {
          console.log('ℹ️ No organization found after refresh')
          setOrganization(null)
          setIcp(null)
          setSuccess('No organization found in database')
        }
      } else {
        throw new Error(data.error || 'Failed to refresh data')
      }
    } catch (error: any) {
      console.error('❌ Refresh error:', error)
      setError(`Refresh failed: ${error.message}`)
    }
  }

  // Debug function to check for duplicates
  const checkForDuplicates = async () => {
    if (!searchValue.trim()) return
    
    console.log('🔍 Checking for duplicate organizations...')
    try {
      // This is a debug query - in production you'd remove this
      const response = await fetch(`/api/debug/check-duplicates?username=${searchValue.replace(/^@/, '').toLowerCase()}`)
      if (response.ok) {
        const data = await response.json()
        console.log('🔍 Duplicate check result:', data)
      }
    } catch (error) {
      console.log('⚠️ Could not check for duplicates:', error)
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
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SearchForm
              value={searchValue}
              onChange={setSearchValue}
              onSubmit={handleSearchSubmit}
              loading={searching}
            />
          </div>
          {searchValue && (
            <button
              onClick={refreshCurrentOrganization}
              className="bg-gray-600 hover:bg-gray-700 text-white p-2 rounded-lg transition-colors"
              title="Refresh current organization data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
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
      )}          {/* Main Content Row */}
      <div className="w-full flex flex-row gap-8 items-start mt-2 h-full max-w-4xl" style={{ minHeight: 0 }}>
        {/* ICP Analysis (right) */}
        <div className="flex-1 min-w-0 h-full overflow-y-auto pr-1">
          {/* ICP Analysis Section */}
          {(organization || orgTwitterProfile) && (
            <div className="space-y-6">
              {/* Analyze Button */}
              {!icp && (
                <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 text-center">
                  <Bot className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-white mb-2">Ready to Analyze Your ICP?</h3>
                  <p className="text-gray-400 mb-4">
                    {organization 
                      ? "Organization found in our database. Let Grok analyze and create a comprehensive Ideal Customer Profile."
                      : "Organization not in our database yet. Let Grok analyze this Twitter profile and create a comprehensive Ideal Customer Profile using live web search and AI insights."
                    }
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
                    <h2 className="text-2xl font-semibold text-white">ICP Analysis</h2>
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
