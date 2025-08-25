import { runQuery, runBatchQuery } from '@/lib/neo4j'
import { GroupedProtocol } from '@/lib/llama-api'
import { VibeType } from '@/lib/validation'

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
  org_type: string         // Always 'protocol'
  org_subtype: string[]    // Array of categories
  web3_focus: string       // Always 'native'
  operational_status: string // Always 'mainnet'
  
  // Financial data
  tvl?: number             // Calculated based on date logic
  gecko_id?: string       // Single value from first protocol
  cmcId?: string          // Single value from first protocol
  token_symbol?: string   // Single value from first protocol
  
  // Arrays stored as JSON strings in Neo4j
  llama_id: string              // JSON array of protocol IDs
  contract_address: string      // JSON array of contract addresses
  about_array: string           // JSON array of descriptions
  supported_chains: string      // JSON array of supported chains
  llama_slug: string            // JSON array of protocol slugs
  audit_report_url: string      // JSON array of audit links
  github_url: string            // JSON array of github URLs
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
    org_type: 'protocol',
    org_subtype: groupedProtocol.org_subType || [], // Array of categories
    web3_focus: 'native',
    operational_status: 'mainnet',
    
    // Financial data - safe number conversion
    tvl: groupedProtocol.totalTvl || undefined,
    gecko_id: shouldStore(groupedProtocol.gecko_id) ? groupedProtocol.gecko_id : undefined,
    cmcId: shouldStore(groupedProtocol.cmcId) ? groupedProtocol.cmcId : undefined,
    token_symbol: shouldStore(groupedProtocol.token_symbol) ? groupedProtocol.token_symbol : undefined,
    
    // Arrays as JSON strings
    llama_id: JSON.stringify(groupedProtocol.llama_id),
    contract_address: JSON.stringify(groupedProtocol.contract_address),
    about_array: JSON.stringify(groupedProtocol.about),
    supported_chains: JSON.stringify(groupedProtocol.supported_chains),
    llama_slug: JSON.stringify(groupedProtocol.llama_slug),
    audit_report_url: JSON.stringify(groupedProtocol.audit_report_url),
    github_url: JSON.stringify(groupedProtocol.github_url),
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
    MATCH (p:User {vibe: 'organization', org_type: 'protocol'})
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
 * Calculate TVL based on date logic:
 * - If existing data is less than 1 day old, add new TVL to existing
 * - If existing data is more than 1 day old, overwrite with new TVL
 */
export function calculateTvl(
  newTvl: number | bigint,
  existingTvl?: number,
  lastUpdated?: string
): number {
  // Convert BigInt to number if needed
  const numericNewTvl = Number(newTvl || 0)
  
  if (!existingTvl || !lastUpdated) {
    return numericNewTvl
  }
  
  const lastUpdateDate = new Date(lastUpdated)
  const now = new Date()
  const daysDiff = (now.getTime() - lastUpdateDate.getTime()) / (1000 * 60 * 60 * 24)
  
  if (daysDiff < 1) {
    // Data is less than 1 day old, add to existing TVL
    return existingTvl + numericNewTvl
  } else {
    // Data is more than 1 day old, overwrite with new TVL
    return numericNewTvl
  }
}

/**
 * Map Llama category to our org_subtype values (no longer needed but keeping for compatibility)
 */
