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

// Extended interface for the new detailed Grok response structure
export interface DetailedICPAnalysisResponse {
  twitter_username: string
  timestamp_utc: string
  basic_identification: {
    project_name: string
    website_url: string
    industry_classification: string
    protocol_category: string
    technical_links: {
      github_url?: string
      npmjs_url?: string
      whitepaper_url?: string
    }
    community_links: {
      discord?: string
      telegram?: string
      farcaster?: string
      governance_forum?: string
    }
  }
  core_metrics: {
    key_features: string[]
    market_position: {
      total_value_locked_usd?: number
      twitter_followers?: number
      discord_members_est?: number
      active_addresses_30d?: number
      chains_supported?: number
      sentiment_score?: number
    }
    audit_info: {
      auditor?: string
      date?: string
      report_url?: string
    }
    operational_chains: string[]
  }
  ecosystem_analysis: {
    market_narratives: string[]
    notable_partnerships: string[]
    recent_developments: string[]
  }
  governance_tokenomics: {
    tokenomics: {
      native_token: string
      utility: {
        governance: boolean
        staking: boolean
        fee_discount: boolean
        collateral: boolean
      }
      description: string
    }
    organizational_structure: {
      governance: string
      team_structure: string
      funding_info: string
    }
  }
  user_behavior_insights: {
    onchain_activity_patterns: string[]
    engagement_characteristics: {
      participation_style: string
      engagement_level: string
      decision_making_style: string
    }
  }
  icp_synthesis: {
    target_web3_segment: string
    primary_user_archetypes: string[]
    demographic_profile: {
      vibe_range: string
      experience_level: string
      roles: string[]
      geographic_distribution: string
    }
    psychographic_drivers: {
      core_values: string[]
      primary_motivations: string[]
      key_challenges: string[]
      trending_interests: string[]
    }
    behavioral_indicators: {
      purchase_motives: string[]
    }
  }
  messaging_strategy: {
    communication_style: string
    key_messaging_angles: string[]
    content_keywords: string[]
  }
  confidence_score: number
  research_sources: string[]
}

/**
 * Map the new detailed Grok JSON response to database-compatible fields
 */
