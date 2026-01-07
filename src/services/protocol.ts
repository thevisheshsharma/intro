import { runQuery, runBatchQuery } from '@/lib/neo4j'
import { GroupedProtocol } from '@/lib/llama-api'
import { VibeType } from '@/lib/validation'
import { categoryMapper, type OrgType } from './protocol-category-mapper'

// Optimal batch sizes for protocol operations
const PROTOCOL_BATCH_SIZES = {
  PROTOCOL_UPSERT: 25,       // Smaller batches for protocol data
  EXISTENCE_CHECK: 100       // Larger batches for simple lookups
} as const

export interface Neo4jProtocol {
  protocolId: string
  screenName: string
  name: string
  profileImageUrl?: string
  about?: string       // Primary description (from first about_array entry)
  location?: string
  url: string[]        // Array of related URLs
  verified: boolean
  lastUpdated: string
  
  // Protocol-specific fields
  vibe: string             // Always 'organization' for protocols
  orgType: OrgType         // Mapped based on categories
  orgSubtype: string[]     // Array of categories
  web3Focus: string        // Always 'native'
  operationalStatus: string // Always 'mainnet'
  
  // Financial data
  tvl?: number             // Calculated based on date logic
  gecko_id?: string       // Single value from first protocol
  cmcId?: string          // Single value from first protocol
  token?: string          // Single value from first protocol (renamed from token_symbol)
  
  // Arrays stored as JSON strings in Neo4j
  llama_id: string              // JSON array of protocol IDs
  contract_address: string      // JSON array of contract addresses
  about_array: string           // JSON array of descriptions
  chains: string                // JSON array of supported chains
  llama_slug: string            // JSON array of protocol slugs
  audit_links: string           // JSON array of audit links (renamed from audit_report_url)
  github: string               // JSON array of github URLs (renamed from github_url)
  governance_forum: string      // JSON array of governance forums
  recent_developments: string   // JSON array of important events/milestones
}

/**
 * Transform grouped protocol to Neo4j format
 */
// Helper to check if value should be stored (not null, undefined, empty string, or dash)
const shouldStore = (value: any): boolean => {
  return value != null && value !== '' && value !== '-'
}

export function transformProtocolToNeo4j(groupedProtocol: GroupedProtocol): Neo4jProtocol {
  // Generate a unique protocol ID based on parent slug or first protocol slug
  const protocolId = groupedProtocol.parentProtocolSlug || 
                    groupedProtocol.llama_slug[0] || 
                    groupedProtocol.name.toLowerCase().replace(/\s+/g, '-')

  // Location should be geographic, not blockchain networks - leave empty for protocols
  const location = ''

  // ✅ Use optimized mapper - single call, handles all logic
  const orgType = categoryMapper.mapCategoriesToOrgType(groupedProtocol.org_subType)

  return {
    protocolId,
    name: groupedProtocol.name,
    screenName: groupedProtocol.screenName || '',
    about: groupedProtocol.about[0] || '', // Single entry from first protocol
    profileImageUrl: '', // No logo field in new mapping
    url: groupedProtocol.url || [], // Array of URLs
    location,
    verified: true, // All protocols are considered verified
    lastUpdated: new Date().toISOString(),
    
    // Static classification fields
    vibe: VibeType.ORGANIZATION,
    orgType: orgType, // Efficiently mapped
    orgSubtype: groupedProtocol.org_subType || [], // Array of categories
    web3Focus: 'native',
    operationalStatus: 'mainnet',
    
    // Financial data - safe number conversion
    tvl: groupedProtocol.totalTvl || undefined,
    gecko_id: shouldStore(groupedProtocol.gecko_id) ? groupedProtocol.gecko_id : undefined,
    cmcId: shouldStore(groupedProtocol.cmcId) ? groupedProtocol.cmcId : undefined,
    token: shouldStore(groupedProtocol.token) ? groupedProtocol.token : undefined,
    
    // Arrays as JSON strings
    llama_id: JSON.stringify(groupedProtocol.llama_id),
    contract_address: JSON.stringify(groupedProtocol.contract_address),
    about_array: JSON.stringify(groupedProtocol.about),
    chains: JSON.stringify(groupedProtocol.chains),
    llama_slug: JSON.stringify(groupedProtocol.llama_slug),
    audit_links: JSON.stringify(groupedProtocol.audit_links),
    github: JSON.stringify(groupedProtocol.github),
    governance_forum: JSON.stringify(groupedProtocol.governance_forum),
    recent_developments: JSON.stringify(groupedProtocol.recent_developments)
  }
}

