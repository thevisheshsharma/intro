import { supabase } from './supabase'

export interface Organization {
  id?: string
  user_id: string
  name?: string
  twitter_username: string
  website_url?: string
  created_at?: string
  updated_at?: string
}

export interface OrganizationICP {
  id?: string
  organization_id: string
  // Essential metadata columns
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
  // Enhanced structured fields (new format)
  basic_identification?: any
  core_metrics?: any
  ecosystem_analysis?: any
  governance_tokenomics?: any
  user_behavior_insights?: any
  icp_synthesis?: any
  messaging_strategy?: any
  operational_chains?: any
  audit_info?: any
  market_position?: any
  technical_links?: any
  community_links?: any
  full_icp_json?: any
  enhanced_format_updated_at?: string
  legacy_columns_migrated?: boolean
  created_at?: string
  updated_at?: string
  
  // Legacy fields for backward compatibility (computed from structured fields when needed)
  // These are not stored in DB anymore but computed on-the-fly for display components
  target_industry?: string
  target_role?: string
  company_size?: string
  geographic_location?: string
  pain_points?: string[]
  keywords?: string[]
  demographics?: any
  psychographics?: any
  behavioral_traits?: any
}

export interface ICPAnalysisRequest {
  organizationName: string
  twitterUsername: string
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
  // Extract organization fields - only essential data, detailed analysis goes to ICP
  const org: Partial<Organization> = {
    name: grokResponse.basic_identification?.project_name || 'Unknown Project',
    twitter_username: grokResponse.twitter_username?.replace('@', '') || '',
    website_url: grokResponse.basic_identification?.website_url
  }