export function mapNewOrgJsonToDbFields(grokResponse: DetailedICPAnalysisResponse): {
  org: Partial<Organization>
  icp: Partial<OrganizationICP>
} {
  // Extract organization fields
  const org: Partial<Organization> = {
    name: grokResponse.basic_identification?.project_name || 'Unknown Project',
    twitter_username: grokResponse.twitter_username?.replace('@', '') || '',
    description: grokResponse.basic_identification?.industry_classification && grokResponse.basic_identification?.protocol_category 
      ? `${grokResponse.basic_identification.industry_classification} - ${grokResponse.basic_identification.protocol_category}`
      : 'No description available',
    website_url: grokResponse.basic_identification?.website_url,
    industry: grokResponse.basic_identification?.industry_classification,
    employee_count: grokResponse.governance_tokenomics?.organizational_structure?.team_structure || 'Not specified',
    location: grokResponse.icp_synthesis?.demographic_profile?.geographic_distribution || 'Global',
    social_links: {
      ...grokResponse.basic_identification?.community_links,
      ...grokResponse.basic_identification?.technical_links
    },
    research_sources: {
      audit_info: grokResponse.core_metrics?.audit_info,
      operational_chains: grokResponse.core_metrics?.operational_chains || [],
      market_narratives: grokResponse.ecosystem_analysis?.market_narratives || []
    },
    recent_developments: grokResponse.ecosystem_analysis?.recent_developments?.join('; '),
    key_partnerships: grokResponse.ecosystem_analysis?.notable_partnerships || [],
    funding_info: grokResponse.governance_tokenomics?.organizational_structure?.funding_info
  }

  // Extract and map ICP fields with proper structure
  const icp: Partial<OrganizationICP> = {
    target_industry: grokResponse.basic_identification?.industry_classification,
    target_role: grokResponse.icp_synthesis?.primary_user_archetypes?.join(', '),
    company_size: grokResponse.icp_synthesis?.demographic_profile?.experience_level,
    geographic_location: grokResponse.icp_synthesis?.demographic_profile?.geographic_distribution,
    pain_points: grokResponse.icp_synthesis?.psychographic_drivers?.key_challenges || [],
    keywords: grokResponse.messaging_strategy?.content_keywords || [],
    
    // Map to legacy structure for compatibility
    demographics: {
      age_range: grokResponse.icp_synthesis?.demographic_profile?.vibe_range || 'Not specified',
      education_level: grokResponse.icp_synthesis?.demographic_profile?.experience_level || 'Not specified',
      income_level: 'Not specified',
      job_seniority: grokResponse.icp_synthesis?.demographic_profile?.roles?.join(', ') || 'Not specified'
    },
    
    psychographics: {
      values: grokResponse.icp_synthesis?.psychographic_drivers?.core_values || [],
      interests: grokResponse.icp_synthesis?.psychographic_drivers?.trending_interests || [],
      motivations: grokResponse.icp_synthesis?.psychographic_drivers?.primary_motivations || [],
      challenges: grokResponse.icp_synthesis?.psychographic_drivers?.key_challenges || []
    },
    
    behavioral_traits: {
      preferred_channels: ['Twitter', 'Discord', 'Governance Forums'], // Inferred from Web3 context
      decision_making_style: grokResponse.user_behavior_insights?.engagement_characteristics?.decision_making_style || 'Not specified',
      buying_behavior: grokResponse.icp_synthesis?.behavioral_indicators?.purchase_motives?.join(', ') || 'Not specified',
      communication_style: grokResponse.messaging_strategy?.communication_style || 'Not specified'
    },
    
    confidence_score: grokResponse.confidence_score || 0,
    analysis_summary: `Target Segment: ${grokResponse.icp_synthesis?.target_web3_segment || 'Not specified'}. Key User Types: ${grokResponse.icp_synthesis?.primary_user_archetypes?.join(', ') || 'Not specified'}. Communication Style: ${grokResponse.messaging_strategy?.communication_style || 'Not specified'}`,
    
    research_sources: {
      twitter_analysis: `Followers: ${grokResponse.core_metrics?.market_position?.twitter_followers || 'N/A'}`,
      website_insights: grokResponse.basic_identification?.website_url || 'Not available',
      news_mentions: grokResponse.ecosystem_analysis?.recent_developments?.join('; ') || 'None',
      competitor_insights: grokResponse.ecosystem_analysis?.notable_partnerships?.join(', ') || 'None',
      search_confidence: (grokResponse.confidence_score || 0).toString()
    }
  }

  return { org, icp }
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
      const orgToInsert = {
        ...organization,
        name: organization.name || organization.twitter_username || 'Unknown',
        description: organization.description || 'No description provided',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      const { data, error } = await supabase
        .from('organizations')
        .insert(orgToInsert)
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
 * Get organization by user ID and Twitter username
 */
export async function getOrganizationByUserIdAndTwitter(userId: string, twitterUsername: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('user_id', userId)
      .eq('twitter_username', twitterUsername.replace('@', ''))
      .single()
    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching organization by user and twitter:', error)
      return null
    }
    return data
  } catch (error) {
    console.error('Error fetching organization by user and twitter:', error)
    return null
  }
}

/**
 * Save ICP analysis to database
 */
export async function saveICPAnalysis(
  organizationId: string,
  icp: ICPAnalysisResponse | DetailedICPAnalysisResponse | Partial<OrganizationICP>,
  metadata: {
    grokResponse?: string
    modelUsed?: string
    tokenUsage?: number
    isCustom?: boolean
    customNotes?: string
  }
): Promise<OrganizationICP | null> {
  try {
    let icpData: Partial<OrganizationICP>

    // Check if this is a detailed Grok response (new format)
    if ('basic_identification' in icp && 'icp_synthesis' in icp) {
      console.log('Processing detailed Grok response format')
      const mapped = mapNewOrgJsonToDbFields(icp as DetailedICPAnalysisResponse)
      icpData = {
        organization_id: organizationId,
        ...mapped.icp,
        grok_response: metadata.grokResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes
      }
    } else if ('target_industry' in icp) {
      // Legacy format (ICPAnalysisResponse)
      console.log('Processing legacy ICP response format')
      const legacyIcp = icp as ICPAnalysisResponse
      icpData = {
        organization_id: organizationId,
        target_industry: legacyIcp.target_industry,
        target_role: legacyIcp.target_role,
        company_size: legacyIcp.company_size,
        geographic_location: legacyIcp.geographic_location,
        pain_points: legacyIcp.pain_points,
        keywords: legacyIcp.keywords,
        demographics: legacyIcp.demographics,
        psychographics: legacyIcp.psychographics,
        behavioral_traits: legacyIcp.behavioral_traits,
        confidence_score: legacyIcp.confidence_score,
        analysis_summary: legacyIcp.analysis_summary,
        research_sources: legacyIcp.research_sources,
        grok_response: metadata.grokResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes
      }
    } else {
      // Direct OrganizationICP partial object
      console.log('Processing direct OrganizationICP object')
      icpData = {
        organization_id: organizationId,
        ...icp,
        grok_response: metadata.grokResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes
      }
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