/**
 * Find existing protocols by screen name in Neo4j
 */
export async function findProtocolsByScreenName(screenNames: string[]): Promise<{
  screenName: string
  userId: string
  tvl?: number
  lastUpdated: string
}[]> {
  if (screenNames.length === 0) return []
  
  const query = `
    UNWIND $screenNames AS screenName
    MATCH (p:User {vibe: 'organization', orgType: 'protocol'})
    WHERE toLower(p.screenName) = toLower(screenName)
    RETURN p.screenName as screenName, p.userId as userId, p.tvl as tvl, p.lastUpdated as lastUpdated
  `
  
  const results = await runBatchQuery(query, { screenNames })
  return results.map(record => ({
    screenName: record.screenName,
    userId: record.userId,
    tvl: record.tvl ? Number(record.tvl) : undefined,
    lastUpdated: record.lastUpdated
  }))
}

/**
 * Find existing protocols by Twitter screen names
 */
export async function findExistingProtocolsByScreenName(screenNames: string[]): Promise<Array<{
  userId: string
  screenName: string
}>> {
  if (screenNames.length === 0) return []
  
  const query = `
    UNWIND $screenNames AS screenName
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(screenName)
    RETURN u.userId as userId, u.screenName as screenName
  `
  
  const results = await runBatchQuery(query, { screenNames })
  return results.map(record => ({
    userId: record.userId,
    screenName: record.screenName
  }))
}

/**
 * Check if protocols exist in Neo4j
 */
export async function checkProtocolsExist(protocolIds: string[]): Promise<string[]> {
  if (protocolIds.length === 0) return []
  
  const query = `
    UNWIND $protocolIds AS protocolId
    MATCH (p:User {userId: protocolId, vibe: 'organization', orgType: 'protocol'})
    RETURN p.userId as existingProtocolId
  `
  
  const results = await runBatchQuery(query, { protocolIds })
  return results.map(record => record.existingProtocolId)
}

/**
 * Create or update a single protocol in Neo4j with screenName uniqueness check
 */
