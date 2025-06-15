// ManageOrgPanel.tsx
'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { 
  Building2, 
  Twitter, 
  Globe, 
  Bot, 
  Loader,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { ICPDisplay } from '@/components/icp/icp-display'
import { ICPEditForm } from '@/components/icp/icp-edit-form'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { lookupTwitterUser, transformTwitterUser } from '@/lib/twitter-helpers'
import type { Organization, OrganizationICP } from '@/lib/organization'
import SearchForm from '@/app/SearchForm'

export default function ManageOrgPanel() {
  const { user, isLoaded } = useUser()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [icp, setIcp] = useState<OrganizationICP | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [orgTwitterProfile, setOrgTwitterProfile] = useState<any | null>(null)
  const [formData, setFormData] = useState({
    twitter_username: '',
    business_info: ''
  })
  const [searchValue, setSearchValue] = useState('')
  const [searching, setSearching] = useState(false)

  const handleEditICP = useCallback(() => {
    setShowEditForm(true)
  }, [])

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
        setFormData({
          twitter_username: data.organization.twitter_username || '',
          business_info: data.organization.business_info || ''
        })
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.twitter_username) {
      setError('Twitter username is required')
      return
    }
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      setOrgTwitterProfile(null)
      const response = await fetch('/api/organization-icp-analysis/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save organization')
      }
      setOrganization(data.organization)
      setSuccess('Organization saved successfully!')
      // Fetch Twitter profile for the org
      try {
        const userData = await lookupTwitterUser(formData.twitter_username.replace('@', ''))
        setOrgTwitterProfile(transformTwitterUser(userData))
      } catch (err) {
        setOrgTwitterProfile(null)
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setSaving(false)
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
      const response = await fetch('/api/grok-analyze-org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          twitterUsername: organization.twitter_username,
          businessInfo: organization.business_info
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
    setSaving(false)
    setSearching(true)
    try {
      // Lookup Twitter user and org
      const userData = await lookupTwitterUser(searchValue.replace('@', ''))
      const profile = transformTwitterUser(userData)
      setOrgTwitterProfile(profile)
      // Try to load org data for this username
      const response = await fetch('/api/organization-icp-analysis/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ twitter_username: searchValue.replace('@', '') })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load organization')
      setOrganization(data.organization)
      setFormData({
        twitter_username: data.organization?.twitter_username || '',
        business_info: data.organization?.business_info || ''
      })
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
      <div className="w-full max-w-xl mb-6">
        <SearchForm
          value={searchValue}
          onChange={setSearchValue}
          onSubmit={handleSearchSubmit}
          loading={searching}
        />
      </div>
      {/* Organization Details Form always visible below search */}
      <div className="w-full max-w-xl mb-8">
        <form onSubmit={handleSaveOrganization} className="bg-gray-800/50 border border-gray-600 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Organization Details</h2>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">Business Information</label>
            <textarea
              value={formData.business_info}
              onChange={e => handleInputChange('business_info', e.target.value)}
              rows={3}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
              placeholder="Additional business details, target market, unique value proposition, etc."
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white px-6 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Organization Info'
            )}
          </button>
        </form>
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
        {/* Org Profile Card (left) */}
        <div style={{ width: '25%', minWidth: 200, maxWidth: 280, marginTop: '45px' }} className="flex-shrink-0">
          {orgTwitterProfile && <SearchedProfileCard user={orgTwitterProfile} />}
        </div>
        {/* ICP Analysis & Org Details (right) */}
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
                    Let Grok analyze your organization's Twitter presence and create a comprehensive Ideal Customer Profile using live web search and AI insights.
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
                  <ICPDisplay icp={icp} onEdit={handleEditICP} editable={true} />
                </div>
              )}
            </div>
          )}
          {/* Edit ICP Form Modal */}
          {showEditForm && icp && (
            <ICPEditForm
              icp={icp}
              onSave={async (updatedICP) => {
                setShowEditForm(false)
              }}
              onCancel={() => setShowEditForm(false)}
              loading={saving}
            />
          )}
        </div>
      </div>
    </div>
  )
}
