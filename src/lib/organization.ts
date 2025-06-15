import { supabase } from './supabase'

export interface Organization {
  id?: string
  user_id: string
  name?: string
  twitter_username: string
  description?: string
  business_info?: string
  website_url?: string
  industry?: string
  employee_count?: string
  location?: string
  social_links?: any
  // New research fields from live search
  research_sources?: any
  recent_developments?: string
  key_partnerships?: string[]
  funding_info?: string
  created_at?: string
  updated_at?: string
}

export interface OrganizationICP {
  id?: string
  organization_id: string
  target_industry?: string
  target_role?: string
  company_size?: string
  geographic_location?: string
  pain_points?: string[]
  keywords?: string[]
  demographics?: any
  psychographics?: any
  behavioral_traits?: any
  confidence_score?: number
  analysis_summary?: string
  grok_response?: string
  model_used?: string
  token_usage?: number
  is_custom?: boolean
  custom_notes?: string
  // Research sources from live search
  research_sources?: {
    twitter_analysis?: string
    website_insights?: string
    news_mentions?: string
    competitor_insights?: string
    search_confidence?: string
  }
  created_at?: string
  updated_at?: string
}

export interface ICPAnalysisRequest {
  organizationName: string
  twitterUsername: string
  description: string
  businessInfo?: string
}

export interface ICPAnalysisResponse {
  target_industry: string
  target_role: string
  company_size: string
  geographic_location: string
  pain_points: string[]
  keywords: string[]
  demographics: {
    age_range: string
    education_level: string
    income_level: string
    job_seniority: string
  }
  psychographics: {
    values: string[]
    interests: string[]
    motivations: string[]
    challenges: string[]
  }
  behavioral_traits: {
    preferred_channels: string[]
    decision_making_style: string
    buying_behavior: string
    communication_style: string
  }
  confidence_score: number
  analysis_summary: string
  social_insights: {
    website_url?: string
    additional_social_links?: string[]
    industry_classification?: string
    estimated_company_size?: string
    recent_developments?: string
    key_partnerships?: string[]  
    funding_info?: string
  }
  research_sources: {
    twitter_analysis?: string
    website_insights?: string
    news_mentions?: string
    competitor_insights?: string
    search_confidence?: string
  }
}

/**
 * Save organization to database
 */
export async function saveOrganization(
  organization: Organization
): Promise<Organization | null> {
  try {
    // Check if organization already exists for this user and twitter username
    const { data: existing, error: checkError } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', organization.user_id)
      .eq('twitter_username', organization.twitter_username)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing organization:', checkError)
      return null
    }

    if (existing) {
      // Update existing organization
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          description: organization.description,
          business_info: organization.business_info,
          website_url: organization.website_url,
          industry: organization.industry,
          employee_count: organization.employee_count,
          location: organization.location,
          social_links: organization.social_links,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating organization:', error)
        return null
      }

      return data
    } else {
      // Create new organization
      const { data, error } = await supabase
        .from('organizations')
        .insert({
          ...organization,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating organization:', error)
        return null
      }

      return data
    }
  } catch (error) {
    console.error('Error saving organization:', error)
    return null
  }
}

/**
 * Get organization by user ID
 */
export async function getOrganizationByUserId(
  userId: string
): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null
      }
      console.error('Error fetching organization:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching organization:', error)
    return null
  }
}

/**
 * Save ICP analysis to database
 */
export async function saveICPAnalysis(
  organizationId: string,
  icp: ICPAnalysisResponse,
  metadata: {
    grokResponse?: string
    modelUsed?: string
    tokenUsage?: number
    isCustom?: boolean
    customNotes?: string
  }
): Promise<OrganizationICP | null> {
  try {
    const icpData: Partial<OrganizationICP> = {
      organization_id: organizationId,
      target_industry: icp.target_industry,
      target_role: icp.target_role,
      company_size: icp.company_size,
      geographic_location: icp.geographic_location,
      pain_points: icp.pain_points,
      keywords: icp.keywords,
      demographics: icp.demographics,
      psychographics: icp.psychographics,
      behavioral_traits: icp.behavioral_traits,
      confidence_score: icp.confidence_score,
      analysis_summary: icp.analysis_summary,
      research_sources: icp.research_sources,
      grok_response: metadata.grokResponse,
      model_used: metadata.modelUsed,
      token_usage: metadata.tokenUsage,
      is_custom: metadata.isCustom || false,
      custom_notes: metadata.customNotes
    }

    // Check if ICP already exists for this organization
    console.log('Checking for existing ICP for organization:', organizationId)
    const { data: existing, error: checkError } = await supabase
      .from('organization_icp')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing ICP:', checkError)
      console.error('Error code:', checkError.code)
      console.error('Error message:', checkError.message)
      return null
    }

    console.log('Existing ICP found:', !!existing)

    if (existing) {
      // Update existing ICP
      console.log('Updating existing ICP with ID:', existing.id)
      const { data, error } = await supabase
        .from('organization_icp')
        .update({
          ...icpData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating ICP analysis:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Update data:', icpData)
        return null
      }

      console.log('ICP updated successfully')
      return data
    } else {
      // Create new ICP
      console.log('Creating new ICP for organization:', organizationId)
      const { data, error } = await supabase
        .from('organization_icp')
        .insert({
          ...icpData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating ICP analysis:', error)
        console.error('Error code:', error.code)
        console.error('Error message:', error.message)
        console.error('Insert data:', icpData)
        return null
      }

      console.log('ICP created successfully')
      return data
    }
  } catch (error) {
    console.error('Error saving ICP analysis:', error)
    return null
  }
}

/**
 * Get ICP analysis by organization ID
 */
export async function getICPAnalysis(
  organizationId: string
): Promise<OrganizationICP | null> {
  try {
    const { data, error } = await supabase
      .from('organization_icp')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No data found
        return null
      }
      console.error('Error fetching ICP analysis:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching ICP analysis:', error)
    return null
  }
}

/**
 * Update organization with social insights from Grok
 */
export async function updateOrganizationSocialInsights(
  organizationId: string,
  socialInsights: {
    website_url?: string
    additional_social_links?: string[]
    industry_classification?: string
    estimated_company_size?: string
    recent_developments?: string
    key_partnerships?: string[]  
    funding_info?: string
  }
): Promise<boolean> {
  try {
    const updates: Partial<Organization> = {}
    
    if (socialInsights.website_url) {
      updates.website_url = socialInsights.website_url
    }
    
    if (socialInsights.industry_classification) {
      updates.industry = socialInsights.industry_classification
    }
    
    if (socialInsights.estimated_company_size) {
      updates.employee_count = socialInsights.estimated_company_size
    }
    
    if (socialInsights.additional_social_links) {
      updates.social_links = {
        additional_links: socialInsights.additional_social_links
      }
    }

    // New research fields (commented out until database is updated)
    // if (socialInsights.recent_developments) {
    //   updates.recent_developments = socialInsights.recent_developments
    // }

    // if (socialInsights.key_partnerships) {
    //   updates.key_partnerships = socialInsights.key_partnerships
    // }

    // if (socialInsights.funding_info) {
    //   updates.funding_info = socialInsights.funding_info
    // }

    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)

    if (error) {
      console.error('Error updating organization social insights:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating organization social insights:', error)
    return false
  }
}