export async function createOrUpdateProtocol(protocol: Neo4jProtocol): Promise<void> {
  // First, check if a user with the same screenName (case-insensitive) already exists
  const existingUserQuery = `
    MATCH (existing:User)
    WHERE toLower(existing.screenName) = toLower($screenName)
    RETURN existing.userId as existingUserId
    LIMIT 1
  `
  
  const existingResult = await runQuery(existingUserQuery, { screenName: protocol.screenName || '' })
  const finalUserId = existingResult.length > 0 ? existingResult[0].existingUserId : protocol.protocolId

  if (existingResult.length > 0 && existingResult[0].existingUserId !== protocol.protocolId) {
    console.log(`🔄 Protocol screenName conflict: ${protocol.screenName} (${protocol.protocolId} -> ${finalUserId})`)
  }

  const query = `
    MERGE (p:User {userId: $protocolId})
    SET 
      p.screenName = $screenName,
      p.name = $name,
      p.profileImageUrl = $profileImageUrl,
      p.description = $about,
      p.location = $location,
      p.url = $url,
      p.followersCount = 0,
      p.followingCount = 0,
      p.verified = $verified,
      p.lastUpdated = $lastUpdated,
      p.createdAt = COALESCE(p.createdAt, $lastUpdated),
      p.listedCount = 0,
      p.statusesCount = 0,
      p.favouritesCount = 0,
      p.protected = false,
      p.canDm = false,
      p.profileBannerUrl = '',
      p.verificationType = '',
      p.verificationReason = '',
      p.vibe = $vibe,
      p.department = '',
      p.orgType = $orgType,
      p.orgSubtype = $orgSubtype,
      p.web3Focus = $web3Focus,
      p.operationalStatus = $operationalStatus,
      p.tvl = $tvl,
      p.gecko_id = $gecko_id,
      p.cmcId = $cmcId,
      p.token = $token,
      p.llama_id = $llama_id,
      p.contract_address = $contract_address,
      p.about_array = $about_array,
      p.chains = $chains,
      p.llama_slug = $llama_slug,
      p.audit_links = $audit_links,
      p.github = $github,
      p.governance_forum = $governance_forum,
      p.recent_developments = $recent_developments
    RETURN p.userId as protocolId
  `
  
  const params = {
    protocolId: finalUserId,
    screenName: protocol.screenName || '',
    name: protocol.name,
    profileImageUrl: protocol.profileImageUrl || '',
    about: protocol.about || '',
    location: protocol.location || '',
    url: JSON.stringify(protocol.url),
    verified: protocol.verified,
    lastUpdated: protocol.lastUpdated,
    vibe: protocol.vibe,
    orgType: protocol.orgType,
    orgSubtype: JSON.stringify(protocol.orgSubtype),
    web3Focus: protocol.web3Focus,
    operationalStatus: protocol.operationalStatus,
    tvl: protocol.tvl || null,
    gecko_id: protocol.gecko_id || '',
    cmcId: protocol.cmcId || '',
    token: protocol.token || '',
    llama_id: protocol.llama_id,
    contract_address: protocol.contract_address,
    about_array: protocol.about_array,
    chains: protocol.chains,
    llama_slug: protocol.llama_slug,
    audit_links: protocol.audit_links,
    github: protocol.github,
    governance_forum: protocol.governance_forum,
    recent_developments: protocol.recent_developments
  }
  
  await runQuery(query, params)
}

/**
 * Batch create or update protocols optimized for performance
 */