  // Extract and map ICP fields with proper structure
  const icp: Partial<OrganizationICP> = {
    // Store only in structured format, legacy fields will be computed
    // Basic identification data
    basic_identification: {
      industry_classification: grokResponse.basic_identification?.industry_classification,
      protocol_category: grokResponse.basic_identification?.protocol_category,
      technical_links: grokResponse.basic_identification?.technical_links,
      community_links: grokResponse.basic_identification?.community_links
    },
    
    // Core customer profile synthesis
    icp_synthesis: {
      target_web3_segment: grokResponse.icp_synthesis?.target_web3_segment,
      primary_user_archetypes: grokResponse.icp_synthesis?.primary_user_archetypes,
      demographic_profile: grokResponse.icp_synthesis?.demographic_profile,
      psychographic_drivers: grokResponse.icp_synthesis?.psychographic_drivers,
      behavioral_indicators: grokResponse.icp_synthesis?.behavioral_indicators
    },
    
    // Messaging strategy
    messaging_strategy: {
      communication_style: grokResponse.messaging_strategy?.communication_style,
      key_messaging_angles: grokResponse.messaging_strategy?.key_messaging_angles,
      content_keywords: grokResponse.messaging_strategy?.content_keywords
    },

    // User behavior insights
    user_behavior_insights: grokResponse.user_behavior_insights,
    
    // Core metrics and other structured fields
    core_metrics: grokResponse.core_metrics,
    ecosystem_analysis: grokResponse.ecosystem_analysis,
    governance_tokenomics: grokResponse.governance_tokenomics,
    
    // Essential metadata
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
      // Update existing organization - only update essential fields
      const { data, error } = await supabase
        .from('organizations')
        .update({
          name: organization.name,
          website_url: organization.website_url,
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
        custom_notes: metadata.customNotes,
        legacy_columns_migrated: true
      }
    } else if ('target_industry' in icp) {
      // Legacy format (ICPAnalysisResponse) - convert to structured format
      console.log('Processing legacy ICP response format - converting to structured format')
      const legacyIcp = icp as ICPAnalysisResponse
      
      // Convert legacy format to structured format
      icpData = {
        organization_id: organizationId,
        // Store in structured format
        basic_identification: {
          industry_classification: legacyIcp.target_industry,
          protocol_category: legacyIcp.target_industry
        },
        icp_synthesis: {
          target_web3_segment: legacyIcp.target_role,
          primary_user_archetypes: legacyIcp.target_role ? [legacyIcp.target_role] : [],
          demographic_profile: {
            experience_level: legacyIcp.company_size,
            geographic_distribution: legacyIcp.geographic_location,
            ...legacyIcp.demographics
          },
          psychographic_drivers: {
            key_challenges: legacyIcp.pain_points || [],
            ...legacyIcp.psychographics
          },
          behavioral_indicators: legacyIcp.behavioral_traits
        },
        messaging_strategy: {
          content_keywords: legacyIcp.keywords || [],
          communication_style: legacyIcp.behavioral_traits?.communication_style
        },
        // Essential fields
        confidence_score: legacyIcp.confidence_score,
        analysis_summary: legacyIcp.analysis_summary,
        research_sources: legacyIcp.research_sources,
        grok_response: metadata.grokResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes,
        legacy_columns_migrated: true
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
        custom_notes: metadata.customNotes,
        legacy_columns_migrated: true
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
 * Enhanced save function that properly stores parsed sections in new structured fields
 */
export async function saveEnhancedICPAnalysis(
  organizationId: string,
  detailedResponse: DetailedICPAnalysisResponse,
  metadata: {
    grokResponse?: string
    modelUsed?: string
    tokenUsage?: number
    isCustom?: boolean
    customNotes?: string
  }
): Promise<OrganizationICP | null> {
  try {
    console.log('Saving enhanced ICP analysis with structured fields')
    
    // Parse the detailed response into legacy and enhanced format
    const mapped = mapNewOrgJsonToDbFields(detailedResponse)
    
    const enhancedData = {
      organization_id: organizationId,
      ...mapped.icp,
      // Store raw response
      grok_response: metadata.grokResponse,
      // Store parsed sections in new structured fields
      basic_identification: detailedResponse.basic_identification,
      core_metrics: detailedResponse.core_metrics,
      ecosystem_analysis: detailedResponse.ecosystem_analysis,
      governance_tokenomics: detailedResponse.governance_tokenomics,
      user_behavior_insights: detailedResponse.user_behavior_insights,
      icp_synthesis: detailedResponse.icp_synthesis,
      messaging_strategy: detailedResponse.messaging_strategy,
      operational_chains: detailedResponse.core_metrics?.operational_chains,
      audit_info: detailedResponse.core_metrics?.audit_info,
      market_position: detailedResponse.core_metrics?.market_position,
      technical_links: detailedResponse.basic_identification?.technical_links,
      community_links: detailedResponse.basic_identification?.community_links,
      // Store complete response in full_icp_json
      full_icp_json: detailedResponse,
      // Metadata
      model_used: metadata.modelUsed,
      token_usage: metadata.tokenUsage,
      is_custom: metadata.isCustom || false,
      custom_notes: metadata.customNotes,
      enhanced_format_updated_at: new Date().toISOString()
    }

    // Check if ICP already exists
    const { data: existing, error: checkError } = await supabase
      .from('organization_icp')
      .select('*')
      .eq('organization_id', organizationId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing enhanced ICP:', checkError)
      return null
    }

    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('organization_icp')
        .update({
          ...enhancedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating enhanced ICP:', error)
        return null
      }

      console.log('Enhanced ICP updated successfully')
      return data
    } else {
      // Create new
      const { data, error } = await supabase
        .from('organization_icp')
        .insert({
          ...enhancedData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating enhanced ICP:', error)
        return null
      }

      console.log('Enhanced ICP created successfully')
      return data
    }
  } catch (error) {
    console.error('Error saving enhanced ICP analysis:', error)
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

    // Apply backward compatibility layer
    return computeLegacyFieldsFromStructured(data)
  } catch (error) {
    console.error('Error fetching ICP analysis:', error)
    return null
  }
}

/**
 * Query ICP analyses by specific criteria using the new structured fields
 */
export async function queryICPAnalyses(filters: {
  userId?: string
  industry?: string
  protocolCategory?: string
  targetSegment?: string
  minConfidence?: number
  hasAudit?: boolean
}): Promise<OrganizationICP[]> {
  try {
    let query = supabase
      .from('organization_icp')
      .select(`
        *,
        organizations (
          user_id,
          name,
          twitter_username
        )
      `)

    // Apply filters
    if (filters.userId) {
      query = query.eq('organizations.user_id', filters.userId)
    }

    if (filters.industry) {
      query = query.eq('basic_identification->>industry_classification', filters.industry)
    }

    if (filters.protocolCategory) {
      query = query.eq('basic_identification->>protocol_category', filters.protocolCategory)
    }

    if (filters.targetSegment) {
      query = query.eq('icp_synthesis->>target_web3_segment', filters.targetSegment)
    }

    if (filters.minConfidence) {
      query = query.gte('confidence_score', filters.minConfidence)
    }

    if (filters.hasAudit) {
      query = query.not('audit_info', 'is', null)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error querying ICP analyses:', error)
      return []
    }

    // Apply backward compatibility layer to all results
    return (data || []).map(icp => computeLegacyFieldsFromStructured(icp))
  } catch (error) {
    console.error('Error querying ICP analyses:', error)
    return []
  }
}

/**
 * Get aggregated insights across multiple ICP analyses
 */
export async function getICPInsights(userId?: string): Promise<{
  totalAnalyses: number
  industryBreakdown: Record<string, number>
  averageConfidence: number
  topProtocolCategories: Array<{ category: string; count: number }>
  recentAnalyses: OrganizationICP[]
}> {
  try {
    let query = supabase
      .from('organization_icp')
      .select(`
        *,
        organizations (
          user_id,
          name,
          twitter_username
        )
      `)

    if (userId) {
      query = query.eq('organizations.user_id', userId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error getting ICP insights:', error)
      return {
        totalAnalyses: 0,
        industryBreakdown: {},
        averageConfidence: 0,
        topProtocolCategories: [],
        recentAnalyses: []
      }
    }

    if (!data) return {
      totalAnalyses: 0,
      industryBreakdown: {},
      averageConfidence: 0,
      topProtocolCategories: [],
      recentAnalyses: []
    }

    // Calculate insights
    const industryBreakdown: Record<string, number> = {}
    const protocolCategories: Record<string, number> = {}
    let totalConfidence = 0
    let confidenceCount = 0

    data.forEach(icp => {
      // Industry breakdown
      const industry = icp.basic_identification?.industry_classification
      if (industry) {
        industryBreakdown[industry] = (industryBreakdown[industry] || 0) + 1
      }

      // Protocol categories
      const category = icp.basic_identification?.protocol_category
      if (category) {
        protocolCategories[category] = (protocolCategories[category] || 0) + 1
      }

      // Confidence calculation
      if (icp.confidence_score) {
        totalConfidence += icp.confidence_score
        confidenceCount++
      }
    })

    // Sort top protocol categories
    const topProtocolCategories = Object.entries(protocolCategories)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get recent analyses with compatibility layer
    const recentAnalyses = data
      .sort((a, b) => new Date(b.updated_at || '').getTime() - new Date(a.updated_at || '').getTime())
      .slice(0, 5)
      .map(icp => computeLegacyFieldsFromStructured(icp))

    return {
      totalAnalyses: data.length,
      industryBreakdown,
      averageConfidence: confidenceCount > 0 ? totalConfidence / confidenceCount : 0,
      topProtocolCategories,
      recentAnalyses
    }
  } catch (error) {
    console.error('Error getting ICP insights:', error)
    return {
      totalAnalyses: 0,
      industryBreakdown: {},
      averageConfidence: 0,
      topProtocolCategories: [],
      recentAnalyses: []
    }
  }
}

/**
 * Update organization with social insights from Grok
 * Note: Only updates essential organization fields, detailed data goes to organization_icp
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
    
    // Only update essential organization fields (redundant fields have been removed)
    if (socialInsights.website_url) {
      updates.website_url = socialInsights.website_url
    }
    
    // Skip all other fields - they're now stored in organization_icp
    // Industry, partnerships, funding info, etc. are handled in ICP analysis

    // Only update if we have something to update
    if (Object.keys(updates).length === 0) {
      return true
    }

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

/**
 * Compute legacy fields from structured JSONB fields for backward compatibility
 * This allows existing display components to work without modification
 */
export function computeLegacyFieldsFromStructured(icp: OrganizationICP): OrganizationICP {
  // If legacy fields are already present, return as-is
  if (icp.target_industry || icp.target_role || icp.demographics || icp.psychographics) {
    return icp
  }

  // Compute legacy fields from structured data
  const computed: Partial<OrganizationICP> = {
    ...icp
  }

  // Extract basic targeting info
  if (icp.basic_identification) {
    computed.target_industry = icp.basic_identification.industry_classification || 
                               icp.basic_identification.protocol_category
  }

  // Extract target role and demographics from ICP synthesis
  if (icp.icp_synthesis) {
    computed.target_role = icp.icp_synthesis.primary_user_archetypes?.join(', ') ||
                          icp.icp_synthesis.target_web3_segment

    computed.company_size = icp.icp_synthesis.demographic_profile?.experience_level ||
                           icp.icp_synthesis.demographic_profile?.vibe_range

    computed.geographic_location = icp.icp_synthesis.demographic_profile?.geographic_distribution

    // Map structured demographics to legacy format
    if (icp.icp_synthesis.demographic_profile) {
      computed.demographics = {
        age_range: icp.icp_synthesis.demographic_profile.vibe_range || 'Not specified',
        education_level: icp.icp_synthesis.demographic_profile.experience_level || 'Not specified',
        income_level: 'Not specified', // Not typically in structured format
        job_seniority: icp.icp_synthesis.demographic_profile.roles?.join(', ') || 'Not specified'
      }
    }

    // Map structured psychographics to legacy format
    if (icp.icp_synthesis.psychographic_drivers) {
      computed.psychographics = {
        values: icp.icp_synthesis.psychographic_drivers.core_values || [],
        interests: icp.icp_synthesis.psychographic_drivers.trending_interests || [],
        motivations: icp.icp_synthesis.psychographic_drivers.primary_motivations || [],
        challenges: icp.icp_synthesis.psychographic_drivers.key_challenges || []
      }
    }

    // Extract pain points
    computed.pain_points = icp.icp_synthesis.psychographic_drivers?.key_challenges || []
  }

  // Extract behavioral traits from user behavior insights and ICP synthesis
  if (icp.user_behavior_insights || icp.icp_synthesis?.behavioral_indicators) {
    computed.behavioral_traits = {
      preferred_channels: ['Twitter', 'Discord', 'Governance Forums'], // Web3 default
      decision_making_style: icp.user_behavior_insights?.engagement_characteristics?.decision_making_style || 'Not specified',
      buying_behavior: icp.icp_synthesis?.behavioral_indicators?.purchase_motives?.join(', ') || 'Not specified',
      communication_style: icp.messaging_strategy?.communication_style || 'Not specified'
    }
  }

  // Extract keywords from messaging strategy
  if (icp.messaging_strategy) {
    computed.keywords = icp.messaging_strategy.content_keywords || []
  }

  return computed as OrganizationICP
}