function mapCategoryToSubtype(category?: string): string {
  if (!category) return ''
  
  const categoryLower = category.toLowerCase()
  
  // Map common DeFi categories
  const categoryMap: Record<string, string> = {
    'dexes': 'defi',
    'lending': 'defi',
    'yield': 'defi',
    'derivatives': 'defi',
    'payments': 'defi',
    'assets': 'defi',
    'staking': 'defi',
    'indexes': 'defi',
    'synthetics': 'defi',
    'options': 'defi',
    'insurance': 'defi',
    'cross chain': 'infrastructure',
    'bridge': 'infrastructure',
    'gaming': 'gaming',
    'nft': 'nft',
    'social': 'social',
    'metaverse': 'gaming',
    'dao': 'dao',
    'governance': 'dao'
  }
  
  return categoryMap[categoryLower] || 'defi' // Default to defi for unknown categories
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
    MATCH (p:User {userId: protocolId, vibe: 'organization', org_type: 'protocol'})
    RETURN p.userId as existingProtocolId
  `
  
  const results = await runBatchQuery(query, { protocolIds })
  return results.map(record => record.existingProtocolId)
}

/**
 * Create or update a single protocol in Neo4j
 */
export async function createOrUpdateProtocol(protocol: Neo4jProtocol): Promise<void> {
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
      p.org_type = $org_type,
      p.org_subtype = $org_subtype,
      p.web3_focus = $web3_focus,
      p.operational_status = $operational_status,
      p.tvl = $tvl,
      p.gecko_id = $gecko_id,
      p.cmcId = $cmcId,
      p.token_symbol = $token_symbol,
      p.llama_id = $llama_id,
      p.contract_address = $contract_address,
      p.about_array = $about_array,
      p.supported_chains = $supported_chains,
      p.llama_slug = $llama_slug,
      p.audit_report_url = $audit_report_url,
      p.github_url = $github_url,
      p.governance_forum = $governance_forum,
      p.recent_developments = $recent_developments
    RETURN p.userId as protocolId
  `
  
  const params = {
    protocolId: protocol.protocolId,
    screenName: protocol.screenName || '',
    name: protocol.name,
    profileImageUrl: protocol.profileImageUrl || '',
    about: protocol.about || '',
    location: protocol.location || '',
    url: JSON.stringify(protocol.url),
    verified: protocol.verified,
    lastUpdated: protocol.lastUpdated,
    vibe: protocol.vibe,
    org_type: protocol.org_type,
    org_subtype: JSON.stringify(protocol.org_subtype),
    web3_focus: protocol.web3_focus,
    operational_status: protocol.operational_status,
    tvl: protocol.tvl || null,
    gecko_id: protocol.gecko_id || '',
    cmcId: protocol.cmcId || '',
    token_symbol: protocol.token_symbol || '',
    llama_id: protocol.llama_id,
    contract_address: protocol.contract_address,
    about_array: protocol.about_array,
    supported_chains: protocol.supported_chains,
    llama_slug: protocol.llama_slug,
    audit_report_url: protocol.audit_report_url,
    github_url: protocol.github_url,
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
          OPTIONAL MATCH (existing:User {vibe: 'organization', org_type: 'protocol'})
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
          p.org_type = protocolData.org_type,
          p.org_subtype = protocolData.org_subtype,
          p.web3_focus = protocolData.web3_focus,
          p.operational_status = protocolData.operational_status,
          
          // Protocol-specific fields - only update if not null/empty
          p.tvl = CASE WHEN protocolData.tvl IS NOT NULL THEN protocolData.tvl ELSE p.tvl END,
          p.gecko_id = CASE WHEN protocolData.gecko_id IS NOT NULL AND protocolData.gecko_id <> '' AND protocolData.gecko_id <> '-' THEN protocolData.gecko_id ELSE COALESCE(p.gecko_id, '') END,
          p.cmcId = CASE WHEN protocolData.cmcId IS NOT NULL AND protocolData.cmcId <> '' AND protocolData.cmcId <> '-' THEN protocolData.cmcId ELSE COALESCE(p.cmcId, '') END,
          p.token_symbol = CASE WHEN protocolData.token_symbol IS NOT NULL AND protocolData.token_symbol <> '' AND protocolData.token_symbol <> '-' THEN protocolData.token_symbol ELSE COALESCE(p.token_symbol, '') END,
          
          // Array fields - always update these
          p.llama_id = protocolData.llama_id,
          p.contract_address = protocolData.contract_address,
          p.about_array = protocolData.about_array,
          p.supported_chains = protocolData.supported_chains,
          p.llama_slug = protocolData.llama_slug,
          p.audit_report_url = protocolData.audit_report_url,
          p.github_url = protocolData.github_url,
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
    MATCH (p:User {vibe: 'organization', org_type: 'protocol'})
    RETURN 
      count(p) as total,
      p.org_subtype as subtype,
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
 * Clean up duplicate protocols with the same screenName
 * Keep the most recently updated one
 */
export async function cleanupDuplicateProtocols(): Promise<{
  duplicatesFound: number
  duplicatesRemoved: number
}> {
  console.log('Cleaning up duplicate protocols...')
  
  // Find duplicate screenNames
  const findDuplicatesQuery = `
    MATCH (p:User {vibe: 'organization', org_type: 'protocol'})
    WHERE p.screenName IS NOT NULL AND p.screenName <> ''
    WITH p.screenName as screenName, collect(p) as nodes
    WHERE size(nodes) > 1
    RETURN screenName, nodes
  `
  
  const duplicates = await runBatchQuery(findDuplicatesQuery, {})
  let duplicatesRemoved = 0
  
  for (const record of duplicates) {
    const screenName = record.screenName
    const nodes = record.nodes
    
    console.log(`Found ${nodes.length} duplicates for screenName: ${screenName}`)
    
    // Sort by lastUpdated (keep the most recent)
    const sortedNodes = nodes.sort((a: any, b: any) => {
      const aDate = new Date(a.lastUpdated || 0)
      const bDate = new Date(b.lastUpdated || 0)
      return bDate.getTime() - aDate.getTime()
    })
    
    // Remove all but the first (most recent)
    const nodesToRemove = sortedNodes.slice(1)
    
    for (const node of nodesToRemove) {
      await runQuery(`MATCH (p:User {userId: $userId}) DELETE p`, { userId: node.userId })
      duplicatesRemoved++
      console.log(`Removed duplicate protocol: ${node.name} (${node.userId})`)
    }
  }
  
  console.log(`Cleanup complete: ${duplicatesRemoved} duplicates removed`)
  return {
    duplicatesFound: duplicates.length,
    duplicatesRemoved
  }
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
    MATCH (p:User {vibe: 'organization', org_type: 'protocol'})
    WHERE p.contract_address IS NOT NULL OR p.supported_chains IS NOT NULL OR p.about_array IS NOT NULL
    RETURN p.userId as userId, p.contract_address as contract_address, p.supported_chains as supported_chains, 
           p.about_array as about_array, p.llama_slug as llama_slug,
           p.audit_report_url as audit_report_url, p.github_url as github_url,
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
      'contract_address', 'supported_chains', 'about_array', 
      'llama_slug', 'audit_report_url', 'github_url', 'governance_forum'
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