export async function createOrUpdateProtocolsOptimized(protocols: Neo4jProtocol[]): Promise<{
  processed: number
  errors: string[]
}> {
  if (protocols.length === 0) {
    return { processed: 0, errors: [] }
  }

  console.log(`Processing ${protocols.length} protocols in batches of ${PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT}`)
  
  const errors: string[] = []
  let processed = 0
  
  // Process in batches
  for (let i = 0; i < protocols.length; i += PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT) {
    const batch = protocols.slice(i, i + PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT)
    console.log(`Processing batch ${Math.floor(i / PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT) + 1}/${Math.ceil(protocols.length / PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT)}`)
    
    try {
      const query = `
        UNWIND $protocols AS protocolData
        // For protocols with screenName, check if one already exists
        CALL {
          WITH protocolData
          OPTIONAL MATCH (existing:User {vibe: 'organization', orgType: 'protocol'})
          WHERE existing.screenName = protocolData.screenName 
            AND protocolData.screenName IS NOT NULL 
            AND protocolData.screenName <> ''
          RETURN existing
        }
        
        // Use existing user or create new one
        WITH protocolData, existing,
             CASE WHEN existing IS NOT NULL THEN existing.userId ELSE protocolData.protocolId END AS targetUserId
        
        MERGE (p:User {userId: targetUserId})
        ON CREATE SET p.createdAt = protocolData.lastUpdated
        SET 
          // Only update if new value is not null/empty, preserve existing data
          p.screenName = CASE WHEN protocolData.screenName IS NOT NULL AND protocolData.screenName <> '' THEN protocolData.screenName ELSE COALESCE(p.screenName, '') END,
          p.name = CASE WHEN protocolData.name IS NOT NULL AND protocolData.name <> '' THEN protocolData.name ELSE COALESCE(p.name, '') END,
          // Use the single about field for description - the about_array is stored separately
          p.description = CASE WHEN protocolData.about IS NOT NULL AND protocolData.about <> '' THEN protocolData.about ELSE COALESCE(p.description, '') END,
          p.location = CASE WHEN protocolData.location IS NOT NULL AND protocolData.location <> '' THEN protocolData.location ELSE COALESCE(p.location, '') END,
          p.url = CASE WHEN protocolData.url IS NOT NULL AND protocolData.url <> '' THEN protocolData.url ELSE COALESCE(p.url, '') END,
          
          // Preserve existing social media data - only set defaults on new nodes
          p.followersCount = COALESCE(p.followersCount, 0),
          p.followingCount = COALESCE(p.followingCount, 0),
          p.listedCount = COALESCE(p.listedCount, 0),
          p.statusesCount = COALESCE(p.statusesCount, 0),
          p.favouritesCount = COALESCE(p.favouritesCount, 0),
          p.protected = COALESCE(p.protected, false),
          p.canDm = COALESCE(p.canDm, false),
          p.profileImageUrl = COALESCE(p.profileImageUrl, ''),
          p.profileBannerUrl = COALESCE(p.profileBannerUrl, ''),
          p.verificationType = COALESCE(p.verificationType, ''),
          p.verificationReason = COALESCE(p.verificationReason, ''),
          p.department = COALESCE(p.department, ''),
          
          // Always update these fields
          p.verified = protocolData.verified,
          p.lastUpdated = protocolData.lastUpdated,
          p.createdAt = COALESCE(p.createdAt, protocolData.lastUpdated),
          p.vibe = protocolData.vibe,
          p.orgType = protocolData.orgType,
          p.orgSubtype = protocolData.orgSubtype,
          p.web3Focus = protocolData.web3Focus,
          p.operationalStatus = protocolData.operationalStatus,
          
          // Protocol-specific fields - only update if not null/empty
          p.tvl = CASE WHEN protocolData.tvl IS NOT NULL THEN protocolData.tvl ELSE p.tvl END,
          p.gecko_id = CASE WHEN protocolData.gecko_id IS NOT NULL AND protocolData.gecko_id <> '' AND protocolData.gecko_id <> '-' THEN protocolData.gecko_id ELSE COALESCE(p.gecko_id, '') END,
          p.cmcId = CASE WHEN protocolData.cmcId IS NOT NULL AND protocolData.cmcId <> '' AND protocolData.cmcId <> '-' THEN protocolData.cmcId ELSE COALESCE(p.cmcId, '') END,
          p.token = CASE WHEN protocolData.token IS NOT NULL AND protocolData.token <> '' AND protocolData.token <> '-' THEN protocolData.token ELSE COALESCE(p.token, '') END,
          
          // Array fields - always update these
          p.llama_id = protocolData.llama_id,
          p.contract_address = protocolData.contract_address,
          p.about_array = protocolData.about_array,
          p.chains = protocolData.chains,
          p.llama_slug = protocolData.llama_slug,
          p.audit_links = protocolData.audit_links,
          p.github = protocolData.github,
          p.governance_forum = protocolData.governance_forum,
          p.recent_developments = protocolData.recent_developments
        RETURN p.userId as protocolId
      `
      
      await runQuery(query, { protocols: batch })
      processed += batch.length
      
    } catch (error) {
      const errorMsg = `Failed to process protocol batch ${Math.floor(i / PROTOCOL_BATCH_SIZES.PROTOCOL_UPSERT) + 1}: ${error}`
      console.error(errorMsg)
      errors.push(errorMsg)
      
      // Individual fallback processing for failed batch
      console.log(`Attempting individual processing for failed batch with ${batch.length} protocols...`)
      let batchSuccessCount = 0
      let batchErrorCount = 0
      
      for (const protocol of batch) {
        try {
          const singleQuery = `
            WITH $protocolData AS protocolData
            // For protocols with screenName, check if one already exists
            CALL {
              WITH protocolData
              OPTIONAL MATCH (existing:User {vibe: 'organization', orgType: 'protocol'})
              WHERE existing.screenName = protocolData.screenName 
                AND protocolData.screenName IS NOT NULL 
                AND protocolData.screenName <> ''
              RETURN existing
            }
            
            // Use existing user or create new one
            WITH protocolData, existing,
                 CASE WHEN existing IS NOT NULL THEN existing.userId ELSE protocolData.protocolId END AS targetUserId
            
            MERGE (p:User {userId: targetUserId})
            ON CREATE SET p.createdAt = protocolData.lastUpdated
            SET 
              // Only update if new value is not null/empty, preserve existing data
              p.screenName = CASE WHEN protocolData.screenName IS NOT NULL AND protocolData.screenName <> '' THEN protocolData.screenName ELSE COALESCE(p.screenName, '') END,
              p.name = CASE WHEN protocolData.name IS NOT NULL AND protocolData.name <> '' THEN protocolData.name ELSE COALESCE(p.name, '') END,
              // Use the single about field for description - the about_array is stored separately
              p.description = CASE WHEN protocolData.about IS NOT NULL AND protocolData.about <> '' THEN protocolData.about ELSE COALESCE(p.description, '') END,
              p.location = CASE WHEN protocolData.location IS NOT NULL AND protocolData.location <> '' THEN protocolData.location ELSE COALESCE(p.location, '') END,
              p.url = CASE WHEN protocolData.url IS NOT NULL AND protocolData.url <> '' THEN protocolData.url ELSE COALESCE(p.url, '') END,
              
              // Preserve existing social media data - only set defaults on new nodes
              p.followersCount = COALESCE(p.followersCount, 0),
              p.followingCount = COALESCE(p.followingCount, 0),
              p.listedCount = COALESCE(p.listedCount, 0),
              p.statusesCount = COALESCE(p.statusesCount, 0),
              p.favouritesCount = COALESCE(p.favouritesCount, 0),
              p.protected = COALESCE(p.protected, false),
              p.canDm = COALESCE(p.canDm, false),
              p.profileImageUrl = COALESCE(p.profileImageUrl, ''),
              p.profileBannerUrl = COALESCE(p.profileBannerUrl, ''),
              p.verificationType = COALESCE(p.verificationType, ''),
              p.verificationReason = COALESCE(p.verificationReason, ''),
              p.department = COALESCE(p.department, ''),
              
              // Always update these fields
              p.verified = protocolData.verified,
              p.lastUpdated = protocolData.lastUpdated,
              p.createdAt = COALESCE(p.createdAt, protocolData.lastUpdated),
              p.vibe = protocolData.vibe,
              p.orgType = protocolData.orgType,
              p.orgSubtype = protocolData.orgSubtype,
              p.web3Focus = protocolData.web3Focus,
              p.operationalStatus = protocolData.operationalStatus,
              
              // Protocol-specific fields - only update if not null/empty
              p.tvl = CASE WHEN protocolData.tvl IS NOT NULL THEN protocolData.tvl ELSE p.tvl END,
              p.gecko_id = CASE WHEN protocolData.gecko_id IS NOT NULL AND protocolData.gecko_id <> '' AND protocolData.gecko_id <> '-' THEN protocolData.gecko_id ELSE COALESCE(p.gecko_id, '') END,
              p.cmcId = CASE WHEN protocolData.cmcId IS NOT NULL AND protocolData.cmcId <> '' AND protocolData.cmcId <> '-' THEN protocolData.cmcId ELSE COALESCE(p.cmcId, '') END,
              p.token = CASE WHEN protocolData.token IS NOT NULL AND protocolData.token <> '' AND protocolData.token <> '-' THEN protocolData.token ELSE COALESCE(p.token, '') END,
              
              // Array fields - always update these
              p.llama_id = protocolData.llama_id,
              p.contract_address = protocolData.contract_address,
              p.about_array = protocolData.about_array,
              p.chains = protocolData.chains,
              p.llama_slug = protocolData.llama_slug,
              p.audit_links = protocolData.audit_links,
              p.github = protocolData.github,
              p.governance_forum = protocolData.governance_forum,
              p.recent_developments = protocolData.recent_developments
            RETURN p.userId as protocolId
          `
          
          await runQuery(singleQuery, { protocolData: protocol })
          batchSuccessCount++
          processed++
        } catch (singleError) {
          batchErrorCount++
          const protocolId = protocol.protocolId || protocol.screenName || 'unknown'
          const singleErrorMsg = `Failed to process individual protocol ${protocolId}: ${singleError}`
          console.error(singleErrorMsg)
          errors.push(singleErrorMsg)
        }
      }
      
      console.log(`Individual processing completed: ${batchSuccessCount} succeeded, ${batchErrorCount} failed`)
    }
  }
  
  console.log(`Completed protocol processing: ${processed}/${protocols.length} processed, ${errors.length} errors`)
  return { processed, errors }
}

