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
  CheckCircle,
  ArrowLeft
} from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ErrorDisplay } from '@/components/ui/error-display'
import { ICPDisplay } from '@/components/icp/icp-display'
import { ICPEditForm } from '@/components/icp/icp-edit-form'
import { SearchedProfileCard } from '@/components/twitter/searched-profile-card'
import { lookupTwitterUser, transformTwitterUser } from '@/lib/twitter-helpers'
import type { Organization, OrganizationICP } from '@/lib/organization'

export default function ManageOrgPage() {
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
  
  // Form state
  const [formData, setFormData] = useState({
    twitter_username: '',
    business_info: ''
  })

  // Memoized callbacks
  const handleEditICP = useCallback(() => {
    setShowEditForm(true)
  }, [])

  // Load existing organization data
  useEffect(() => {
    if (isLoaded && user) {
      loadOrganizationData()
    }
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
      console.error('Error loading organization data:', error)
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
      console.error('Error saving organization:', error)
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
      console.error('Error analyzing ICP:', error)
      setError(error.message)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleSaveICPEdit = async (updatedICP: Partial<OrganizationICP>) => {
    if (!organization?.id) return

    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/organization-icp-analysis/save', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId: organization.id,
          icp: {
            target_industry: updatedICP.target_industry,
            target_role: updatedICP.target_role,
            company_size: updatedICP.company_size,
            geographic_location: updatedICP.geographic_location,
            pain_points: updatedICP.pain_points,
            keywords: updatedICP.keywords,
            demographics: updatedICP.demographics,
            psychographics: icp?.psychographics,
            behavioral_traits: icp?.behavioral_traits,
            confidence_score: icp?.confidence_score || 0.5,
            analysis_summary: icp?.analysis_summary || 'Custom ICP'
          },
          customNotes: updatedICP.custom_notes
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save ICP')
      }

      setIcp(data.icp)
      setShowEditForm(false)
      setSuccess('ICP updated successfully!')
    } catch (error: any) {
      console.error('Error saving ICP:', error)
      setError(error.message)
    } finally {
      setSaving(false)
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
    <div className="min-h-screen bg-[#181818] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-white">Manage Organization</h1>
            <p className="text-gray-400 mt-1">
              Define your organization and analyze your ideal customer profile
            </p>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-600 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-900/50 border border-green-600 rounded-lg p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-green-200">{success}</p>
          </div>
        )}

        {/* Organization Form */}
        <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Organization Details</h2>
          </div>

          <form onSubmit={handleSaveOrganization} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Twitter Username *
                </label>
                <div className="relative">
                  <Twitter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.twitter_username}
                    onChange={(e) => handleInputChange('twitter_username', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    placeholder="username (without @)"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Business Information
              </label>
              <textarea
                value={formData.business_info}
                onChange={(e) => handleInputChange('business_info', e.target.value)}
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
                'Find Organisation'
              )}
            </button>
          </form>

          {orgTwitterProfile && (
            <div className="mt-6">
              <SearchedProfileCard user={orgTwitterProfile} />
            </div>
          )}
        </div>

        {/* ICP Analysis Section */}
        {organization && (
          <div className="space-y-6">
            {/* Analyze Button */}
            {!icp && (
              <div className="bg-gray-800/50 border border-gray-600 rounded-xl p-6 text-center">
                <Bot className="w-12 h-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  Ready to Analyze Your ICP?
                </h3>
                <p className="text-gray-400 mb-4">
                  Let Grok analyze your organization's Twitter presence and create a comprehensive 
                  Ideal Customer Profile using live web search and AI insights.
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
                
                <ICPDisplay 
                  icp={icp} 
                  onEdit={handleEditICP}
                  editable={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Edit ICP Form Modal */}
        {showEditForm && icp && (
          <ICPEditForm
            icp={icp}
            onSave={handleSaveICPEdit}
            onCancel={() => setShowEditForm(false)}
            loading={saving}
          />
        )}
      </div>
    </div>
  )
}
