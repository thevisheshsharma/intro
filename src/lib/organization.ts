import { supabase } from './supabase'
import { handleDatabaseError } from './error-utils'

/**
 * Shared database utilities for common operations
 */
export const DatabaseUtils = {
  /**
   * Generate standardized timestamp
   */
  timestamp: () => new Date().toISOString(),

  /**
   * Handle database errors with consistent logging and return patterns
   * @deprecated Use handleDatabaseError from error-utils instead
   */
  handleError: (error: any, operation: string, context?: string): null => {
    return handleDatabaseError(error, operation, context)
  },

  /**
   * Generic upsert operation with error handling
   * @param table - Table name
   * @param data - Data to upsert
   * @param identifierQuery - Query to find existing record
   * @param updateFields - Optional specific fields to update (defaults to all data)
   */
  upsert: async <T>(
    table: string,
    data: any,
    identifierQuery: { column: string; value: any }[],
    updateFields?: Partial<T>
  ): Promise<T | null> => {
    try {
      // Check for existing record
      let query = supabase.from(table).select('id')
      identifierQuery.forEach(({ column, value }) => {
        query = query.eq(column, value)
      })
      
      const { data: existing, error: checkError } = await query.single()

      if (checkError && checkError.code !== 'PGRST116') {
        return DatabaseUtils.handleError(checkError, 'checking existing record in', table)
      }

      const timestamp = DatabaseUtils.timestamp()

      if (existing) {
        // Update existing record
        const updateData = updateFields || data
        updateData.updated_at = timestamp
        
        const { data: updated, error } = await supabase
          .from(table)
          .update(updateData)
          .eq('id', existing.id)
          .select()
          .single()

        if (error) {
          return DatabaseUtils.handleError(error, 'updating record in', table)
        }
        return updated as T
      } else {
        // Create new record
        data.created_at = timestamp
        data.updated_at = timestamp
        
        const { data: created, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single()

        if (error) {
          return handleDatabaseError(error, 'creating record', table)
        }
        return created as T
      }
    } catch (error) {
      return handleDatabaseError(error, 'upsert operation', table)
    }
  },

  /**
   * Generic fetch operation with error handling
   */
  fetch: async <T>(
    table: string,
    query: { column: string; value: any }[],
    selectFields: string = '*'
  ): Promise<T | null> => {
    try {
      let dbQuery = supabase.from(table).select(selectFields)
      query.forEach(({ column, value }) => {
        dbQuery = dbQuery.eq(column, value)
      })
      
      const { data, error } = await dbQuery.single()

      if (error) {
        return handleDatabaseError(error, 'fetching from', table)
      }
      return data as T
    } catch (error) {
      return handleDatabaseError(error, 'fetch operation', table)
    }
  }
}

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
  created_at?: string
  updated_at?: string
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
 * Optimized to reduce redundant field mapping patterns
 */
export function mapNewOrgJsonToDbFields(grokResponse: DetailedICPAnalysisResponse): {
  org: Partial<Organization>
  icp: Partial<OrganizationICP>
} {
  // Extract organization fields - only essential data
  const org: Partial<Organization> = {
    name: grokResponse.basic_identification?.project_name || 'Unknown Project',
    twitter_username: grokResponse.twitter_username?.replace('@', '') || '',
    website_url: grokResponse.basic_identification?.website_url
  };

  // Build ICP with structured data - legacy fields computed on-demand
  const icp: Partial<OrganizationICP> = {
    // Core structured fields
    basic_identification: grokResponse.basic_identification,
    icp_synthesis: grokResponse.icp_synthesis,
    messaging_strategy: grokResponse.messaging_strategy,
    user_behavior_insights: grokResponse.user_behavior_insights,
    core_metrics: grokResponse.core_metrics,
    ecosystem_analysis: grokResponse.ecosystem_analysis,
    governance_tokenomics: grokResponse.governance_tokenomics,
    
    // Essential metadata
    confidence_score: grokResponse.confidence_score || 0,
    analysis_summary: [
      `Target: ${grokResponse.icp_synthesis?.target_web3_segment || 'Not specified'}`,
      `Users: ${grokResponse.icp_synthesis?.primary_user_archetypes?.join(', ') || 'Not specified'}`,
      `Style: ${grokResponse.messaging_strategy?.communication_style || 'Not specified'}`
    ].join('. '),
    
    // Consolidated research sources
    research_sources: {
      twitter_analysis: `Followers: ${grokResponse.core_metrics?.market_position?.twitter_followers || 'N/A'}`,
      website_insights: grokResponse.basic_identification?.website_url || 'Not available',
      news_mentions: grokResponse.ecosystem_analysis?.recent_developments?.join('; ') || 'None',
      competitor_insights: grokResponse.ecosystem_analysis?.notable_partnerships?.join(', ') || 'None',
      search_confidence: (grokResponse.confidence_score || 0).toString()
    }
  };

  return { org, icp };
}

/**
 * Save organization to database - optimized with shared utilities
 */
export async function saveOrganization(
  organization: Organization
): Promise<Organization | null> {
  // Prepare data for upsert
  const orgData = {
    user_id: organization.user_id,
    twitter_username: organization.twitter_username,
    name: organization.name || organization.twitter_username || 'Unknown',
    website_url: organization.website_url
  }

  // Use shared upsert utility
  return DatabaseUtils.upsert<Organization>(
    'organizations',
    orgData,
    [
      { column: 'user_id', value: organization.user_id },
      { column: 'twitter_username', value: organization.twitter_username }
    ],
    // For updates, only update specific fields
    {
      name: organization.name,
      website_url: organization.website_url
    }
  )
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
      return handleDatabaseError(error, 'fetching organization by user ID', 'organizations')
    }
    return data
  } catch (error) {
    return handleDatabaseError(error, 'fetching organization by user ID', 'organizations')
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
      return handleDatabaseError(error, 'fetching organization by user and twitter', 'organizations')
    }
    return data
  } catch (error) {
    return handleDatabaseError(error, 'fetching organization by user and twitter', 'organizations')
  }
}