/**
 * Get protocol count by type for monitoring
 */
export async function getProtocolStats(): Promise<{
  total: number
  bySubtype: Record<string, number>
}> {
  const query = `
    MATCH (p:User {vibe: 'organization', orgType: 'protocol'})
    RETURN 
      count(p) as total,
      p.orgSubtype as subtype,
      count(p) as count
    ORDER BY count DESC
  `
  
  const results = await runBatchQuery(query, {})
  
  const bySubtype: Record<string, number> = {}
  let total = 0
  
  for (const record of results) {
    const subtype = record.subtype || 'unknown'
    const count = Number(record.count || 0)
    bySubtype[subtype] = count
    total += count
  }
  
  return { total, bySubtype }
}

/**
 * Clean up duplicate screenNames across ALL user types
 * Keep the one with the most complete data (most non-null fields)
 * Prioritize protocols over regular users when scores are close
 */
export async function cleanupDuplicateProtocols(): Promise<{
  duplicatesFound: number
  duplicatesRemoved: number
  details: Array<{
    screenName: string
    duplicatesCount: number
    removedNodes: string[]
    keptNode: string
  }>
}> {
  console.log('Cleaning up duplicate screenNames across all user types...')
  
  // Find all nodes with duplicate screenNames (case-insensitive) - not just protocols
  const findDuplicatesQuery = `
    MATCH (p:User)
    WHERE p.screenName IS NOT NULL AND p.screenName <> ''
    WITH toLower(p.screenName) as lowerScreenName, collect(p) as nodes
    WHERE size(nodes) > 1
    RETURN lowerScreenName, nodes
    ORDER BY lowerScreenName
  `
  
  const duplicates = await runBatchQuery(findDuplicatesQuery, {})
  let duplicatesRemoved = 0
  const details: Array<{
    screenName: string
    duplicatesCount: number
    removedNodes: string[]
    keptNode: string
  }> = []
  
  for (const record of duplicates) {
    const lowerScreenName = record.lowerScreenName
    const nodes = record.nodes
    
    console.log(`Found ${nodes.length} duplicates for screenName: ${lowerScreenName}`)
    
    // Score each node based on data completeness and user type
    const scoredNodes = nodes.map((node: any) => {
      let score = 0
      
      // Handle both neo4j node format (with .properties) and plain object
      const props = node.properties || node
      
      // User type priority bonus (protocols get priority)
      if (props.vibe === 'organization' && props.orgType === 'protocol') {
        score += 10 // High priority for protocols
      } else if (props.vibe === 'organization') {
        score += 5 // Medium priority for other organizations
      } else {
        score += 0 // Regular users get no bonus
      }
      
      // Basic fields (1 point each)
      if (props.name && props.name !== '') score += 1
      if (props.description && props.description !== '') score += 1
      if (props.profileImageUrl && props.profileImageUrl !== '') score += 1
      if (props.location && props.location !== '') score += 1
      if (props.url && props.url !== '' && props.url !== '[]') score += 1
      
      // Protocol-specific fields (2 points each - more important)
      if (props.tvl && props.tvl > 0) score += 2
      if (props.gecko_id && props.gecko_id !== '' && props.gecko_id !== '-') score += 2
      if (props.cmcId && props.cmcId !== '' && props.cmcId !== '-') score += 2
      if (props.token && props.token !== '' && props.token !== '-') score += 2
      
      // Array fields (3 points each - most important for protocols)
      const arrayFields = [
        'llama_id', 'contract_address', 'about_array', 'chains', 
        'llama_slug', 'audit_links', 'github', 'governance_forum', 'recent_developments'
      ]
      
      for (const field of arrayFields) {
        if (props[field] && props[field] !== '' && props[field] !== '[]') {
          try {
            const parsed = JSON.parse(props[field])
            if (Array.isArray(parsed) && parsed.length > 0) {
              score += 3
            }
          } catch (e) {
            // If it's not JSON but has content, still give some points
            if (props[field].length > 2) score += 1
          }
        }
      }
      
      // Social media fields (1 point each)
      if (props.followersCount && props.followersCount > 0) score += 1
      if (props.followingCount && props.followingCount > 0) score += 1
      
      // Recency bonus (prefer more recently updated)
      if (props.lastUpdated) {
        const lastUpdate = new Date(props.lastUpdated)
        const now = new Date()
        const daysSinceUpdate = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        
        // Bonus points for recent updates (max 2 points)
        if (daysSinceUpdate < 1) score += 2
        else if (daysSinceUpdate < 7) score += 1
        else if (daysSinceUpdate < 30) score += 0.5
      }
      
      // Generate a unique identifier for deletion - prefer userId, fallback to screenName
      const identifier = props.userId || props.screenName
      
      return {
        node,
        score,
        identifier,
        userId: props.userId,
        screenName: props.screenName,
        name: props.name || 'Unknown',
        userType: `${props.vibe || 'user'}${props.orgType ? ':' + props.orgType : ''}`,
        lastUpdated: props.lastUpdated || 'Unknown'
      }
    }).sort((a: any, b: any) => b.score - a.score) // Sort by score descending
    
    // Keep the highest scoring node, remove the rest
    const nodeToKeep = scoredNodes[0]
    const nodesToRemove = scoredNodes.slice(1)
    
    console.log(`Keeping node ${nodeToKeep.identifier} (score: ${nodeToKeep.score}) for screenName: ${lowerScreenName}`)
    
    const removedNodeIds: string[] = []
    
    for (const nodeInfo of nodesToRemove) {
      try {
        // Delete by userId if available, otherwise by screenName with additional safety
        if (nodeInfo.userId) {
          await runQuery(`
            MATCH (p:User {userId: $userId}) 
            DETACH DELETE p
          `, { userId: nodeInfo.userId })
          removedNodeIds.push(nodeInfo.userId)
        } else {
          // Fallback deletion by screenName and name for nodes without userId
          await runQuery(`
            MATCH (p:User {screenName: $screenName, name: $name})
            WHERE p.userId IS NULL
            WITH p LIMIT 1
            DETACH DELETE p
          `, { 
            screenName: nodeInfo.screenName, 
            name: nodeInfo.name 
          })
          removedNodeIds.push(`${nodeInfo.screenName}_${nodeInfo.name}`)
        }
        
        duplicatesRemoved++
        console.log(`✅ Removed duplicate: ${nodeInfo.name} (${nodeInfo.userType}) - Score: ${nodeInfo.score}, ID: ${nodeInfo.identifier}`)
      } catch (error) {
        console.error(`Failed to remove duplicate ${nodeInfo.identifier}:`, error)
      }
    }
    
    details.push({
      screenName: lowerScreenName,
      duplicatesCount: nodes.length,
      removedNodes: removedNodeIds,
      keptNode: nodeToKeep.identifier
    })
  }
  
  console.log(`Cleanup complete: ${duplicatesRemoved} duplicates removed from ${duplicates.length} screenName conflicts`)
  
  return {
    duplicatesFound: duplicates.length,
    duplicatesRemoved,
    details
  }
}

