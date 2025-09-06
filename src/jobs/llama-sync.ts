import { 
  fetchLlamaProtocols, 
  groupProtocolsByParent,
  GroupedProtocol
} from '@/lib/llama-api'
import {
  transformProtocolToNeo4j,
  findProtocolsByScreenName,
  createOrUpdateProtocolsOptimized,
  getProtocolStats,
  cleanupDuplicateProtocols,
  validateScreenNameUniqueness,
  deduplicateProtocolArrays,
  type Neo4jProtocol
  // calculateTvl, // Temporarily disabled due to BigInt conversion issues
} from '@/services'
import { analyzeCategoryMapping, logCategoryAnalytics, type CategoryAnalytics } from '@/services/llama-sync-analytics'

export interface SyncStats {
  startTime: string
  endTime?: string
  totalProtocols: number
  groupedProtocols: number
  protocolsWithTwitter: number
  existingMatches: number
  newProtocols: number
  updatedProtocols: number
  neo4jUpserts: number
  duplicatesFound: number
  duplicatesRemoved: number
  cleanupDetails: Array<{
    screenName: string
    duplicatesCount: number
    removedNodes: string[]
    keptNode: string
  }>
  arrayDeduplicationsCount: number
  finalUniquenessValidation: {
    isUnique: boolean
    remainingDuplicates: number
  }
  // ✅ Add mapping analytics
  categoryAnalytics: CategoryAnalytics
  performanceMetrics: {
    mappingTimeMs: number
    totalSyncTimeMs: number
    protocolsPerSecond: number
  }
  errors: string[]
  duration?: number
}

/**
 * Clean recent_developments data by removing timestamps and handling various formats
 */
function cleanRecentDevelopments(recentDevelopments: any): string[] {
  if (!recentDevelopments) return []
  
  try {
    let parsed = recentDevelopments
    
    // Handle string format - parse JSON first
    if (typeof recentDevelopments === 'string') {
      parsed = JSON.parse(recentDevelopments)
    }
    
    // Handle array format
    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        // Format 1: [timestamp, description] arrays - extract description
        if (Array.isArray(item) && item.length >= 2 && typeof item[0] === 'number') {
          return item[1]
        }
        // Format 2: Direct string descriptions
        if (typeof item === 'string') {
          return item
        }
        // Fallback
        return String(item)
      }).filter(item => typeof item === 'string' && item.trim() !== '')
    }
    
    return []
  } catch (error) {
    console.warn('Error cleaning recent_developments:', error, 'Data:', recentDevelopments)
    return []
  }
}

/**
 * Match protocols with existing Neo4j nodes by Twitter screen name
 */
async function matchProtocolsWithExisting(
  groupedProtocols: GroupedProtocol[]
): Promise<{ 
  toUpdate: Array<{ protocol: GroupedProtocol, existingUserId: string, existingTvl?: number, lastUpdated?: string }>,
  toCreate: GroupedProtocol[]
  stats: { protocolsWithTwitter: number, existingMatches: number }
}> {
  console.log('Matching protocols with existing Neo4j nodes...')
  
  // Extract protocols with Twitter screen names
  const protocolsWithTwitter: Array<{ protocol: GroupedProtocol, screenName: string }> = []
  
  for (const protocol of groupedProtocols) {
    if (protocol.screenName) {
      protocolsWithTwitter.push({ protocol, screenName: protocol.screenName })
    }
  }
  
  console.log(`Found ${protocolsWithTwitter.length} protocols with Twitter handles`)
  
  // Extract screen names for lookup
  const screenNames = protocolsWithTwitter.map(p => p.screenName)
  
  // Find existing users by screen names
  const existingUsers = await findProtocolsByScreenName(screenNames)
  console.log(`Found ${existingUsers.length} existing matches in Neo4j`)
  
  // Create lookup map for existing users
  const existingUserMap = new Map<string, { userId: string, tvl?: number, lastUpdated?: string }>()
  for (const user of existingUsers) {
    existingUserMap.set(user.screenName.toLowerCase(), {
      userId: user.userId,
      tvl: user.tvl,
      lastUpdated: user.lastUpdated
    })
  }
  
  // Separate protocols into update vs create
  const toUpdate: Array<{ protocol: GroupedProtocol, existingUserId: string, existingTvl?: number, lastUpdated?: string }> = []
  const toCreate: GroupedProtocol[] = []
  
  // Process protocols with Twitter
  for (const { protocol, screenName } of protocolsWithTwitter) {
    const existingUser = existingUserMap.get(screenName.toLowerCase())
    if (existingUser) {
      toUpdate.push({ 
        protocol, 
        existingUserId: existingUser.userId,
        existingTvl: existingUser.tvl,
        lastUpdated: existingUser.lastUpdated
      })
    } else {
      toCreate.push(protocol)
    }
  }
  
  // Add protocols without Twitter to create list
  const protocolsWithoutTwitter = groupedProtocols.filter(p => !p.screenName)
  toCreate.push(...protocolsWithoutTwitter)
  
  console.log(`Protocols to update: ${toUpdate.length}, to create: ${toCreate.length}`)
  
  return {
    toUpdate,
    toCreate,
    stats: {
      protocolsWithTwitter: protocolsWithTwitter.length,
      existingMatches: toUpdate.length
    }
  }
}

