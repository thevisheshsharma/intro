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
      console.log('💾 DatabaseUtils.upsert called:', { table, data, identifierQuery })
      
      // Check for existing record
      let query = supabase.from(table).select('id')
      identifierQuery.forEach(({ column, value }) => {
        query = query.eq(column, value)
      })
      
      const { data: existing, error: checkError } = await query.single()
      console.log('🔍 Existing record check result:', { existing, checkError })

      if (checkError && checkError.code !== 'PGRST116') {
        console.log('❌ Error checking existing record:', checkError)
        return DatabaseUtils.handleError(checkError, 'checking existing record in', table)
      }

      const timestamp = DatabaseUtils.timestamp()

      if (existing) {
        console.log('✅ Existing record found, updating...')
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
          console.log('❌ Error updating record:', error)
          return DatabaseUtils.handleError(error, 'updating record in', table)
        }
        console.log('✅ Record updated:', updated)
        return updated as T
      } else {
        console.log('🆕 No existing record, creating new...')
        // Create new record
        data.created_at = timestamp
        data.updated_at = timestamp
        
        const { data: created, error } = await supabase
          .from(table)
          .insert(data)
          .select()
          .single()

        if (error) {
          console.log('❌ Error creating record:', error)
          return handleDatabaseError(error, 'creating record', table)
        }
        console.log('✅ Record created:', created)
        return created as T
      }
    } catch (error) {
      console.error('❌ DatabaseUtils.upsert catch error:', error)
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
        // PGRST116 means no rows found, which is not an error for our use case
        if (error.code === 'PGRST116') {
          return null
        }
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
  name?: string
  twitter_username: string
  website_url?: string
  additional_social_links?: string[]
  industry_classification?: string
  estimated_company_size?: string
  recent_developments?: string
  key_partnerships?: string[]
  funding_info?: string
  created_by_user_id?: string
  created_at?: string
  updated_at?: string
}

// ✅ REMOVED: OrganizationICP interface and DetailedICPAnalysisResponse
// These types are now redundant as Neo4j handles all ICP analysis storage
// with comprehensive flattening and better structure

// ✅ REMOVED: mapNewOrgJsonToDbFields function
// This mapping function is now redundant as Neo4j handles
// comprehensive property mapping with better flattening

/**
 * Save organization to database - global, no user ownership
 */