/**
 * Validate screenName uniqueness across the database
 */
export async function validateScreenNameUniqueness(): Promise<{
  isUnique: boolean
  duplicates: Array<{
    screenName: string
    count: number
    userIds: string[]
  }>
}> {
  console.log('Validating screenName uniqueness...')
  
  const query = `
    MATCH (u:User)
    WHERE u.screenName IS NOT NULL AND u.screenName <> ''
    WITH toLower(u.screenName) as lowerScreenName, collect({userId: u.userId, screenName: u.screenName}) as users
    WHERE size(users) > 1
    RETURN lowerScreenName as screenName, size(users) as count, users
    ORDER BY count DESC, lowerScreenName
  `
  
  const results = await runBatchQuery(query, {})
  
  const duplicates = results.map(record => ({
    screenName: record.screenName,
    count: Number(record.count),
    userIds: record.users.map((u: any) => u.userId)
  }))
  
  const isUnique = duplicates.length === 0
  
  if (!isUnique) {
    console.log(`Found ${duplicates.length} screenNames with duplicates:`)
    duplicates.forEach(dup => {
      console.log(`  ${dup.screenName}: ${dup.count} duplicates (${dup.userIds.join(', ')})`)
    })
  } else {
    console.log('All screenNames are unique ✓')
  }
  
  return { isUnique, duplicates }
}