/**
 * Main sync function
 */
export async function syncLlamaProtocols(): Promise<SyncStats> {
  const startTime = Date.now()
  const stats: SyncStats = {
    startTime: new Date().toISOString(),
    totalProtocols: 0,
    groupedProtocols: 0,
    protocolsWithTwitter: 0,
    existingMatches: 0,
    newProtocols: 0,
    updatedProtocols: 0,
    neo4jUpserts: 0,
    duplicatesFound: 0,
    duplicatesRemoved: 0,
    cleanupDetails: [],
    arrayDeduplicationsCount: 0,
    finalUniquenessValidation: {
      isUnique: false,
      remainingDuplicates: 0
    },
    categoryAnalytics: {} as CategoryAnalytics,
    performanceMetrics: {
      mappingTimeMs: 0,
      totalSyncTimeMs: 0,
      protocolsPerSecond: 0
    },
    errors: []
  }
  
  console.log('=== STARTING LLAMA PROTOCOL SYNC ===')
  
  try {
    // Step 1: Fetch all protocols from Llama API
    console.log('Step 1: Fetching protocols from Llama API...')
    const protocols = await fetchLlamaProtocols()
    stats.totalProtocols = protocols.length
    console.log(`Fetched ${protocols.length} protocols`)
    
    // Step 2: Group protocols by parent
    console.log('Step 2: Grouping protocols by parent...')
    const groupedProtocols = groupProtocolsByParent(protocols)
    stats.groupedProtocols = groupedProtocols.length
    console.log(`Grouped into ${groupedProtocols.length} protocols`)
    
    // Step 2.5: OPTIMIZED category analysis
    console.log('Step 2.5: Analyzing category mapping (optimized)...')
    const mappingStart = Date.now()
    
    stats.categoryAnalytics = analyzeCategoryMapping(groupedProtocols)
    logCategoryAnalytics(stats.categoryAnalytics)
    
    const mappingTime = Date.now() - mappingStart
    stats.performanceMetrics.mappingTimeMs = mappingTime
    console.log(`Category mapping analysis completed in ${mappingTime}ms`)
    
    // Step 3: Match with existing Neo4j nodes
    console.log('Step 3: Matching with existing Neo4j nodes...')
    const { toUpdate, toCreate, stats: matchStats } = await matchProtocolsWithExisting(groupedProtocols)
    stats.protocolsWithTwitter = matchStats.protocolsWithTwitter
    stats.existingMatches = matchStats.existingMatches
    stats.newProtocols = toCreate.length
    stats.updatedProtocols = toUpdate.length
    
    // Step 4: Transform all protocols to Neo4j format
    console.log('Step 4: Transforming to Neo4j format...')
    const allProtocols: Neo4jProtocol[] = []
    
    // Transform protocols to create
    for (const protocol of toCreate) {
      const neo4jProtocol = transformProtocolToNeo4j(protocol)
      
      // Clean recent_developments data
      if (neo4jProtocol.recent_developments) {
        const cleanedData = cleanRecentDevelopments(neo4jProtocol.recent_developments)
        neo4jProtocol.recent_developments = JSON.stringify(cleanedData)
      }
      
      // TODO: Remove tvl temporarily to avoid BigInt issues
      neo4jProtocol.tvl = undefined
      
      allProtocols.push(neo4jProtocol)
    }
    
    // Transform protocols to update (with TVL calculation)
    for (const { protocol, existingUserId, existingTvl, lastUpdated } of toUpdate) {
      const neo4jProtocol = transformProtocolToNeo4j(protocol)
      
      // Use existing userId to update the same node
      neo4jProtocol.protocolId = existingUserId
      
      // Clean recent_developments data
      if (neo4jProtocol.recent_developments) {
        const cleanedData = cleanRecentDevelopments(neo4jProtocol.recent_developments)
        neo4jProtocol.recent_developments = JSON.stringify(cleanedData)
      }
      
      // TODO: TVL calculation temporarily disabled due to BigInt conversion issues
      // Calculate TVL based on date logic - ensure no BigInt values
      // if (neo4jProtocol.tvl !== undefined) {
      //   const currentTvl = typeof neo4jProtocol.tvl === 'bigint' ? Number(neo4jProtocol.tvl) : neo4jProtocol.tvl
      //   neo4jProtocol.tvl = calculateTvl(currentTvl, existingTvl, lastUpdated)
      // }
      
      // Remove tvl to avoid BigInt issues for now
      neo4jProtocol.tvl = undefined
      
      allProtocols.push(neo4jProtocol)
    }
    
    // Step 4.5: Deduplicate protocols by screenName (keep the first one for each screenName)
    console.log('Step 4.5: Deduplicating protocols by screenName...')
    const deduplicatedProtocols: Neo4jProtocol[] = []
    const seenScreenNames = new Set<string>()
    
    for (const protocol of allProtocols) {
      if (protocol.screenName && protocol.screenName !== '') {
        const lowerScreenName = protocol.screenName.toLowerCase()
        if (!seenScreenNames.has(lowerScreenName)) {
          seenScreenNames.add(lowerScreenName)
          deduplicatedProtocols.push(protocol)
        } else {
          console.log(`Skipping duplicate protocol with screenName: ${protocol.screenName}`)
        }
      } else {
        // Always include protocols without screenName
        deduplicatedProtocols.push(protocol)
      }
    }
    
    console.log(`Deduplicated: ${allProtocols.length} -> ${deduplicatedProtocols.length} protocols`)
    
    // Step 5: Upsert to Neo4j
    console.log('Step 5: Upserting to Neo4j...')
    const upsertResult = await createOrUpdateProtocolsOptimized(deduplicatedProtocols)
    stats.neo4jUpserts = upsertResult.processed
    stats.errors.push(...upsertResult.errors)
    
    // Step 6: Enhanced cleanup of duplicate protocols with detailed scoring
    console.log('Step 6: Enhanced cleanup of duplicate protocols...')
    const cleanupResult = await cleanupDuplicateProtocols()
    stats.duplicatesFound = cleanupResult.duplicatesFound
    stats.duplicatesRemoved = cleanupResult.duplicatesRemoved
    stats.cleanupDetails = cleanupResult.details
    
    // Log detailed cleanup results
    if (cleanupResult.details.length > 0) {
      console.log('Detailed cleanup results:')
      cleanupResult.details.forEach(detail => {
        console.log(`  ${detail.screenName}: kept ${detail.keptNode}, removed ${detail.removedNodes.length} duplicates`)
      })
    }
    
    // Step 6.5: Deduplicate array fields in existing protocols
    console.log('Step 6.5: Deduplicating array fields...')
    const dedupeResult = await deduplicateProtocolArrays()
    stats.arrayDeduplicationsCount = dedupeResult.protocolsUpdated
    
    // Step 7: Final validation of screenName uniqueness
    console.log('Step 7: Validating screenName uniqueness...')
    const validationResult = await validateScreenNameUniqueness()
    stats.finalUniquenessValidation = {
      isUnique: validationResult.isUnique,
      remainingDuplicates: validationResult.duplicates.length
    }
    
    if (!validationResult.isUnique) {
      console.warn(`⚠️  WARNING: ${validationResult.duplicates.length} screenNames still have duplicates after cleanup:`)
      validationResult.duplicates.forEach(dup => {
        console.warn(`    ${dup.screenName}: ${dup.count} nodes`)
        stats.errors.push(`Remaining duplicates for ${dup.screenName}: ${dup.count} nodes`)
      })
    } else {
      console.log('✅ All screenNames are now unique!')
    }
    
    // Step 8: Get final stats
    const finalStats = await getProtocolStats()
    
    stats.endTime = new Date().toISOString()
    const startTime = new Date(stats.startTime).getTime()
    const endTime = new Date(stats.endTime).getTime()
    stats.duration = endTime - startTime
    
    // Final performance metrics
    const totalTime = Date.now() - startTime
    stats.performanceMetrics.totalSyncTimeMs = totalTime
    stats.performanceMetrics.protocolsPerSecond = Math.round(groupedProtocols.length / (totalTime / 1000))
    
    console.log('=== LLAMA PROTOCOL SYNC COMPLETE ===')
    console.log(`⚡ Performance: Processed ${groupedProtocols.length} protocols in ${totalTime}ms (${stats.performanceMetrics.protocolsPerSecond}/sec)`)
    console.log(`Duration: ${Math.round(stats.duration / 1000)}s`)
    console.log(`Protocols processed: ${stats.neo4jUpserts}/${stats.groupedProtocols}`)
    console.log(`New: ${stats.newProtocols}, Updated: ${stats.updatedProtocols}`)
    console.log(`Duplicates found: ${stats.duplicatesFound}, removed: ${stats.duplicatesRemoved}`)
    console.log(`Array deduplications: ${stats.arrayDeduplicationsCount} protocols`)
    console.log(`Final uniqueness: ${stats.finalUniquenessValidation.isUnique ? 'PASS' : 'FAIL'}`)
    console.log(`Total protocols in database: ${finalStats.total}`)
    console.log(`Errors: ${stats.errors.length}`)
    
    if (stats.errors.length > 0) {
      console.error('Errors encountered:', stats.errors)
    }
    
    return stats
    
  } catch (error) {
    const errorMsg = `Critical error in Llama sync: ${error}`
    console.error(errorMsg)
    stats.errors.push(errorMsg)
    stats.endTime = new Date().toISOString()
    return stats
  }
}

/**
 * Manual trigger function for testing and API endpoints
 */
export async function triggerManualSync(): Promise<SyncStats> {
  console.log('Manual sync triggered')
  return await syncLlamaProtocols()
}