/**
 * Save ICP analysis to database - handles structured and partial formats
 * Legacy format support removed as all active APIs use structured format
 */
export async function saveICPAnalysis(
  organizationId: string,
  icp: DetailedICPAnalysisResponse | Partial<OrganizationICP>,
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
      const detailedResponse = icp as DetailedICPAnalysisResponse
      const mapped = mapNewOrgJsonToDbFields(detailedResponse)
      
      icpData = {
        organization_id: organizationId,
        ...mapped.icp,
        // Override/add specific fields
        grok_response: metadata.grokResponse,
        full_icp_json: detailedResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes,
        enhanced_format_updated_at: DatabaseUtils.timestamp()
      }
    } else {
      // Direct OrganizationICP partial object (for custom edits/updates)
      icpData = {
        organization_id: organizationId,
        ...icp,
        grok_response: metadata.grokResponse,
        model_used: metadata.modelUsed,
        token_usage: metadata.tokenUsage,
        is_custom: metadata.isCustom || false,
        custom_notes: metadata.customNotes,
        enhanced_format_updated_at: DatabaseUtils.timestamp()
      }
    }

    // Use shared upsert utility
    return await DatabaseUtils.upsert<OrganizationICP>(
      'organization_icp',
      icpData,
      [{ column: 'organization_id', value: organizationId }]
    )
  } catch (error) {
    return handleDatabaseError(error, 'saving ICP analysis', 'organization_icp')
  }
}



/**
 * Get ICP analysis by organization ID
 */
export async function getICPAnalysis(
  organizationId: string
): Promise<OrganizationICP | null> {
  return await DatabaseUtils.fetch<OrganizationICP>(
    'organization_icp',
    [{ column: 'organization_id', value: organizationId }]
  )
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
    
    // Only update essential organization fields
    if (socialInsights.website_url) {
      updates.website_url = socialInsights.website_url
    }
    
    // Only update if we have something to update
    if (Object.keys(updates).length === 0) {
      return true
    }

    const { error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', organizationId)

    if (error) {
      handleDatabaseError(error, 'updating organization social insights', 'organizations')
      return false
    }

    return true
  } catch (error) {
    handleDatabaseError(error, 'updating organization social insights', 'organizations')
    return false
  }
}