/**
 * Deduplicate array fields in existing protocol nodes
 */
export async function deduplicateProtocolArrays(): Promise<{
  protocolsUpdated: number
}> {
  console.log('Deduplicating array fields in existing protocols...')
  
  // Get all protocol nodes with array fields
  const query = `
    MATCH (p:User {vibe: 'organization', orgType: 'protocol'})
    WHERE p.contract_address IS NOT NULL OR p.chains IS NOT NULL OR p.about_array IS NOT NULL
    RETURN p.userId as userId, p.contract_address as contract_address, p.chains as chains, 
           p.about_array as about_array, p.llama_slug as llama_slug,
           p.audit_links as audit_links, p.github as github,
           p.governance_forum as governance_forum
  `
  
  const protocols = await runBatchQuery(query, {})
  let protocolsUpdated = 0
  
  for (const protocol of protocols) {
    let needsUpdate = false
    const updates: any = {}
    
    // Helper function to deduplicate JSON array
    const deduplicateArray = (jsonStr: string): string => {
      if (!jsonStr || jsonStr === '[]' || jsonStr === '') return jsonStr
      
      // If it doesn't start with '[', it's not a JSON array, so return as is
      if (!jsonStr.startsWith('[')) {
        return jsonStr
      }
      
      try {
        const arr = JSON.parse(jsonStr)
        if (Array.isArray(arr)) {
          const unique = Array.from(new Set(arr))
          return JSON.stringify(unique)
        }
      } catch (e) {
        // If parsing fails, return the original string
        return jsonStr
      }
      return jsonStr
    }
    
    // Check each array field
    const arrayFields = [
      'contract_address', 'chains', 'about_array', 
      'llama_slug', 'audit_links', 'github', 'governance_forum'
    ]
    
    for (const field of arrayFields) {
      const original = protocol[field]
      if (original) {
        const deduplicated = deduplicateArray(original)
        if (original !== deduplicated) {
          updates[field] = deduplicated
          needsUpdate = true
        }
      }
    }
    
    // Update the protocol if needed
    if (needsUpdate) {
      const updateQuery = `
        MATCH (p:User {userId: $userId})
        SET ${Object.keys(updates).map(key => `p.${key} = $${key}`).join(', ')}
      `
      await runQuery(updateQuery, { userId: protocol.userId, ...updates })
      protocolsUpdated++
      console.log(`Deduplicated arrays for protocol: ${protocol.userId}`)
    }
  }
  
  console.log(`Array deduplication complete: ${protocolsUpdated} protocols updated`)
  return { protocolsUpdated }
}