export async function saveOrganization(
  organization: Omit<Organization, 'user_id'> & { created_by_user_id?: string }
): Promise<Organization | null> {
  console.log('💾 saveOrganization called with:', organization)
  
  // Prepare data for upsert
  const orgData = {
    twitter_username: organization.twitter_username?.replace('@', '').toLowerCase(),
    name: organization.name || organization.twitter_username || 'Unknown',
    website_url: organization.website_url,
    created_by_user_id: organization.created_by_user_id
  }
  
  console.log('💾 Prepared orgData:', orgData)

  try {
    // Use custom DatabaseUtils.upsert since the table doesn't have a unique constraint
    console.log('💾 Performing custom upsert operation...')
    const result = await DatabaseUtils.upsert<Organization>(
      'organizations',
      orgData,
      [{ column: 'twitter_username', value: orgData.twitter_username }]
    )
    
    console.log('✅ saveOrganization result:', result)
    return result
  } catch (error) {
    console.error('❌ saveOrganization catch error:', error)
    return handleDatabaseError(error, 'saving organization', 'organizations')
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

/**
 * Get organization by Twitter username (global, not user-specific)
 */
export async function getOrganizationByTwitter(
  twitterUsername: string
): Promise<Organization | null> {
  try {
    const normalizedUsername = twitterUsername.replace(/^@/, '').toLowerCase()
    console.log('🔍 getOrganizationByTwitter - searching for:', normalizedUsername)
    
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('twitter_username', normalizedUsername)
      .single()
    
    if (error) {
      // PGRST116 means no rows found, which is not an error for our use case
      if (error.code === 'PGRST116') {
        console.log('ℹ️ getOrganizationByTwitter - no organization found')
        return null
      }
      console.log('❌ getOrganizationByTwitter error:', error)
      return handleDatabaseError(error, 'fetching organization by twitter', 'organizations')
    }
    
    console.log('✅ getOrganizationByTwitter result:', data)
    return data
  } catch (error) {
    console.error('❌ getOrganizationByTwitter catch error:', error)
    return handleDatabaseError(error, 'fetching organization by twitter', 'organizations')
  }
}

/**
 * Track user access to organization
 * Note: Currently disabled as user_organization_access table doesn't exist
 */
export async function trackUserOrganizationAccess(
  userId: string,
  organizationId: string
): Promise<void> {
  try {
    console.log('👤 trackUserOrganizationAccess - userId:', userId, 'organizationId:', organizationId)
    
    // Check if the table exists first
    const { error: checkError } = await supabase
      .from('user_organization_access')
      .select('count', { count: 'exact', head: true })
      .limit(0)
    
    if (checkError) {
      if (checkError.code === '42P01') {
        console.log('ℹ️ user_organization_access table does not exist, skipping tracking')
        return
      }
      console.warn('⚠️ Could not check user_organization_access table:', checkError)
      return
    }
    
    // Table exists, proceed with upsert
    const { error } = await supabase
      .from('user_organization_access')
      .upsert({
        user_id: userId,
        organization_id: organizationId,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id',
        count: 'exact'
      })
    
    if (error) {
      console.error('❌ trackUserOrganizationAccess upsert error:', error)
      handleDatabaseError(error, 'tracking user organization access', 'user_organization_access')
    } else {
      console.log('✅ User organization access tracked')
    }
    
    // Increment access count
    console.log('📊 Incrementing access count...')
    const { error: rpcError } = await supabase.rpc('increment_access_count', {
      p_user_id: userId,
      p_organization_id: organizationId
    })
    
    if (rpcError) {
      if (rpcError.code === '42P01') {
        console.log('ℹ️ increment_access_count RPC function or related table does not exist, skipping')
      } else {
        console.error('❌ increment_access_count RPC error:', rpcError)
      }
    } else {
      console.log('✅ Access count incremented')
    }
  } catch (error) {
    console.error('❌ trackUserOrganizationAccess catch error:', error)
    handleDatabaseError(error, 'tracking user organization access', 'user_organization_access')
  }
}

// ✅ REMOVED: saveICPAnalysis and getICPAnalysis functions
// These functions are now redundant as Neo4j handles all ICP analysis storage
// with comprehensive flattening and better structure

/**
 * Clean up duplicate organizations by twitter_username (utility function)
 * This can be called if duplicates are suspected
 */
export async function cleanupDuplicateOrganizations(): Promise<void> {
  try {
    console.log('🧹 Starting cleanup of duplicate organizations...')
    
    // First, get all organizations grouped by twitter_username
    const { data: allOrgs, error } = await supabase
      .from('organizations')
      .select('id, twitter_username, created_at')
      .order('twitter_username', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching organizations for cleanup:', error)
      return
    }

    // Group by twitter_username and find duplicates
    const groupedOrgs = allOrgs.reduce((acc, org) => {
      if (!acc[org.twitter_username]) {
        acc[org.twitter_username] = []
      }
      acc[org.twitter_username].push(org)
      return acc
    }, {} as Record<string, any[]>)

    // Find usernames with duplicates
    const duplicateUsernames = Object.keys(groupedOrgs).filter(
      username => groupedOrgs[username].length > 1
    )

    if (duplicateUsernames.length === 0) {
      console.log('✅ No duplicate organizations found')
      return
    }

    console.log('⚠️ Found duplicates for usernames:', duplicateUsernames)

    // For each duplicate username, keep the most recent one and delete the rest
    for (const username of duplicateUsernames) {
      const orgs = groupedOrgs[username]
      const [keepOrg, ...deleteOrgs] = orgs // Keep first (most recent), delete rest
      
      console.log(`🧹 For ${username}: keeping ${keepOrg.id}, deleting ${deleteOrgs.length} duplicates`)
      
      for (const orgToDelete of deleteOrgs) {
        const { error: deleteError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', orgToDelete.id)
        
        if (deleteError) {
          console.error(`❌ Error deleting duplicate org ${orgToDelete.id}:`, deleteError)
        } else {
          console.log(`✅ Deleted duplicate org ${orgToDelete.id}`)
        }
      }
    }

    console.log('✅ Cleanup completed')
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
  }
}
