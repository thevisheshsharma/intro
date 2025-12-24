import { runQuery, runBatchQuery } from '@/lib/neo4j'
import { validateVibe, logValidationError } from '@/lib/validation'
import { fetchUserFromSocialAPI } from '@/lib/socialapi-pagination'

// Optimal batch sizes for different operations (performance optimized)
const OPTIMAL_BATCH_SIZES = {
  USER_UPSERT: 150,          // Larger batches for better throughput
  RELATIONSHIP_BATCH: 500,   // Large batches for relationships
  LOOKUP_BATCH: 300,         // Large batches for existence checks
  EXTERNAL_API: 100,         // Batch external API calls
  PARALLEL_BATCHES: 6        // Number of batches to run in parallel (increased from 4)
} as const

export interface Neo4jUser {
  userId: string
  screenName: string
  name: string
  profileImageUrl?: string
  description?: string
  location?: string
  url?: string
  followersCount: number
  followingCount: number
  verified: boolean
  lastUpdated: string
  // Missing fields that SocialAPI provides but we're not storing:
  createdAt?: string           // created_at - Account creation date
  listedCount?: number         // listed_count - Number of lists user is in
  statusesCount?: number       // statuses_count - Number of tweets
  favouritesCount?: number     // favourites_count - Number of likes
  protected?: boolean          // protected - Whether account is private
  canDm?: boolean             // can_dm - Whether user can receive DMs
  profileBannerUrl?: string    // profile_banner_url - Banner image URL
  verificationType?: string    // verification_info.type - Business/Personal
  verificationReason?: string  // verification_info.reason - Verification reason
  vibe?: string               // Primary entity classification: 'individual', 'organization', 'spam'
  department?: string         // current department/role from flattened employment data
  // Organization classification fields (can be null for individuals/spam accounts)
  org_type?: string           // Organization type: protocol, infrastructure, exchange, investment, service, community, nft
  org_subtype?: string        // Organization subtype: defi, gaming, vc, etc.
  web3_focus?: string         // Web3 focus: native, adjacent, traditional
}

// Types for enhanced mutual finding with organizational relationships
export type OrgRelationType = 'WORKS_AT' | 'WORKED_AT' | 'INVESTED_IN' | 'AUDITS' | 'AFFILIATED_WITH' | 'PARTNERS_WITH' | 'MEMBER_OF'

// Connection types for the new 9-query system
export type ConnectionType = 'direct' | 'org_direct' | 'org_indirect' | 'shared_third_party' | 'chain_affinity'

// Path node in a connection chain
export interface PathNode {
  userId: string
  screenName: string
  name: string
  role: 'you' | 'introducer' | 'intermediary' | 'organization' | 'third_party' | 'prospect'
  relationship?: string
}

// Connection path for A-based (direct) connections
export interface ConnectionPath {
  type: ConnectionType
  chain: PathNode[]
  strength: number
  sharedChains?: string[] // For chain affinity connections
}

// Enhanced mutual connection with new connection type
export interface EnhancedMutualConnection extends Neo4jUser {
  connectionType: ConnectionType
  relevancyScore: number
  scoreBreakdown?: {
    base: number
    relationshipMultiplier: number
    accountQuality: number
    bonuses: number
    freshnessDecay: number
  }
  orgConnections?: OrgConnection[] // For org-related connections
  sharedOrg?: { userId: string; screenName: string; name: string } // For org direct/indirect
  intermediary?: { userId: string; screenName: string; name: string } // For org indirect
  thirdParty?: { userId: string; screenName: string; name: string } // For shared third party
  sharedChains?: string[] // For chain affinity
  isReciprocal?: boolean // C↔B mutual follow (C follows B AND B follows C)
  // NEW: Aggregated fields for multi-connection users
  connectionTypes?: ConnectionType[] // All connection types this user has
  allOrgConnections?: OrgConnection[] // All org connections across all types
  allSharedOrgs?: Array<{ userId: string; screenName: string; name: string }> // All shared orgs
  allIntermediaries?: Array<{ userId: string; screenName: string; name: string }> // All intermediaries
  allThirdParties?: Array<{ userId: string; screenName: string; name: string }> // All third parties
  allSharedChains?: string[] // All shared chains
}

export interface OrgConnection {
  orgUserId: string
  orgScreenName: string
  orgName: string
  userRelationType: OrgRelationType
  prospectRelationType: OrgRelationType
  matchSource: 'prospect_direct' | 'prospect_following'
  viaUser?: string // screenName of prospect's following (someone B follows) through which the connection was found
}

export type MutualType = 'direct' | 'organizational'

export interface MutualConnection extends Neo4jUser {
  mutualType: MutualType
  relevancyScore: number
  orgConnections?: OrgConnection[] // Only present for organizational mutuals
}

export interface FindMutualsResult {
  directMutuals: MutualConnection[]
  orgMutuals: MutualConnection[]
  combined: MutualConnection[] // Sorted by relevancy score
  totalCount: number
  directCount: number
  orgCount: number
}

export interface TwitterApiUser {
  id: string
  id_str: string
  screen_name: string
  name: string
  description?: string
  location?: string
  url?: string
  profile_image_url_https?: string
  followers_count: number
  friends_count: number
  verified: boolean
  // Adding missing fields from SocialAPI response:
  created_at?: string
  listed_count?: number
  statuses_count?: number
  favourites_count?: number
  protected?: boolean
  can_dm?: boolean
  profile_banner_url?: string
  verification_info?: {
    type?: string
    reason?: string
  }
}

// Build query parameters for user upsert operations (reduces code duplication)
function buildUserQueryParams(user: Neo4jUser) {
  return {
    userId: user.userId,
    screenName: user.screenName,
    name: user.name,
    createdAt: user.createdAt || new Date().toISOString(),
    lastUpdated: user.lastUpdated,
    profileImageUrl: user.profileImageUrl || null,
    description: user.description || null,
    location: user.location || null,
    url: user.url || null,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    verified: user.verified,
    listedCount: user.listedCount || 0,
    statusesCount: user.statusesCount || 0,
    favouritesCount: user.favouritesCount || 0,
    protected: user.protected || false,
    canDm: user.canDm || false,
    profileBannerUrl: user.profileBannerUrl || null,
    verificationType: user.verificationType || null,
    verificationReason: user.verificationReason || null,
    vibe: user.vibe || null,
    department: user.department || null,
    org_type: user.org_type || null,
    org_subtype: user.org_subtype || null,
    web3_focus: user.web3_focus || null
  }
}

// Convert Twitter API user to Neo4j format
export function transformToNeo4jUser(apiUser: TwitterApiUser, vibe?: string): Neo4jUser {
  // Validate vibe field if provided
  let sanitizedVibe = ''
  if (vibe !== undefined) {
    const vibeValidation = validateVibe(vibe)
    if (!vibeValidation.isValid) {
      logValidationError('vibe', vibe, vibeValidation.error!, `transformToNeo4jUser for user ${apiUser.id_str || apiUser.id}`)
    }
    sanitizedVibe = vibeValidation.sanitizedValue
  }

  return {
    userId: apiUser.id_str || apiUser.id,
    screenName: apiUser.screen_name,
    name: apiUser.name,
    profileImageUrl: apiUser.profile_image_url_https || undefined,
    description: apiUser.description || undefined,
    location: apiUser.location || undefined,
    url: apiUser.url || undefined,
    followersCount: apiUser.followers_count || 0,
    followingCount: apiUser.friends_count || 0,
    verified: Boolean(apiUser.verified),
    lastUpdated: new Date().toISOString(),
    // Map additional fields with defaults
    createdAt: apiUser.created_at || undefined,
    listedCount: apiUser.listed_count || 0,
    statusesCount: apiUser.statuses_count || 0,
    favouritesCount: apiUser.favourites_count || 0,
    protected: Boolean(apiUser.protected),
    canDm: Boolean(apiUser.can_dm),
    profileBannerUrl: apiUser.profile_banner_url || undefined,
    verificationType: apiUser.verification_info?.type || undefined,
    verificationReason: apiUser.verification_info?.reason || undefined,
    vibe: sanitizedVibe || undefined,
    department: undefined,       // Initialize department field
    // Organization classification fields - set to undefined by default, updated by classifier
    org_type: undefined,
    org_subtype: undefined,
    web3_focus: undefined
  }
}

// Check if multiple users exist in Neo4j (returns array of existing user IDs)
export async function checkUsersExist(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    RETURN u.userId as existingUserId
  `
  
  const results = await runBatchQuery(query, { userIds })
  return results.map(record => record.existingUserId)
}

// Batch lookup users by screen names (case-insensitive)
export async function getUsersByScreenNames(screenNames: string[]): Promise<Neo4jUser[]> {
  if (screenNames.length === 0) return []
  
  const query = `
    UNWIND $screenNames AS screenName
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(screenName)
    RETURN u, screenName
  `
  
  const results = await runBatchQuery(query, { screenNames })
  return results.map(record => record.u.properties)
}

// Batch lookup users by user IDs
export async function getUsersByUserIds(userIds: string[]): Promise<Neo4jUser[]> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    RETURN u
  `
  
  const results = await runBatchQuery(query, { userIds })
  return results.map(record => record.u.properties)
}

// Batched version of screenName merge for much better performance
export async function createOrUpdateUsersWithScreenNameMergeBatch(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return
  
  console.log(`🚀 Starting batched screenName merge for ${users.length} users...`)
  
  // Step 1: Bulk conflict detection for all users at once
  const conflictCheckQuery = `
    UNWIND $users AS userData
    OPTIONAL MATCH (byScreenName:User)
    WHERE toLower(byScreenName.screenName) = toLower(userData.screenName)
    
    OPTIONAL MATCH (byUserId:User {userId: userData.userId})
    
    RETURN 
      userData.userId as inputUserId,
      userData.screenName as inputScreenName,
      byScreenName.userId as existingByScreenName,
      byScreenName.screenName as existingScreenName,
      byUserId.userId as existingByUserId,
      byUserId.screenName as existingByUserIdScreenName
  `
  
  const conflictResults = await runQuery(conflictCheckQuery, { 
    users: users.map(user => ({ userId: user.userId, screenName: user.screenName }))
  })
  
  // Build conflict maps for efficient lookup
  const conflictMap = new Map<string, {
    existingByScreenName?: string,
    existingByUserId?: string,
    existingScreenName?: string,
    existingByUserIdScreenName?: string
  }>()
  
  conflictResults.forEach(result => {
    conflictMap.set(result.inputUserId, {
      existingByScreenName: result.existingByScreenName,
      existingByUserId: result.existingByUserId,
      existingScreenName: result.existingScreenName,
      existingByUserIdScreenName: result.existingByUserIdScreenName
    })
  })
  
  // Step 2: Categorize users based on conflict analysis
  const usersToUpdate: Array<{user: Neo4jUser, targetUserId: string}> = []
  const usersToCreate: Neo4jUser[] = []
  let conflictErrors = 0
  
  users.forEach(user => {
    const conflicts = conflictMap.get(user.userId)
    
    if (!conflicts) {
      usersToCreate.push(user)
      return
    }
    
    const { existingByScreenName, existingByUserId, existingScreenName, existingByUserIdScreenName } = conflicts
    
    // Handle conflicts according to the same logic as single user merge
    if (existingByScreenName && existingByUserId && existingByScreenName !== existingByUserId) {
      console.log(`⚠️ CONFLICT: User ${user.screenName} (${user.userId}) conflicts with both screenName user ${existingByScreenName} and userId user ${existingByUserId}`)
      conflictErrors++
      return
    }
    
    if (existingByScreenName) {
      // ScreenName conflict: update existing user, store the incoming userId
      console.log(`🔄 ScreenName merge: @${user.screenName} exists as ${existingScreenName}, updating with data from ${user.userId}`)
      usersToUpdate.push({ user, targetUserId: existingByScreenName })
      return
    }
    
    if (existingByUserId) {
      // UserId conflict: create new user with unique screenName
      const newScreenName = `${user.screenName}_${Date.now()}`
      console.log(`🔄 UserId conflict: ${user.userId} exists as @${existingByUserIdScreenName}, creating new user as @${newScreenName}`)
      usersToCreate.push({ ...user, screenName: newScreenName })
      return
    }
    
    // No conflicts
    usersToCreate.push(user)
  })
  
  console.log(`📊 Batch analysis complete:`)
  console.log(`   - Users to create: ${usersToCreate.length}`)
  console.log(`   - Users to update: ${usersToUpdate.length}`)
  console.log(`   - Conflict errors: ${conflictErrors}`)
  
  // Step 3: Execute batch operations with error handling
  const results = []
  
  // Batch create new users
  if (usersToCreate.length > 0) {
    console.log(`🆕 Starting batch creation of ${usersToCreate.length} users...`)
    try {
      await batchCreateUsers(usersToCreate)
      console.log(`✅ Batch creation completed successfully`)
    } catch (error: any) {
      console.error(`❌ Batch creation failed:`, error.message)
      // The individual error handling is already done in batchCreateUsers
    }
  }
  
  // Batch update existing users
  if (usersToUpdate.length > 0) {
    console.log(`🔄 Starting batch update of ${usersToUpdate.length} users...`)
    try {
      await batchUpdateUsers(usersToUpdate)
      console.log(`✅ Batch update completed successfully`)
    } catch (error: any) {
      console.error(`❌ Batch update failed:`, error.message)
      // The individual error handling is already done in batchUpdateUsers
    }
  }
  
  console.log(`✅ Batched screenName merge complete for ${users.length} users`)
}

// Batch create multiple users at once with parallel processing
async function batchCreateUsers(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return

  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(users.length / batchSize)

  console.log(`🆕 Batch creating ${users.length} users in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const createQuery = `
    UNWIND $users AS userData
    MERGE (u:User {userId: userData.userId})
    ON CREATE SET
      u.screenName = userData.screenName,
      u.name = userData.name,
      u.createdAt = userData.createdAt,
      u.lastUpdated = userData.lastUpdated,
      u.profileImageUrl = userData.profileImageUrl,
      u.description = userData.description,
      u.location = userData.location,
      u.url = userData.url,
      u.followersCount = userData.followersCount,
      u.followingCount = userData.followingCount,
      u.verified = userData.verified,
      u.listedCount = userData.listedCount,
      u.statusesCount = userData.statusesCount,
      u.favouritesCount = userData.favouritesCount,
      u.protected = userData.protected,
      u.canDm = userData.canDm,
      u.profileBannerUrl = userData.profileBannerUrl,
      u.verificationType = userData.verificationType,
      u.verificationReason = userData.verificationReason,
      u.vibe = userData.vibe,
      u.department = userData.department,
      u.org_type = userData.org_type,
      u.org_subtype = userData.org_subtype,
      u.web3_focus = userData.web3_focus
    ON MATCH SET
      u.name = userData.name,
      u.lastUpdated = userData.lastUpdated,
      u.profileImageUrl = userData.profileImageUrl,
      u.description = userData.description,
      u.location = userData.location,
      u.url = userData.url,
      u.followersCount = userData.followersCount,
      u.followingCount = userData.followingCount,
      u.verified = userData.verified,
      u.listedCount = userData.listedCount,
      u.statusesCount = userData.statusesCount,
      u.favouritesCount = userData.favouritesCount,
      u.protected = userData.protected,
      u.canDm = userData.canDm,
      u.profileBannerUrl = userData.profileBannerUrl,
      u.verificationType = userData.verificationType,
      u.verificationReason = userData.verificationReason,
      u.vibe = CASE WHEN userData.vibe IS NOT NULL THEN userData.vibe ELSE u.vibe END,
      u.department = CASE WHEN userData.department IS NOT NULL THEN userData.department ELSE u.department END,
      u.org_type = CASE WHEN userData.org_type IS NOT NULL THEN userData.org_type ELSE u.org_type END,
      u.org_subtype = CASE WHEN userData.org_subtype IS NOT NULL THEN userData.org_subtype ELSE u.org_subtype END,
      u.web3_focus = CASE WHEN userData.web3_focus IS NOT NULL THEN userData.web3_focus ELSE u.web3_focus END
    RETURN u.userId as finalUserId
  `

  // Helper to sanitize a batch
  const sanitizeBatch = (batch: Neo4jUser[]) => batch.map(user => ({
    userId: user.userId,
    screenName: user.screenName,
    name: user.name,
    createdAt: user.createdAt || new Date().toISOString(),
    lastUpdated: user.lastUpdated,
    profileImageUrl: user.profileImageUrl || null,
    description: user.description || null,
    location: user.location || null,
    url: user.url || null,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    verified: user.verified,
    listedCount: user.listedCount || 0,
    statusesCount: user.statusesCount || 0,
    favouritesCount: user.favouritesCount || 0,
    protected: user.protected || false,
    canDm: user.canDm || false,
    profileBannerUrl: user.profileBannerUrl || null,
    verificationType: user.verificationType || null,
    verificationReason: user.verificationReason || null,
    vibe: user.vibe || null,
    department: user.department || null,
    org_type: user.org_type || null,
    org_subtype: user.org_subtype || null,
    web3_focus: user.web3_focus || null
  }))

  // Process batches in parallel groups
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < users.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<{ success: boolean; count: number }>[] = []

    // Create parallel batch promises
    for (let j = 0; j < parallelBatches && (i + j * batchSize) < users.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, users.length)
      const batch = users.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(createQuery, { users: sanitizeBatch(batch) })
          .then(() => ({ success: true, count: batch.length }))
          .catch((error: any) => {
            console.error(`❌ Batch ${Math.floor(startIdx / batchSize) + 1} failed:`, error.message)
            return { success: false, count: 0 }
          })
      )
    }

    // Wait for parallel batches to complete
    const results = await Promise.all(batchPromises)
    results.forEach(result => {
      if (result.success) {
        successCount += result.count
      } else {
        errorCount++
      }
    })
  }

  console.log(`✅ Batch created ${successCount} users (${errorCount} batch errors)`)
}

// Batch update existing users with new data, with parallel processing
async function batchUpdateUsers(updates: Array<{user: Neo4jUser, targetUserId: string}>): Promise<void> {
  if (updates.length === 0) return

  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(updates.length / batchSize)

  console.log(`🔄 Batch updating ${updates.length} users in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const updateQuery = `
    UNWIND $updates AS updateData
    MATCH (u:User {userId: updateData.targetUserId})
    SET
      u.userId = updateData.userData.userId,
      u.name = updateData.userData.name,
      u.lastUpdated = updateData.userData.lastUpdated,
      u.profileImageUrl = updateData.userData.profileImageUrl,
      u.description = updateData.userData.description,
      u.location = updateData.userData.location,
      u.url = updateData.userData.url,
      u.followersCount = updateData.userData.followersCount,
      u.followingCount = updateData.userData.followingCount,
      u.verified = updateData.userData.verified,
      u.listedCount = updateData.userData.listedCount,
      u.statusesCount = updateData.userData.statusesCount,
      u.favouritesCount = updateData.userData.favouritesCount,
      u.protected = updateData.userData.protected,
      u.canDm = updateData.userData.canDm,
      u.profileBannerUrl = updateData.userData.profileBannerUrl,
      u.verificationType = updateData.userData.verificationType,
      u.verificationReason = updateData.userData.verificationReason,
      u.vibe = updateData.userData.vibe,
      u.department = updateData.userData.department,
      u.org_type = CASE WHEN updateData.userData.org_type IS NOT NULL THEN updateData.userData.org_type ELSE u.org_type END,
      u.org_subtype = CASE WHEN updateData.userData.org_subtype IS NOT NULL THEN updateData.userData.org_subtype ELSE u.org_subtype END,
      u.web3_focus = CASE WHEN updateData.userData.web3_focus IS NOT NULL THEN updateData.userData.web3_focus ELSE u.web3_focus END
    RETURN u.userId as finalUserId
  `

  // Helper to sanitize a batch
  const sanitizeBatch = (batch: Array<{user: Neo4jUser, targetUserId: string}>) => batch.map(({ user, targetUserId }) => ({
    targetUserId,
    userData: {
      userId: user.userId,
      name: user.name,
      lastUpdated: user.lastUpdated,
      profileImageUrl: user.profileImageUrl || null,
      description: user.description || null,
      location: user.location || null,
      url: user.url || null,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      verified: user.verified,
      listedCount: user.listedCount || 0,
      statusesCount: user.statusesCount || 0,
      favouritesCount: user.favouritesCount || 0,
      protected: user.protected || false,
      canDm: user.canDm || false,
      profileBannerUrl: user.profileBannerUrl || null,
      verificationType: user.verificationType || null,
      verificationReason: user.verificationReason || null,
      vibe: user.vibe || null,
      department: user.department || null,
      org_type: user.org_type || null,
      org_subtype: user.org_subtype || null,
      web3_focus: user.web3_focus || null
    }
  }))

  // Process batches in parallel groups
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < updates.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<{ success: boolean; count: number }>[] = []

    // Create parallel batch promises
    for (let j = 0; j < parallelBatches && (i + j * batchSize) < updates.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, updates.length)
      const batch = updates.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(updateQuery, { updates: sanitizeBatch(batch) })
          .then(() => ({ success: true, count: batch.length }))
          .catch((error: any) => {
            console.error(`❌ Update batch ${Math.floor(startIdx / batchSize) + 1} failed:`, error.message)
            return { success: false, count: 0 }
          })
      )
    }

    // Wait for parallel batches to complete
    const results = await Promise.all(batchPromises)
    results.forEach(result => {
      if (result.success) {
        successCount += result.count
      } else {
        errorCount++
      }
    })
  }

  console.log(`✅ Batch updated ${successCount} users (${errorCount} batch errors)`)
}

// Shared update query for screenName-based matching
const UPDATE_BY_SCREENNAME_QUERY = `
  MATCH (u:User)
  WHERE toLower(u.screenName) = toLower($screenName)
  SET
    u.userId = $userId, u.name = $name, u.profileImageUrl = $profileImageUrl,
    u.description = $description, u.location = $location, u.url = $url,
    u.followersCount = $followersCount, u.followingCount = $followingCount,
    u.verified = $verified, u.lastUpdated = $lastUpdated,
    u.listedCount = $listedCount, u.statusesCount = $statusesCount,
    u.favouritesCount = $favouritesCount, u.protected = $protected,
    u.canDm = $canDm, u.profileBannerUrl = $profileBannerUrl,
    u.verificationType = $verificationType, u.verificationReason = $verificationReason,
    u.vibe = CASE WHEN $vibe IS NOT NULL AND $vibe <> '' THEN $vibe ELSE u.vibe END,
    u.department = CASE WHEN $department IS NOT NULL AND $department <> '' THEN $department ELSE u.department END,
    u.org_type = CASE WHEN $org_type IS NOT NULL THEN $org_type ELSE u.org_type END,
    u.org_subtype = CASE WHEN $org_subtype IS NOT NULL THEN $org_subtype ELSE u.org_subtype END,
    u.web3_focus = CASE WHEN $web3_focus IS NOT NULL THEN $web3_focus ELSE u.web3_focus END
  RETURN u.userId as finalUserId
`

// Create or update a single user, merging by screenName to avoid duplicates
// This is the ONLY function that should create User nodes to ensure screenName uniqueness
export async function createOrUpdateUserWithScreenNameMerge(user: Neo4jUser): Promise<string> {
  const conflictCheckQuery = `
    OPTIONAL MATCH (byScreenName:User)
    WHERE toLower(byScreenName.screenName) = toLower($screenName)
    OPTIONAL MATCH (byUserId:User {userId: $userId})
    RETURN
      byScreenName.userId as existingByScreenName,
      byScreenName.screenName as existingScreenName,
      byUserId.userId as existingByUserId,
      byUserId.screenName as existingByUserIdScreenName
  `

  const conflictResult = await runQuery(conflictCheckQuery, {
    screenName: user.screenName,
    userId: user.userId
  })

  const result = conflictResult[0]
  const existingByScreenName = result?.existingByScreenName
  const existingByUserId = result?.existingByUserId
  const params = buildUserQueryParams(user)

  // Case 1: Both screenName and userId conflict with DIFFERENT users
  if (existingByScreenName && existingByUserId && existingByScreenName !== existingByUserId) {
    console.log(`⚠️ Conflict detected: screenName @${user.screenName} exists as ${existingByScreenName}, userId ${user.userId} exists as ${existingByUserId}`)
    console.log(`🎯 Resolving conflict: Using screenName match ${existingByScreenName}, updating with data from ${user.userId}`)
    const updateResult = await runQuery(UPDATE_BY_SCREENNAME_QUERY, params)
    return updateResult[0]?.finalUserId || existingByScreenName
  }

  // Case 2: ScreenName conflict - update existing user
  if (existingByScreenName) {
    if (existingByScreenName !== user.userId) {
      console.log(`🔄 ScreenName merge: @${user.screenName} exists as ${existingByScreenName}, updating with data from ${user.userId}`)
    }
    const updateResult = await runQuery(UPDATE_BY_SCREENNAME_QUERY, params)
    return updateResult[0]?.finalUserId || existingByScreenName
  }

  // Case 3: UserId conflict - update screenName
  if (existingByUserId) {
    console.log(`🔄 UserId merge: ${user.userId} exists with screenName @${result.existingByUserIdScreenName}, updating to @${user.screenName}`)
    const updateByUserIdQuery = `
      MATCH (u:User {userId: $userId})
      SET
        u.screenName = $screenName, u.name = $name, u.profileImageUrl = $profileImageUrl,
        u.description = $description, u.location = $location, u.url = $url,
        u.followersCount = $followersCount, u.followingCount = $followingCount,
        u.verified = $verified, u.lastUpdated = $lastUpdated,
        u.listedCount = $listedCount, u.statusesCount = $statusesCount,
        u.favouritesCount = $favouritesCount, u.protected = $protected,
        u.canDm = $canDm, u.profileBannerUrl = $profileBannerUrl,
        u.verificationType = $verificationType, u.verificationReason = $verificationReason,
        u.vibe = CASE WHEN $vibe IS NOT NULL AND $vibe <> '' THEN $vibe ELSE u.vibe END,
        u.department = CASE WHEN $department IS NOT NULL AND $department <> '' THEN $department ELSE u.department END,
        u.org_type = CASE WHEN $org_type IS NOT NULL THEN $org_type ELSE u.org_type END,
        u.org_subtype = CASE WHEN $org_subtype IS NOT NULL THEN $org_subtype ELSE u.org_subtype END,
        u.web3_focus = CASE WHEN $web3_focus IS NOT NULL THEN $web3_focus ELSE u.web3_focus END
      RETURN u.userId as finalUserId
    `
    const updateResult = await runQuery(updateByUserIdQuery, params)
    return updateResult[0]?.finalUserId || user.userId
  }

  // Case 4: No conflicts - create new user
  const createQuery = `
    CREATE (u:User)
    SET
      u.userId = $userId, u.screenName = $screenName, u.name = $name,
      u.createdAt = $createdAt, u.lastUpdated = $lastUpdated,
      u.profileImageUrl = $profileImageUrl, u.description = $description,
      u.location = $location, u.url = $url,
      u.followersCount = $followersCount, u.followingCount = $followingCount,
      u.verified = $verified, u.listedCount = $listedCount,
      u.statusesCount = $statusesCount, u.favouritesCount = $favouritesCount,
      u.protected = $protected, u.canDm = $canDm,
      u.profileBannerUrl = $profileBannerUrl, u.verificationType = $verificationType,
      u.verificationReason = $verificationReason, u.vibe = $vibe,
      u.department = $department, u.org_type = $org_type,
      u.org_subtype = $org_subtype, u.web3_focus = $web3_focus
    RETURN u.userId as finalUserId
  `
  const createResult = await runQuery(createQuery, params)
  return createResult[0]?.finalUserId || user.userId
}

// Create a FOLLOWS relationship between two users
export async function createFollowsRelationship(followerUserId: string, followingUserId: string): Promise<void> {
  const query = `
    MATCH (follower:User {userId: $followerUserId})
    MATCH (following:User {userId: $followingUserId})
    MERGE (follower)-[:FOLLOWS]->(following)
  `
  
  await runQuery(query, { followerUserId, followingUserId })
}

// Create multiple FOLLOWS relationships in batch with improved batching
// Check if follower/following counts have significant difference (>10%)
export function hasSignificantCountDifference(cachedCount: number, apiCount: number, threshold: number = 0.1): boolean {
  if (cachedCount === 0) return true // Always fetch if no cached data
  const difference = Math.abs(cachedCount - apiCount) / cachedCount
  return difference > threshold
}

// Get follower count for a user in Neo4j
export async function getUserFollowerCount(userId: string): Promise<number> {
  const query = `
    MATCH (follower:User)-[:FOLLOWS]->(u:User {userId: $userId})
    RETURN count(follower) as followerCount
  `
  
  const results = await runQuery(query, { userId })
  return results[0]?.followerCount?.low || 0
}

// Get following count for a user in Neo4j
export async function getUserFollowingCount(userId: string): Promise<number> {
  const query = `
    MATCH (u:User {userId: $userId})-[:FOLLOWS]->(following:User)
    RETURN count(following) as followingCount
  `
  
  const results = await runQuery(query, { userId })
  return results[0]?.followingCount?.low || 0
}

// Clear all follower relationships for a user (when refreshing followers)
// Get a user by screen name (case-insensitive)
export async function getUserByScreenName(screenName: string): Promise<Neo4jUser | null> {
  const query = `
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower($screenName)
    RETURN u
  `
  
  const results = await runQuery(query, { screenName })
  return results.length > 0 ? results[0].u.properties : null
}

// Get a user by user ID
export async function getUserByUserId(userId: string): Promise<Neo4jUser | null> {
  const query = `
    MATCH (u:User {userId: $userId})
    RETURN u
  `
  
  const results = await runQuery(query, { userId })
  return results.length > 0 ? results[0].u.properties : null
}

// Create a new organization user with screenName-based deduplication
export async function createOrganizationUser(screenName: string, name: string): Promise<Neo4jUser> {
  // Use the screenName-based merge function to prevent duplicates
  const neo4jUser: Neo4jUser = {
    userId: `org_${screenName.toLowerCase()}_${Date.now()}`, // Temporary ID, will be replaced if merging
    screenName,
    name,
    profileImageUrl: undefined,
    description: undefined,
    location: undefined,
    url: undefined,
    followersCount: 0,
    followingCount: 0,
    verified: false,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    listedCount: 0,
    statusesCount: 0,
    favouritesCount: 0,
    protected: false,
    canDm: false,
    profileBannerUrl: undefined,
    verificationType: undefined,
    verificationReason: undefined,
    vibe: 'organization',
    department: undefined,
    org_type: undefined,
    org_subtype: undefined,
    web3_focus: undefined
  }
  
  // Use screenName-based merge to prevent duplicates
  const finalUserId = await createOrUpdateUserWithScreenNameMerge(neo4jUser)
  
  // Return the user from the database to get the correct userId
  const user = await getUserByScreenName(screenName)
  if (!user) {
    throw new Error(`Failed to create or retrieve user for screenName: ${screenName}`)
  }
  
  return user
}

/**
 * Ensure single user exists for screen name - prevents duplicates
 */
export async function ensureUserExists(
  screenName: string, 
  name?: string
): Promise<Neo4jUser> {
  // Check if user already exists
  let user = await getUserByScreenName(screenName)
  
  if (user) {
    console.log(`✅ User exists: ${user.userId}`)
    return user
  }
  
  // Create new user
  console.log(`🆕 Creating user for @${screenName}`)
  user = await createOrganizationUser(screenName, name || screenName)
  console.log(`✅ User created: ${user.userId}`)
  
  return user
}

// Check if user data is stale (older than specified hours)
export function isUserDataStale(user: Neo4jUser, maxAgeHours: number = 1080): boolean { // 45 days = 1080 hours
  const lastUpdated = new Date(user.lastUpdated)
  const now = new Date()
  const hoursDiff = (now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60)
  return hoursDiff > maxAgeHours
}

// Check if user needs Grok classification (missing vibe)
// Note: We only check for vibe, not relationships. Relationships are processed
// as part of classification, so if vibe exists, the user has already been classified.
// Re-classifying just because relationships are missing would cause repeated API calls.
export async function userNeedsClassification(screenName: string): Promise<boolean> {
  const query = `
    MATCH (u:User)
    WHERE u.screenNameLower = $screenNameLower
    RETURN u.vibe as vibe
  `
  const result = await runQuery(query, { screenNameLower: screenName.toLowerCase() })

  if (!result || result.length === 0) {
    // User doesn't exist yet, needs classification
    return true
  }

  const { vibe } = result[0]
  // Need classification only if vibe is missing
  return !vibe
}

// Get orgs connected to a user that need connection discovery (no other employees/members)
export async function getOrgsNeedingConnectionDiscovery(
  userScreenName: string,
  excludeScreenNames: string[]
): Promise<Array<{screenName: string, userId: string}>> {
  const query = `
    MATCH (u:User {screenNameLower: $userScreenNameLower})-[:WORKS_AT|WORKED_AT|MEMBER_OF|AFFILIATED_WITH]->(org:User {vibe: 'organization'})

    // Check if org has any OTHER employees/members (excluding the users we're checking)
    OPTIONAL MATCH (org)<-[:WORKS_AT|WORKED_AT|MEMBER_OF|AFFILIATED_WITH]-(other:User)
    WHERE NOT other.screenNameLower IN $excludeScreenNamesLower

    WITH org, count(other) as otherConnectionCount
    WHERE otherConnectionCount = 0

    RETURN org.screenName as screenName, org.userId as userId
  `

  const result = await runQuery(query, {
    userScreenNameLower: userScreenName.toLowerCase(),
    excludeScreenNamesLower: excludeScreenNames.map(s => s.toLowerCase())
  })

  return result.map(row => ({
    screenName: row.screenName,
    userId: row.userId
  }))
}

// Find mutual connections between two users
export async function findMutualConnections(userScreenName: string, prospectScreenName: string): Promise<Neo4jUser[]> {
  console.log(`Finding mutuals between ${userScreenName} and ${prospectScreenName}`)
  
  // First check if both users exist in the database
  const userExists = await getUserByScreenName(userScreenName)
  const prospectExists = await getUserByScreenName(prospectScreenName)
  
  console.log(`User ${userScreenName} exists:`, !!userExists)
  console.log(`Prospect ${prospectScreenName} exists:`, !!prospectExists)
  
  if (!userExists || !prospectExists) {
    console.log(`One or both users not found in database`)
    return []
  }
  
  // Case-insensitive query with debugging
  const query = `
    MATCH (user:User)
    WHERE toLower(user.screenName) = toLower($userScreenName)
    MATCH (prospect:User)
    WHERE toLower(prospect.screenName) = toLower($prospectScreenName)
    MATCH (prospect)-[:FOLLOWS]->(mutual:User)
    MATCH (mutual)-[:FOLLOWS]->(user)
    RETURN mutual, user.screenName as userScreen, prospect.screenName as prospectScreen
    ORDER BY mutual.followersCount DESC
  `
  
  const results = await runQuery(query, { userScreenName, prospectScreenName })
  console.log(`Found ${results.length} mutual connections`)
  
  if (results.length > 0) {
    console.log(`Sample mutual:`, results[0].mutual.properties.screenName)
  }
  
  return results.map(record => record.mutual.properties)
}

// Relevancy scoring weights for mutual connections
const RELEVANCY_WEIGHTS = {
  DIRECT_MUTUAL_BASE: 100,
  ORG_MUTUAL_BASE: 50,
  // Relationship type multipliers
  WORKS_AT: 1.5,
  WORKED_AT: 1.0,
  INVESTED_IN: 1.3,
  AUDITS: 1.1,
  AFFILIATED_WITH: 0.8,
  PARTNERS_WITH: 1.2,
  MEMBER_OF: 1.0,
  // Connection source multipliers
  PROSPECT_DIRECT: 1.5,
  PROSPECT_FOLLOWING: 1.0,
  // Bonus factors
  VERIFIED_BONUS: 10,
  HIGH_FOLLOWERS_BONUS: 5,
  MULTIPLE_ORGS_BONUS: 5,
} as const

// Calculate relevancy score for a mutual connection
export function calculateRelevancyScore(
  mutualType: MutualType,
  orgConnections: OrgConnection[] | undefined,
  verified: boolean,
  followersCount: number
): number {
  let score = mutualType === 'direct'
    ? RELEVANCY_WEIGHTS.DIRECT_MUTUAL_BASE
    : RELEVANCY_WEIGHTS.ORG_MUTUAL_BASE

  if (mutualType === 'organizational' && orgConnections && orgConnections.length > 0) {
    orgConnections.forEach((conn, index) => {
      const relTypeWeight = RELEVANCY_WEIGHTS[conn.userRelationType] || 1.0
      const sourceWeight = conn.matchSource === 'prospect_direct'
        ? RELEVANCY_WEIGHTS.PROSPECT_DIRECT
        : RELEVANCY_WEIGHTS.PROSPECT_FOLLOWING

      if (index === 0) {
        score *= relTypeWeight * sourceWeight
      } else {
        score += RELEVANCY_WEIGHTS.MULTIPLE_ORGS_BONUS * relTypeWeight
      }
    })
  }

  if (verified) score += RELEVANCY_WEIGHTS.VERIFIED_BONUS
  if (followersCount >= 10000) score += RELEVANCY_WEIGHTS.HIGH_FOLLOWERS_BONUS

  return Math.round(score * 10) / 10
}

// Find organizational mutuals between logged-in user and searched prospect
export async function findOrganizationalMutuals(
  userScreenName: string,
  prospectScreenName: string
): Promise<MutualConnection[]> {
  console.log(`Finding organizational mutuals between ${userScreenName} and ${prospectScreenName}`)

  const [userExists, prospectExists] = await Promise.all([
    getUserByScreenName(userScreenName),
    getUserByScreenName(prospectScreenName)
  ])

  if (!userExists || !prospectExists) {
    console.log(`One or both users not found in database for org mutual search`)
    return []
  }

  // Query for DIRECT org connections (C - Org - B)
  // No intermediary, so no extra follow checks needed
  const directOrgQuery = `
    MATCH (user:User)
    WHERE toLower(user.screenName) = toLower($userScreenName)
    MATCH (prospect:User)
    WHERE toLower(prospect.screenName) = toLower($prospectScreenName)

    // Get prospect's (B) direct org connections
    MATCH (prospect)-[prospectRel:WORKS_AT|WORKED_AT|INVESTED_IN|AUDITS|AFFILIATED_WITH|PARTNERS_WITH]->(org:User)

    // Get user's (A) followers who also have org connection to the same org
    MATCH (follower:User)-[:FOLLOWS]->(user)
    MATCH (follower)-[followerRel:WORKS_AT|WORKED_AT|INVESTED_IN|AUDITS|AFFILIATED_WITH|PARTNERS_WITH]->(org)

    RETURN DISTINCT
      follower.userId as userId,
      follower.screenName as screenName,
      follower.name as name,
      follower.profileImageUrl as profileImageUrl,
      follower.description as description,
      follower.location as location,
      follower.url as url,
      follower.followersCount as followersCount,
      follower.followingCount as followingCount,
      follower.verified as verified,
      follower.vibe as vibe,
      follower.lastUpdated as lastUpdated,
      COLLECT(DISTINCT {
        orgUserId: org.userId,
        orgScreenName: org.screenName,
        orgName: org.name,
        userRelationType: type(followerRel),
        prospectRelationType: type(prospectRel),
        matchSource: 'prospect_direct',
        viaUser: null
      }) as orgConnections
    ORDER BY follower.followersCount DESC
  `

  // Query for INDIRECT org connections via prospect's following (C - Org - X - B)
  // Requires non-breakable chain: C ↔ X (mutual follow) and X ↔ B (mutual follow)
  const indirectOrgQuery = `
    MATCH (user:User)
    WHERE toLower(user.screenName) = toLower($userScreenName)
    MATCH (prospect:User)
    WHERE toLower(prospect.screenName) = toLower($prospectScreenName)

    // Get prospect's (B) followings (X) and their org connections
    // B follows X
    MATCH (prospect)-[:FOLLOWS]->(intermediary:User)
    // X follows B (bidirectional)
    MATCH (intermediary)-[:FOLLOWS]->(prospect)

    // X has org connection
    MATCH (intermediary)-[intermediaryRel:WORKS_AT|WORKED_AT|INVESTED_IN|AUDITS|AFFILIATED_WITH|PARTNERS_WITH]->(org:User)

    // Get user's (A) followers (C) who also have org connection to the same org
    MATCH (follower:User)-[:FOLLOWS]->(user)
    MATCH (follower)-[followerRel:WORKS_AT|WORKED_AT|INVESTED_IN|AUDITS|AFFILIATED_WITH|PARTNERS_WITH]->(org)

    // Non-breakable chain: C ↔ X (mutual follow)
    MATCH (follower)-[:FOLLOWS]->(intermediary)
    MATCH (intermediary)-[:FOLLOWS]->(follower)

    RETURN DISTINCT
      follower.userId as userId,
      follower.screenName as screenName,
      follower.name as name,
      follower.profileImageUrl as profileImageUrl,
      follower.description as description,
      follower.location as location,
      follower.url as url,
      follower.followersCount as followersCount,
      follower.followingCount as followingCount,
      follower.verified as verified,
      follower.vibe as vibe,
      follower.lastUpdated as lastUpdated,
      COLLECT(DISTINCT {
        orgUserId: org.userId,
        orgScreenName: org.screenName,
        orgName: org.name,
        userRelationType: type(followerRel),
        prospectRelationType: type(intermediaryRel),
        matchSource: 'prospect_following',
        viaUser: intermediary.screenName
      }) as orgConnections
    ORDER BY follower.followersCount DESC
  `

  // Run both queries in parallel
  const [directResults, indirectResults] = await Promise.all([
    runQuery(directOrgQuery, { userScreenName, prospectScreenName }),
    runQuery(indirectOrgQuery, { userScreenName, prospectScreenName })
  ])

  console.log(`Found ${directResults.length} direct org mutuals, ${indirectResults.length} indirect org mutuals`)

  // Combine results and deduplicate by userId
  const seenUserIds = new Set<string>()
  const allResults: any[] = []

  // Add direct results first (higher priority)
  for (const record of directResults) {
    if (!seenUserIds.has(record.userId)) {
      seenUserIds.add(record.userId)
      allResults.push(record)
    }
  }

  // Add indirect results
  for (const record of indirectResults) {
    if (!seenUserIds.has(record.userId)) {
      seenUserIds.add(record.userId)
      allResults.push(record)
    }
  }

  console.log(`Total organizational mutual connections: ${allResults.length}`)

  return allResults.map(record => ({
    userId: record.userId,
    screenName: record.screenName,
    name: record.name,
    profileImageUrl: record.profileImageUrl,
    description: record.description,
    location: record.location,
    url: record.url,
    followersCount: record.followersCount || 0,
    followingCount: record.followingCount || 0,
    verified: Boolean(record.verified),
    vibe: record.vibe,
    lastUpdated: record.lastUpdated || new Date().toISOString(),
    mutualType: 'organizational' as MutualType,
    relevancyScore: calculateRelevancyScore('organizational', record.orgConnections, Boolean(record.verified), record.followersCount || 0),
    orgConnections: record.orgConnections
  }))
}

// Main entry point for enhanced mutual finding (combines direct + organizational)
export async function findEnhancedMutuals(
  userScreenName: string,
  prospectScreenName: string
): Promise<FindMutualsResult> {
  console.log(`=== ENHANCED MUTUAL FINDING ===`)
  console.log(`User: ${userScreenName}, Prospect: ${prospectScreenName}`)

  // Run both queries in parallel for performance
  const [directMutualsRaw, orgMutualsRaw] = await Promise.all([
    findMutualConnections(userScreenName, prospectScreenName),
    findOrganizationalMutuals(userScreenName, prospectScreenName)
  ])

  // Transform direct mutuals with scores
  const directMutuals: MutualConnection[] = directMutualsRaw.map(user => ({
    ...user,
    mutualType: 'direct' as MutualType,
    relevancyScore: calculateRelevancyScore('direct', undefined, user.verified, user.followersCount)
  }))

  // Filter out org mutuals that are already direct mutuals (avoid duplicates)
  const directUserIds = new Set(directMutuals.map(m => m.userId))
  const orgMutuals = orgMutualsRaw.filter(m => !directUserIds.has(m.userId))

  // Combine and sort by relevancy score
  const combined = [...directMutuals, ...orgMutuals]
    .sort((a, b) => b.relevancyScore - a.relevancyScore)

  console.log(`=== ENHANCED MUTUAL RESULTS ===`)
  console.log(`Direct mutuals: ${directMutuals.length}`)
  console.log(`Org mutuals: ${orgMutuals.length}`)
  console.log(`Total: ${combined.length}`)

  return {
    directMutuals,
    orgMutuals,
    combined,
    totalCount: combined.length,
    directCount: directMutuals.length,
    orgCount: orgMutuals.length
  }
}

// ============================================================================
// NEW TWO-POV MUTUAL FINDING SYSTEM (9 QUERIES)
// ============================================================================

// Result interface for the new two-POV system
export interface TwoPOVMutualsResult {
  // POV 1: C-based introducers (people who can introduce A to B)
  introducers: {
    direct: EnhancedMutualConnection[]
    orgDirect: EnhancedMutualConnection[]
    orgIndirect: EnhancedMutualConnection[]
    sharedThirdParty: EnhancedMutualConnection[]
    chainAffinity: EnhancedMutualConnection[]
    combined: EnhancedMutualConnection[] // All sorted by score
  }
  // POV 2: A's direct connections to B (no introducer needed)
  directConnections: {
    orgDirect: ConnectionPath[]
    orgIndirect: ConnectionPath[]
    sharedThirdParty: ConnectionPath[]
    chainAffinity: ConnectionPath[]
  }
  counts: {
    introducers: number
    directConnections: number
  }
  partialResults?: boolean
  errors?: string[]
}

// Org relationship pattern for Cypher queries (excludes FOLLOWS and COMPETES_WITH)
const ORG_REL_PATTERN = ':WORKS_AT|WORKED_AT|INVESTED_IN|AUDITS|AFFILIATED_WITH|PARTNERS_WITH|MEMBER_OF'

// New scoring system based on plan
const ENHANCED_SCORING = {
  // Base scores by connection type
  BASE_SCORES: {
    direct: 60,
    org_direct: 55,
    org_indirect: 40,
    shared_third_party: 35,
    chain_affinity: 25,
  },
  // Relationship multipliers
  RELATIONSHIP_MULTIPLIERS: {
    WORKS_AT: 1.8,
    INVESTED_IN: 1.5,
    AUDITS: 1.3,
    PARTNERS_WITH: 1.2,
    WORKED_AT: 1.0,
    MEMBER_OF: 1.0,
    AFFILIATED_WITH: 0.9,
  },
  // Bonuses
  VERIFIED_BONUS: 8,
  BUSINESS_VERIFIED_BONUS: 15,
  SAME_DEPARTMENT_BONUS: 12,
  ADJACENT_DEPARTMENT_BONUS: 6,
  MULTIPLE_ORG_CONNECTIONS_BONUS: 8,
  MULTI_CONNECTION_TYPE_BONUS: 20, // Bonus per additional connection type
  RECIPROCITY_BONUS: 15, // C↔B mutual follow is stronger intro path
  // Freshness decay
  FRESHNESS_HALF_LIFE_DAYS: 90,
  FRESHNESS_MINIMUM: 0.3,
} as const

// Calculate enhanced relevancy score with logarithmic scaling
export function calculateEnhancedScore(
  connectionType: ConnectionType,
  user: Partial<Neo4jUser>,
  relationshipTypes: OrgRelationType[] = [],
  options?: {
    sameDepartment?: boolean
    adjacentDepartment?: boolean
    multipleOrgConnections?: number
    lastUpdated?: string
    isReciprocal?: boolean // C↔B mutual follow
  }
): { score: number; breakdown: EnhancedMutualConnection['scoreBreakdown'] } {
  // Base score
  const base = ENHANCED_SCORING.BASE_SCORES[connectionType]

  // Relationship multiplier (use the highest if multiple)
  let relationshipMultiplier = 1.0
  if (relationshipTypes.length > 0) {
    const multipliers = relationshipTypes.map(
      rel => ENHANCED_SCORING.RELATIONSHIP_MULTIPLIERS[rel] || 1.0
    )
    relationshipMultiplier = Math.max(...multipliers)
  }

  // Account quality (logarithmic scaling)
  const followersCount = user.followersCount || 0
  const listedCount = user.listedCount || 0
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const accountAgeYears = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)

  const accountQuality =
    4 * Math.log10(followersCount + 1) +
    3 * Math.log10(listedCount + 1) +
    2 * Math.min(accountAgeYears, 10) // Cap at 10 years

  // Bonuses
  let bonuses = 0
  if (user.verified) bonuses += ENHANCED_SCORING.VERIFIED_BONUS
  if (user.verificationType === 'Business') bonuses += ENHANCED_SCORING.BUSINESS_VERIFIED_BONUS
  if (options?.sameDepartment) bonuses += ENHANCED_SCORING.SAME_DEPARTMENT_BONUS
  if (options?.adjacentDepartment) bonuses += ENHANCED_SCORING.ADJACENT_DEPARTMENT_BONUS
  if (options?.multipleOrgConnections && options.multipleOrgConnections > 1) {
    bonuses += ENHANCED_SCORING.MULTIPLE_ORG_CONNECTIONS_BONUS * (options.multipleOrgConnections - 1)
  }
  if (options?.isReciprocal) bonuses += ENHANCED_SCORING.RECIPROCITY_BONUS

  // Freshness decay
  let freshnessDecay = 1.0
  if (options?.lastUpdated) {
    const daysSinceUpdate = (Date.now() - new Date(options.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    freshnessDecay = Math.max(
      ENHANCED_SCORING.FRESHNESS_MINIMUM,
      Math.pow(0.5, daysSinceUpdate / ENHANCED_SCORING.FRESHNESS_HALF_LIFE_DAYS)
    )
  }

  // Calculate final score
  const rawScore = (base * relationshipMultiplier + accountQuality + bonuses) * freshnessDecay
  const score = Math.round(rawScore * 10) / 10

  return {
    score,
    breakdown: {
      base,
      relationshipMultiplier,
      accountQuality: Math.round(accountQuality * 10) / 10,
      bonuses,
      freshnessDecay: Math.round(freshnessDecay * 100) / 100,
    },
  }
}

// Calculate aggregated score for users with multiple connection types
export function calculateAggregatedScore(
  connectionTypes: ConnectionType[],
  user: Partial<Neo4jUser>,
  allRelationshipTypes: OrgRelationType[] = [],
  options?: {
    sameDepartment?: boolean
    adjacentDepartment?: boolean
    totalOrgConnections?: number
    lastUpdated?: string
    isReciprocal?: boolean // C↔B mutual follow
  }
): { score: number; breakdown: EnhancedMutualConnection['scoreBreakdown'] } {
  // Sum base scores for ALL connection types
  let baseScore = 0
  for (const type of connectionTypes) {
    baseScore += ENHANCED_SCORING.BASE_SCORES[type]
  }

  // Multi-type bonus: +20 per additional connection type
  const multiTypeBonus = (connectionTypes.length - 1) * ENHANCED_SCORING.MULTI_CONNECTION_TYPE_BONUS

  // Relationship multiplier (use the highest if multiple)
  let relationshipMultiplier = 1.0
  if (allRelationshipTypes.length > 0) {
    const multipliers = allRelationshipTypes.map(
      rel => ENHANCED_SCORING.RELATIONSHIP_MULTIPLIERS[rel] || 1.0
    )
    relationshipMultiplier = Math.max(...multipliers)
  }

  // Account quality (logarithmic scaling)
  const followersCount = user.followersCount || 0
  const listedCount = user.listedCount || 0
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date()
  const accountAgeYears = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24 * 365)

  const accountQuality =
    4 * Math.log10(followersCount + 1) +
    3 * Math.log10(listedCount + 1) +
    2 * Math.min(accountAgeYears, 10) // Cap at 10 years

  // Bonuses
  let bonuses = multiTypeBonus
  if (user.verified) bonuses += ENHANCED_SCORING.VERIFIED_BONUS
  if (user.verificationType === 'Business') bonuses += ENHANCED_SCORING.BUSINESS_VERIFIED_BONUS
  if (options?.sameDepartment) bonuses += ENHANCED_SCORING.SAME_DEPARTMENT_BONUS
  if (options?.adjacentDepartment) bonuses += ENHANCED_SCORING.ADJACENT_DEPARTMENT_BONUS
  if (options?.totalOrgConnections && options.totalOrgConnections > 1) {
    bonuses += ENHANCED_SCORING.MULTIPLE_ORG_CONNECTIONS_BONUS * (options.totalOrgConnections - 1)
  }
  if (options?.isReciprocal) bonuses += ENHANCED_SCORING.RECIPROCITY_BONUS

  // Freshness decay
  let freshnessDecay = 1.0
  if (options?.lastUpdated) {
    const daysSinceUpdate = (Date.now() - new Date(options.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
    freshnessDecay = Math.max(
      ENHANCED_SCORING.FRESHNESS_MINIMUM,
      Math.pow(0.5, daysSinceUpdate / ENHANCED_SCORING.FRESHNESS_HALF_LIFE_DAYS)
    )
  }

  // Calculate final score
  const rawScore = (baseScore * relationshipMultiplier + accountQuality + bonuses) * freshnessDecay
  const score = Math.round(rawScore * 10) / 10

  return {
    score,
    breakdown: {
      base: baseScore,
      relationshipMultiplier,
      accountQuality: Math.round(accountQuality * 10) / 10,
      bonuses,
      freshnessDecay: Math.round(freshnessDecay * 100) / 100,
    },
  }
}

// ============================================================================
// POV 1: C-BASED QUERIES (INTRODUCERS)
// ============================================================================

// 1. C-based Direct: C follows A, B follows C
export async function findCBasedDirect(
  aScreenName: string, // logged-in user (A)
  bScreenName: string  // prospect (B)
): Promise<EnhancedMutualConnection[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (c:User)-[:FOLLOWS]->(a)
    WHERE c <> a AND c <> b
    MATCH (b)-[:FOLLOWS]->(c)
    OPTIONAL MATCH (c)-[cFollowsB:FOLLOWS]->(b)
    RETURN DISTINCT
      c.userId as userId,
      c.screenName as screenName,
      c.name as name,
      c.profileImageUrl as profileImageUrl,
      c.description as description,
      c.location as location,
      c.url as url,
      c.followersCount as followersCount,
      c.followingCount as followingCount,
      c.verified as verified,
      c.verificationType as verificationType,
      c.listedCount as listedCount,
      c.createdAt as createdAt,
      c.vibe as vibe,
      c.department as department,
      c.lastUpdated as lastUpdated,
      cFollowsB IS NOT NULL as isReciprocal
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    return results.map(record => {
      const { score, breakdown } = calculateEnhancedScore('direct', record, [], {
        isReciprocal: record.isReciprocal
      })
      return {
        userId: record.userId,
        screenName: record.screenName,
        name: record.name,
        profileImageUrl: record.profileImageUrl,
        description: record.description,
        location: record.location,
        url: record.url,
        followersCount: record.followersCount || 0,
        followingCount: record.followingCount || 0,
        verified: Boolean(record.verified),
        verificationType: record.verificationType,
        listedCount: record.listedCount || 0,
        createdAt: record.createdAt,
        vibe: record.vibe,
        department: record.department,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        connectionType: 'direct' as ConnectionType,
        relevancyScore: score,
        scoreBreakdown: breakdown,
        isReciprocal: record.isReciprocal,
      }
    })
  } catch (error: any) {
    console.error('Error in findCBasedDirect:', error.message)
    return []
  }
}

// 2. C-based Org Direct: C follows A, C—[org rel]—X, B—[org rel]—X
export async function findCBasedOrgDirect(
  aScreenName: string,
  bScreenName: string
): Promise<EnhancedMutualConnection[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (c:User)-[:FOLLOWS]->(a)
    WHERE c <> a AND c <> b
    MATCH (c)-[cRel${ORG_REL_PATTERN}]->(x:User)
    MATCH (b)-[bRel${ORG_REL_PATTERN}]->(x)
    OPTIONAL MATCH (c)-[cFollowsB:FOLLOWS]->(b)
    OPTIONAL MATCH (b)-[bFollowsC:FOLLOWS]->(c)
    RETURN DISTINCT
      c.userId as userId,
      c.screenName as screenName,
      c.name as name,
      c.profileImageUrl as profileImageUrl,
      c.description as description,
      c.location as location,
      c.url as url,
      c.followersCount as followersCount,
      c.followingCount as followingCount,
      c.verified as verified,
      c.verificationType as verificationType,
      c.listedCount as listedCount,
      c.createdAt as createdAt,
      c.vibe as vibe,
      c.department as department,
      c.lastUpdated as lastUpdated,
      x.userId as sharedOrgUserId,
      x.screenName as sharedOrgScreenName,
      x.name as sharedOrgName,
      type(cRel) as cRelType,
      type(bRel) as bRelType,
      (cFollowsB IS NOT NULL AND bFollowsC IS NOT NULL) as isReciprocal
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    // Group by user and collect all org connections
    const userMap = new Map<string, any>()

    for (const record of results) {
      if (!userMap.has(record.userId)) {
        userMap.set(record.userId, {
          ...record,
          orgConnections: [],
          relationshipTypes: new Set<OrgRelationType>(),
        })
      }
      const user = userMap.get(record.userId)!
      user.orgConnections.push({
        orgUserId: record.sharedOrgUserId,
        orgScreenName: record.sharedOrgScreenName,
        orgName: record.sharedOrgName,
        userRelationType: record.cRelType as OrgRelationType,
        prospectRelationType: record.bRelType as OrgRelationType,
        matchSource: 'prospect_direct' as const,
      })
      user.relationshipTypes.add(record.cRelType as OrgRelationType)
    }

    return Array.from(userMap.values()).map(record => {
      const { score, breakdown } = calculateEnhancedScore(
        'org_direct',
        record,
        Array.from(record.relationshipTypes),
        { multipleOrgConnections: record.orgConnections.length, isReciprocal: record.isReciprocal }
      )
      return {
        userId: record.userId,
        screenName: record.screenName,
        name: record.name,
        profileImageUrl: record.profileImageUrl,
        description: record.description,
        location: record.location,
        url: record.url,
        followersCount: record.followersCount || 0,
        followingCount: record.followingCount || 0,
        verified: Boolean(record.verified),
        verificationType: record.verificationType,
        listedCount: record.listedCount || 0,
        createdAt: record.createdAt,
        vibe: record.vibe,
        department: record.department,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        connectionType: 'org_direct' as ConnectionType,
        relevancyScore: score,
        scoreBreakdown: breakdown,
        orgConnections: record.orgConnections,
        sharedOrg: record.orgConnections[0] ? {
          userId: record.orgConnections[0].orgUserId,
          screenName: record.orgConnections[0].orgScreenName,
          name: record.orgConnections[0].orgName,
        } : undefined,
        isReciprocal: record.isReciprocal,
      }
    })
  } catch (error: any) {
    console.error('Error in findCBasedOrgDirect:', error.message)
    return []
  }
}

// 3. C-based Org Indirect: C follows A, C—[org rel]—X—[org rel]—Y, C↔Y mutual, Y↔B mutual
export async function findCBasedOrgIndirect(
  aScreenName: string,
  bScreenName: string
): Promise<EnhancedMutualConnection[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (c:User)-[:FOLLOWS]->(a)
    WHERE c <> a AND c <> b
    MATCH (c)-[cRel${ORG_REL_PATTERN}]->(x:User)
    MATCH (y:User)-[yRel${ORG_REL_PATTERN}]->(x)
    WHERE c <> y
    // C ↔ Y mutual follow
    MATCH (c)-[:FOLLOWS]->(y)
    MATCH (y)-[:FOLLOWS]->(c)
    // Y ↔ B mutual follow
    MATCH (y)-[:FOLLOWS]->(b)
    MATCH (b)-[:FOLLOWS]->(y)
    // Check C↔B reciprocity
    OPTIONAL MATCH (c)-[cFollowsB:FOLLOWS]->(b)
    OPTIONAL MATCH (b)-[bFollowsC:FOLLOWS]->(c)
    RETURN DISTINCT
      c.userId as userId,
      c.screenName as screenName,
      c.name as name,
      c.profileImageUrl as profileImageUrl,
      c.description as description,
      c.location as location,
      c.url as url,
      c.followersCount as followersCount,
      c.followingCount as followingCount,
      c.verified as verified,
      c.verificationType as verificationType,
      c.listedCount as listedCount,
      c.createdAt as createdAt,
      c.vibe as vibe,
      c.department as department,
      c.lastUpdated as lastUpdated,
      x.userId as sharedOrgUserId,
      x.screenName as sharedOrgScreenName,
      x.name as sharedOrgName,
      y.userId as intermediaryUserId,
      y.screenName as intermediaryScreenName,
      y.name as intermediaryName,
      type(cRel) as cRelType,
      type(yRel) as yRelType,
      (cFollowsB IS NOT NULL AND bFollowsC IS NOT NULL) as isReciprocal
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    // Group by user
    const userMap = new Map<string, any>()

    for (const record of results) {
      if (!userMap.has(record.userId)) {
        userMap.set(record.userId, {
          ...record,
          orgConnections: [],
          relationshipTypes: new Set<OrgRelationType>(),
        })
      }
      const user = userMap.get(record.userId)!
      user.orgConnections.push({
        orgUserId: record.sharedOrgUserId,
        orgScreenName: record.sharedOrgScreenName,
        orgName: record.sharedOrgName,
        userRelationType: record.cRelType as OrgRelationType,
        prospectRelationType: record.yRelType as OrgRelationType,
        matchSource: 'prospect_following' as const,
        viaUser: record.intermediaryScreenName,
      })
      user.relationshipTypes.add(record.cRelType as OrgRelationType)
    }

    return Array.from(userMap.values()).map(record => {
      const { score, breakdown } = calculateEnhancedScore(
        'org_indirect',
        record,
        Array.from(record.relationshipTypes),
        { multipleOrgConnections: record.orgConnections.length, isReciprocal: record.isReciprocal }
      )
      return {
        userId: record.userId,
        screenName: record.screenName,
        name: record.name,
        profileImageUrl: record.profileImageUrl,
        description: record.description,
        location: record.location,
        url: record.url,
        followersCount: record.followersCount || 0,
        followingCount: record.followingCount || 0,
        verified: Boolean(record.verified),
        verificationType: record.verificationType,
        listedCount: record.listedCount || 0,
        createdAt: record.createdAt,
        vibe: record.vibe,
        department: record.department,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        connectionType: 'org_indirect' as ConnectionType,
        relevancyScore: score,
        scoreBreakdown: breakdown,
        orgConnections: record.orgConnections,
        sharedOrg: {
          userId: record.sharedOrgUserId,
          screenName: record.sharedOrgScreenName,
          name: record.sharedOrgName,
        },
        intermediary: {
          userId: record.intermediaryUserId,
          screenName: record.intermediaryScreenName,
          name: record.intermediaryName,
        },
        isReciprocal: record.isReciprocal,
      }
    })
  } catch (error: any) {
    console.error('Error in findCBasedOrgIndirect:', error.message)
    return []
  }
}

// 4. C-based Shared Third Party: C follows A, C—[works_at]—OrgC, ThirdParty—[INVESTED_IN|AUDITS]—OrgC, ThirdParty—[INVESTED_IN|AUDITS]—OrgB, B—[works_at]—OrgB
export async function findCBasedSharedThirdParty(
  aScreenName: string,
  bScreenName: string
): Promise<EnhancedMutualConnection[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (c:User)-[:FOLLOWS]->(a)
    WHERE c <> a AND c <> b
    MATCH (c)-[:WORKS_AT]->(cOrg:User {vibe: 'organization'})
    MATCH (thirdParty:User)-[tpRel1:INVESTED_IN|AUDITS]->(cOrg)
    MATCH (thirdParty)-[tpRel2:INVESTED_IN|AUDITS]->(bOrg:User {vibe: 'organization'})
    WHERE cOrg <> bOrg
    MATCH (b)-[:WORKS_AT]->(bOrg)
    OPTIONAL MATCH (c)-[cFollowsB:FOLLOWS]->(b)
    OPTIONAL MATCH (b)-[bFollowsC:FOLLOWS]->(c)
    RETURN DISTINCT
      c.userId as userId,
      c.screenName as screenName,
      c.name as name,
      c.profileImageUrl as profileImageUrl,
      c.description as description,
      c.location as location,
      c.url as url,
      c.followersCount as followersCount,
      c.followingCount as followingCount,
      c.verified as verified,
      c.verificationType as verificationType,
      c.listedCount as listedCount,
      c.createdAt as createdAt,
      c.vibe as vibe,
      c.department as department,
      c.lastUpdated as lastUpdated,
      cOrg.userId as cOrgUserId,
      cOrg.screenName as cOrgScreenName,
      cOrg.name as cOrgName,
      thirdParty.userId as thirdPartyUserId,
      thirdParty.screenName as thirdPartyScreenName,
      thirdParty.name as thirdPartyName,
      bOrg.userId as bOrgUserId,
      bOrg.screenName as bOrgScreenName,
      bOrg.name as bOrgName,
      type(tpRel1) as tpRelType1,
      type(tpRel2) as tpRelType2,
      (cFollowsB IS NOT NULL AND bFollowsC IS NOT NULL) as isReciprocal
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    // Group by user
    const userMap = new Map<string, any>()

    for (const record of results) {
      if (!userMap.has(record.userId)) {
        userMap.set(record.userId, {
          ...record,
          relationshipTypes: new Set<OrgRelationType>(),
          thirdParties: new Set<string>(),
        })
      }
      const user = userMap.get(record.userId)!
      user.relationshipTypes.add(record.tpRelType1 as OrgRelationType)
      user.relationshipTypes.add(record.tpRelType2 as OrgRelationType)
      user.thirdParties.add(record.thirdPartyUserId)
    }

    return Array.from(userMap.values()).map(record => {
      const { score, breakdown } = calculateEnhancedScore(
        'shared_third_party',
        record,
        Array.from(record.relationshipTypes),
        { multipleOrgConnections: record.thirdParties.size, isReciprocal: record.isReciprocal }
      )
      return {
        userId: record.userId,
        screenName: record.screenName,
        name: record.name,
        profileImageUrl: record.profileImageUrl,
        description: record.description,
        location: record.location,
        url: record.url,
        followersCount: record.followersCount || 0,
        followingCount: record.followingCount || 0,
        verified: Boolean(record.verified),
        verificationType: record.verificationType,
        listedCount: record.listedCount || 0,
        createdAt: record.createdAt,
        vibe: record.vibe,
        department: record.department,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        connectionType: 'shared_third_party' as ConnectionType,
        relevancyScore: score,
        scoreBreakdown: breakdown,
        sharedOrg: {
          userId: record.cOrgUserId,
          screenName: record.cOrgScreenName,
          name: record.cOrgName,
        },
        thirdParty: {
          userId: record.thirdPartyUserId,
          screenName: record.thirdPartyScreenName,
          name: record.thirdPartyName,
        },
        isReciprocal: record.isReciprocal,
      }
    })
  } catch (error: any) {
    console.error('Error in findCBasedSharedThirdParty:', error.message)
    return []
  }
}

// 5. C-based Chain Affinity: C follows A, C—[works_at]—OrgC (chains includes X), B—[works_at]—OrgB (chains includes X)
export async function findCBasedChainAffinity(
  aScreenName: string,
  bScreenName: string
): Promise<EnhancedMutualConnection[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  // Note: This query assumes chains is stored as a JSON array string
  // We use string matching as a fallback if apoc is not available
  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (c:User)-[:FOLLOWS]->(a)
    WHERE c <> a AND c <> b
    MATCH (c)-[:WORKS_AT]->(cOrg:User {vibe: 'organization'})
    WHERE cOrg.chains IS NOT NULL AND cOrg.chains <> '[]'
    MATCH (b)-[:WORKS_AT]->(bOrg:User {vibe: 'organization'})
    WHERE bOrg.chains IS NOT NULL AND bOrg.chains <> '[]' AND cOrg <> bOrg
    OPTIONAL MATCH (c)-[cFollowsB:FOLLOWS]->(b)
    OPTIONAL MATCH (b)-[bFollowsC:FOLLOWS]->(c)
    RETURN DISTINCT
      c.userId as userId,
      c.screenName as screenName,
      c.name as name,
      c.profileImageUrl as profileImageUrl,
      c.description as description,
      c.location as location,
      c.url as url,
      c.followersCount as followersCount,
      c.followingCount as followingCount,
      c.verified as verified,
      c.verificationType as verificationType,
      c.listedCount as listedCount,
      c.createdAt as createdAt,
      c.vibe as vibe,
      c.department as department,
      c.lastUpdated as lastUpdated,
      cOrg.userId as cOrgUserId,
      cOrg.screenName as cOrgScreenName,
      cOrg.name as cOrgName,
      cOrg.chains as cOrgChains,
      bOrg.userId as bOrgUserId,
      bOrg.screenName as bOrgScreenName,
      bOrg.name as bOrgName,
      bOrg.chains as bOrgChains,
      (cFollowsB IS NOT NULL AND bFollowsC IS NOT NULL) as isReciprocal
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    // Group by user and calculate shared chains
    const userMap = new Map<string, any>()

    for (const record of results) {
      // Parse chains (handle both JSON arrays and comma-separated strings)
      let cChains: string[] = []
      let bChains: string[] = []

      try {
        cChains = typeof record.cOrgChains === 'string'
          ? JSON.parse(record.cOrgChains)
          : (record.cOrgChains || [])
      } catch { cChains = [] }

      try {
        bChains = typeof record.bOrgChains === 'string'
          ? JSON.parse(record.bOrgChains)
          : (record.bOrgChains || [])
      } catch { bChains = [] }

      // Find shared chains
      const sharedChains = cChains.filter(c => bChains.includes(c))

      if (sharedChains.length === 0) continue

      if (!userMap.has(record.userId)) {
        userMap.set(record.userId, {
          ...record,
          sharedChains: new Set<string>(),
          orgPairs: [],
        })
      }
      const user = userMap.get(record.userId)!
      sharedChains.forEach(c => user.sharedChains.add(c))
      user.orgPairs.push({ cOrg: record.cOrgScreenName, bOrg: record.bOrgScreenName })
    }

    return Array.from(userMap.values()).map(record => {
      const sharedChainsArray: string[] = Array.from(record.sharedChains as Set<string>)
      const { score, breakdown } = calculateEnhancedScore(
        'chain_affinity',
        record,
        ['WORKS_AT'],
        { multipleOrgConnections: sharedChainsArray.length, isReciprocal: record.isReciprocal }
      )
      return {
        userId: record.userId,
        screenName: record.screenName,
        name: record.name,
        profileImageUrl: record.profileImageUrl,
        description: record.description,
        location: record.location,
        url: record.url,
        followersCount: record.followersCount || 0,
        followingCount: record.followingCount || 0,
        verified: Boolean(record.verified),
        verificationType: record.verificationType,
        listedCount: record.listedCount || 0,
        createdAt: record.createdAt,
        vibe: record.vibe,
        department: record.department,
        lastUpdated: record.lastUpdated || new Date().toISOString(),
        connectionType: 'chain_affinity' as ConnectionType,
        relevancyScore: score,
        scoreBreakdown: breakdown,
        sharedChains: sharedChainsArray,
        sharedOrg: {
          userId: record.cOrgUserId,
          screenName: record.cOrgScreenName,
          name: record.cOrgName,
        },
        isReciprocal: record.isReciprocal,
      }
    })
  } catch (error: any) {
    console.error('Error in findCBasedChainAffinity:', error.message)
    return []
  }
}

// ============================================================================
// POV 2: A-BASED QUERIES (DIRECT CONNECTIONS)
// ============================================================================

// 1. A-based Org Direct: A—[org rel]—X, B—[org rel]—X
export async function findABasedOrgDirect(
  aScreenName: string,
  bScreenName: string
): Promise<ConnectionPath[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (a)-[aRel${ORG_REL_PATTERN}]->(x:User)
    MATCH (b)-[bRel${ORG_REL_PATTERN}]->(x)
    RETURN DISTINCT
      x.userId as orgUserId,
      x.screenName as orgScreenName,
      x.name as orgName,
      type(aRel) as aRelType,
      type(bRel) as bRelType,
      a.screenName as aScreenName,
      a.name as aName,
      b.screenName as bScreenName,
      b.name as bName
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    return results.map(record => ({
      type: 'org_direct' as ConnectionType,
      chain: [
        { userId: '', screenName: record.aScreenName, name: record.aName, role: 'you' as const, relationship: record.aRelType },
        { userId: record.orgUserId, screenName: record.orgScreenName, name: record.orgName, role: 'organization' as const },
        { userId: '', screenName: record.bScreenName, name: record.bName, role: 'prospect' as const, relationship: record.bRelType },
      ],
      strength: ENHANCED_SCORING.BASE_SCORES.org_direct *
        (ENHANCED_SCORING.RELATIONSHIP_MULTIPLIERS[record.aRelType as OrgRelationType] || 1.0),
    }))
  } catch (error: any) {
    console.error('Error in findABasedOrgDirect:', error.message)
    return []
  }
}

// 2. A-based Org Indirect: A—[org rel]—X—[org rel]—Y, A↔Y mutual, Y↔B mutual
export async function findABasedOrgIndirect(
  aScreenName: string,
  bScreenName: string
): Promise<ConnectionPath[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (a)-[aRel${ORG_REL_PATTERN}]->(x:User)
    MATCH (y:User)-[yRel${ORG_REL_PATTERN}]->(x)
    WHERE a <> y
    // A ↔ Y mutual follow
    MATCH (a)-[:FOLLOWS]->(y)
    MATCH (y)-[:FOLLOWS]->(a)
    // Y ↔ B mutual follow
    MATCH (y)-[:FOLLOWS]->(b)
    MATCH (b)-[:FOLLOWS]->(y)
    RETURN DISTINCT
      x.userId as orgUserId,
      x.screenName as orgScreenName,
      x.name as orgName,
      y.userId as intermediaryUserId,
      y.screenName as intermediaryScreenName,
      y.name as intermediaryName,
      type(aRel) as aRelType,
      type(yRel) as yRelType,
      a.screenName as aScreenName,
      a.name as aName,
      b.screenName as bScreenName,
      b.name as bName
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    return results.map(record => ({
      type: 'org_indirect' as ConnectionType,
      chain: [
        { userId: '', screenName: record.aScreenName, name: record.aName, role: 'you' as const, relationship: record.aRelType },
        { userId: record.orgUserId, screenName: record.orgScreenName, name: record.orgName, role: 'organization' as const },
        { userId: record.intermediaryUserId, screenName: record.intermediaryScreenName, name: record.intermediaryName, role: 'intermediary' as const, relationship: record.yRelType },
        { userId: '', screenName: record.bScreenName, name: record.bName, role: 'prospect' as const },
      ],
      strength: ENHANCED_SCORING.BASE_SCORES.org_indirect *
        (ENHANCED_SCORING.RELATIONSHIP_MULTIPLIERS[record.aRelType as OrgRelationType] || 1.0),
    }))
  } catch (error: any) {
    console.error('Error in findABasedOrgIndirect:', error.message)
    return []
  }
}

// 3. A-based Shared Third Party: A—[works_at]—OrgA, ThirdParty—[INVESTED_IN|AUDITS]—OrgA, ThirdParty—[INVESTED_IN|AUDITS]—OrgB, B—[works_at]—OrgB
export async function findABasedSharedThirdParty(
  aScreenName: string,
  bScreenName: string
): Promise<ConnectionPath[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (a)-[:WORKS_AT]->(aOrg:User {vibe: 'organization'})
    MATCH (thirdParty:User)-[tpRel1:INVESTED_IN|AUDITS]->(aOrg)
    MATCH (thirdParty)-[tpRel2:INVESTED_IN|AUDITS]->(bOrg:User {vibe: 'organization'})
    WHERE aOrg <> bOrg
    MATCH (b)-[:WORKS_AT]->(bOrg)
    RETURN DISTINCT
      aOrg.userId as aOrgUserId,
      aOrg.screenName as aOrgScreenName,
      aOrg.name as aOrgName,
      thirdParty.userId as thirdPartyUserId,
      thirdParty.screenName as thirdPartyScreenName,
      thirdParty.name as thirdPartyName,
      bOrg.userId as bOrgUserId,
      bOrg.screenName as bOrgScreenName,
      bOrg.name as bOrgName,
      type(tpRel1) as tpRelType1,
      type(tpRel2) as tpRelType2,
      a.screenName as aScreenName,
      a.name as aName,
      b.screenName as bScreenName,
      b.name as bName
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    return results.map(record => ({
      type: 'shared_third_party' as ConnectionType,
      chain: [
        { userId: '', screenName: record.aScreenName, name: record.aName, role: 'you' as const, relationship: 'WORKS_AT' },
        { userId: record.aOrgUserId, screenName: record.aOrgScreenName, name: record.aOrgName, role: 'organization' as const },
        { userId: record.thirdPartyUserId, screenName: record.thirdPartyScreenName, name: record.thirdPartyName, role: 'third_party' as const, relationship: record.tpRelType1 },
        { userId: record.bOrgUserId, screenName: record.bOrgScreenName, name: record.bOrgName, role: 'organization' as const, relationship: record.tpRelType2 },
        { userId: '', screenName: record.bScreenName, name: record.bName, role: 'prospect' as const, relationship: 'WORKS_AT' },
      ],
      strength: ENHANCED_SCORING.BASE_SCORES.shared_third_party *
        (ENHANCED_SCORING.RELATIONSHIP_MULTIPLIERS[record.tpRelType1 as OrgRelationType] || 1.0),
    }))
  } catch (error: any) {
    console.error('Error in findABasedSharedThirdParty:', error.message)
    return []
  }
}

// 4. A-based Chain Affinity: A—[works_at]—OrgA (chains includes X), B—[works_at]—OrgB (chains includes X)
export async function findABasedChainAffinity(
  aScreenName: string,
  bScreenName: string
): Promise<ConnectionPath[]> {
  const aLower = aScreenName.toLowerCase()
  const bLower = bScreenName.toLowerCase()

  const query = `
    MATCH (a:User)
    WHERE a.screenNameLower = $aLower OR toLower(a.screenName) = $aLower
    MATCH (b:User)
    WHERE b.screenNameLower = $bLower OR toLower(b.screenName) = $bLower
    MATCH (a)-[:WORKS_AT]->(aOrg:User {vibe: 'organization'})
    WHERE aOrg.chains IS NOT NULL AND aOrg.chains <> '[]'
    MATCH (b)-[:WORKS_AT]->(bOrg:User {vibe: 'organization'})
    WHERE bOrg.chains IS NOT NULL AND bOrg.chains <> '[]' AND aOrg <> bOrg
    RETURN DISTINCT
      aOrg.userId as aOrgUserId,
      aOrg.screenName as aOrgScreenName,
      aOrg.name as aOrgName,
      aOrg.chains as aOrgChains,
      bOrg.userId as bOrgUserId,
      bOrg.screenName as bOrgScreenName,
      bOrg.name as bOrgName,
      bOrg.chains as bOrgChains,
      a.screenName as aScreenName,
      a.name as aName,
      b.screenName as bScreenName,
      b.name as bName
  `

  try {
    const results = await runQuery(query, { aLower, bLower })

    const paths: ConnectionPath[] = []

    for (const record of results) {
      // Parse chains
      let aChains: string[] = []
      let bChains: string[] = []

      try {
        aChains = typeof record.aOrgChains === 'string'
          ? JSON.parse(record.aOrgChains)
          : (record.aOrgChains || [])
      } catch { aChains = [] }

      try {
        bChains = typeof record.bOrgChains === 'string'
          ? JSON.parse(record.bOrgChains)
          : (record.bOrgChains || [])
      } catch { bChains = [] }

      // Find shared chains
      const sharedChains = aChains.filter(c => bChains.includes(c))

      if (sharedChains.length === 0) continue

      paths.push({
        type: 'chain_affinity' as ConnectionType,
        chain: [
          { userId: '', screenName: record.aScreenName, name: record.aName, role: 'you' as const, relationship: 'WORKS_AT' },
          { userId: record.aOrgUserId, screenName: record.aOrgScreenName, name: record.aOrgName, role: 'organization' as const },
          { userId: record.bOrgUserId, screenName: record.bOrgScreenName, name: record.bOrgName, role: 'organization' as const },
          { userId: '', screenName: record.bScreenName, name: record.bName, role: 'prospect' as const, relationship: 'WORKS_AT' },
        ],
        strength: ENHANCED_SCORING.BASE_SCORES.chain_affinity * (1 + sharedChains.length * 0.2),
        sharedChains,
      })
    }

    return paths
  } catch (error: any) {
    console.error('Error in findABasedChainAffinity:', error.message)
    return []
  }
}

// ============================================================================
// MAIN ENTRY POINT: TWO-POV MUTUAL FINDING
// ============================================================================

export async function findTwoPOVMutuals(
  aScreenName: string, // logged-in user (A)
  bScreenName: string  // prospect (B)
): Promise<TwoPOVMutualsResult> {
  console.log(`=== TWO-POV MUTUAL FINDING ===`)
  console.log(`User (A): ${aScreenName}, Prospect (B): ${bScreenName}`)

  const errors: string[] = []

  // Run all 9 queries in parallel for maximum performance
  const startTime = Date.now()

  const [
    // C-based queries (5)
    cDirect,
    cOrgDirect,
    cOrgIndirect,
    cSharedThirdParty,
    cChainAffinity,
    // A-based queries (4)
    aOrgDirect,
    aOrgIndirect,
    aSharedThirdParty,
    aChainAffinity,
  ] = await Promise.all([
    // C-based
    findCBasedDirect(aScreenName, bScreenName).catch(e => { errors.push(`C-Direct: ${e.message}`); return [] }),
    findCBasedOrgDirect(aScreenName, bScreenName).catch(e => { errors.push(`C-OrgDirect: ${e.message}`); return [] }),
    findCBasedOrgIndirect(aScreenName, bScreenName).catch(e => { errors.push(`C-OrgIndirect: ${e.message}`); return [] }),
    findCBasedSharedThirdParty(aScreenName, bScreenName).catch(e => { errors.push(`C-SharedThirdParty: ${e.message}`); return [] }),
    findCBasedChainAffinity(aScreenName, bScreenName).catch(e => { errors.push(`C-ChainAffinity: ${e.message}`); return [] }),
    // A-based
    findABasedOrgDirect(aScreenName, bScreenName).catch(e => { errors.push(`A-OrgDirect: ${e.message}`); return [] }),
    findABasedOrgIndirect(aScreenName, bScreenName).catch(e => { errors.push(`A-OrgIndirect: ${e.message}`); return [] }),
    findABasedSharedThirdParty(aScreenName, bScreenName).catch(e => { errors.push(`A-SharedThirdParty: ${e.message}`); return [] }),
    findABasedChainAffinity(aScreenName, bScreenName).catch(e => { errors.push(`A-ChainAffinity: ${e.message}`); return [] }),
  ])

  const queryTime = Date.now() - startTime
  console.log(`All 9 queries completed in ${queryTime}ms`)

  // AGGREGATION: Merge all connection types per user instead of deduplicating
  // This ensures users with multiple connection types get proper scoring boost
  interface AggregatedUser {
    user: EnhancedMutualConnection
    connectionTypes: Set<ConnectionType>
    allOrgConnections: OrgConnection[]
    allSharedOrgs: Array<{ userId: string; screenName: string; name: string }>
    allIntermediaries: Array<{ userId: string; screenName: string; name: string }>
    allThirdParties: Array<{ userId: string; screenName: string; name: string }>
    allSharedChains: string[]
    allRelationshipTypes: Set<OrgRelationType>
    isReciprocal: boolean // Track if any connection has C↔B mutual follow
  }

  const userAggregationMap = new Map<string, AggregatedUser>()

  // Helper to aggregate a user's connection data
  const aggregateUser = (result: EnhancedMutualConnection) => {
    if (!userAggregationMap.has(result.userId)) {
      userAggregationMap.set(result.userId, {
        user: result,
        connectionTypes: new Set([result.connectionType]),
        allOrgConnections: result.orgConnections ? [...result.orgConnections] : [],
        allSharedOrgs: result.sharedOrg ? [result.sharedOrg] : [],
        allIntermediaries: result.intermediary ? [result.intermediary] : [],
        allThirdParties: result.thirdParty ? [result.thirdParty] : [],
        allSharedChains: result.sharedChains ? [...result.sharedChains] : [],
        allRelationshipTypes: new Set<OrgRelationType>(),
        isReciprocal: result.isReciprocal || false,
      })
      // Extract relationship types from org connections
      if (result.orgConnections) {
        for (const org of result.orgConnections) {
          userAggregationMap.get(result.userId)!.allRelationshipTypes.add(org.userRelationType)
        }
      }
    } else {
      const existing = userAggregationMap.get(result.userId)!
      existing.connectionTypes.add(result.connectionType)

      // Track reciprocity - if any connection has it, the user is reciprocal
      if (result.isReciprocal) {
        existing.isReciprocal = true
      }

      // Merge org connections (dedupe by orgUserId)
      if (result.orgConnections) {
        const existingOrgIds = new Set(existing.allOrgConnections.map(o => o.orgUserId))
        for (const org of result.orgConnections) {
          if (!existingOrgIds.has(org.orgUserId)) {
            existing.allOrgConnections.push(org)
          }
          existing.allRelationshipTypes.add(org.userRelationType)
        }
      }

      // Merge shared orgs (dedupe by userId)
      if (result.sharedOrg) {
        const existingOrgIds = new Set(existing.allSharedOrgs.map(o => o.userId))
        if (!existingOrgIds.has(result.sharedOrg.userId)) {
          existing.allSharedOrgs.push(result.sharedOrg)
        }
      }

      // Merge intermediaries (dedupe by userId)
      if (result.intermediary) {
        const existingIds = new Set(existing.allIntermediaries.map(i => i.userId))
        if (!existingIds.has(result.intermediary.userId)) {
          existing.allIntermediaries.push(result.intermediary)
        }
      }

      // Merge third parties (dedupe by userId)
      if (result.thirdParty) {
        const existingIds = new Set(existing.allThirdParties.map(t => t.userId))
        if (!existingIds.has(result.thirdParty.userId)) {
          existing.allThirdParties.push(result.thirdParty)
        }
      }

      // Merge shared chains (dedupe)
      if (result.sharedChains) {
        const existingChains = new Set(existing.allSharedChains)
        for (const chain of result.sharedChains) {
          if (!existingChains.has(chain)) {
            existing.allSharedChains.push(chain)
          }
        }
      }
    }
  }

  // Aggregate all C-based results
  for (const result of cDirect) aggregateUser(result)
  for (const result of cOrgDirect) aggregateUser(result)
  for (const result of cOrgIndirect) aggregateUser(result)
  for (const result of cSharedThirdParty) aggregateUser(result)
  for (const result of cChainAffinity) aggregateUser(result)

  // Build final aggregated results with recalculated scores
  const allIntroducers: EnhancedMutualConnection[] = []

  userAggregationMap.forEach((aggregated, _userId) => {
    const connectionTypesArray: ConnectionType[] = Array.from(aggregated.connectionTypes)
    const relationshipTypesArray: OrgRelationType[] = Array.from(aggregated.allRelationshipTypes)

    // Recalculate score based on ALL connection types
    const { score, breakdown } = calculateAggregatedScore(
      connectionTypesArray,
      aggregated.user,
      relationshipTypesArray,
      {
        totalOrgConnections: aggregated.allOrgConnections.length,
        lastUpdated: aggregated.user.lastUpdated,
        isReciprocal: aggregated.isReciprocal,
      }
    )

    // Use the "best" connection type as the primary (for backwards compat)
    // Priority: direct > org_direct > org_indirect > shared_third_party > chain_affinity
    const priorityOrder: ConnectionType[] = ['direct', 'org_direct', 'org_indirect', 'shared_third_party', 'chain_affinity']
    const primaryType = priorityOrder.find(t => aggregated.connectionTypes.has(t)) || connectionTypesArray[0]

    allIntroducers.push({
      ...aggregated.user,
      connectionType: primaryType,
      relevancyScore: score,
      scoreBreakdown: breakdown,
      // Aggregated fields
      connectionTypes: connectionTypesArray,
      allOrgConnections: aggregated.allOrgConnections.length > 0 ? aggregated.allOrgConnections : undefined,
      allSharedOrgs: aggregated.allSharedOrgs.length > 0 ? aggregated.allSharedOrgs : undefined,
      allIntermediaries: aggregated.allIntermediaries.length > 0 ? aggregated.allIntermediaries : undefined,
      allThirdParties: aggregated.allThirdParties.length > 0 ? aggregated.allThirdParties : undefined,
      allSharedChains: aggregated.allSharedChains.length > 0 ? aggregated.allSharedChains : undefined,
      // Keep original single fields for backwards compat
      orgConnections: aggregated.allOrgConnections.length > 0 ? aggregated.allOrgConnections : undefined,
      sharedOrg: aggregated.allSharedOrgs[0],
      intermediary: aggregated.allIntermediaries[0],
      thirdParty: aggregated.allThirdParties[0],
      sharedChains: aggregated.allSharedChains.length > 0 ? aggregated.allSharedChains : undefined,
      isReciprocal: aggregated.isReciprocal,
    })
  })

  // Sort by aggregated score (highest first)
  allIntroducers.sort((a, b) => b.relevancyScore - a.relevancyScore)

  // Build category arrays from aggregated results (for API backwards compat)
  const categorizedDirect = allIntroducers.filter(u => u.connectionTypes?.includes('direct'))
  const categorizedOrgDirect = allIntroducers.filter(u => u.connectionTypes?.includes('org_direct'))
  const categorizedOrgIndirect = allIntroducers.filter(u => u.connectionTypes?.includes('org_indirect'))
  const categorizedSharedThirdParty = allIntroducers.filter(u => u.connectionTypes?.includes('shared_third_party'))
  const categorizedChainAffinity = allIntroducers.filter(u => u.connectionTypes?.includes('chain_affinity'))

  // Count direct connections
  const directConnectionsCount =
    aOrgDirect.length +
    aOrgIndirect.length +
    aSharedThirdParty.length +
    aChainAffinity.length

  // Count users with multiple connection types
  const multiTypeUsers = allIntroducers.filter(u => (u.connectionTypes?.length || 0) > 1).length

  console.log(`=== TWO-POV RESULTS ===`)
  console.log(`C-based introducers: ${allIntroducers.length} (${multiTypeUsers} with multiple connection types)`)
  console.log(`  - Direct: ${categorizedDirect.length}`)
  console.log(`  - Org Direct: ${categorizedOrgDirect.length}`)
  console.log(`  - Org Indirect: ${categorizedOrgIndirect.length}`)
  console.log(`  - Shared Third Party: ${categorizedSharedThirdParty.length}`)
  console.log(`  - Chain Affinity: ${categorizedChainAffinity.length}`)
  console.log(`A-based direct connections: ${directConnectionsCount}`)
  console.log(`  - Org Direct: ${aOrgDirect.length}`)
  console.log(`  - Org Indirect: ${aOrgIndirect.length}`)
  console.log(`  - Shared Third Party: ${aSharedThirdParty.length}`)
  console.log(`  - Chain Affinity: ${aChainAffinity.length}`)

  return {
    introducers: {
      direct: categorizedDirect,
      orgDirect: categorizedOrgDirect,
      orgIndirect: categorizedOrgIndirect,
      sharedThirdParty: categorizedSharedThirdParty,
      chainAffinity: categorizedChainAffinity,
      combined: allIntroducers,
    },
    directConnections: {
      orgDirect: aOrgDirect,
      orgIndirect: aOrgIndirect,
      sharedThirdParty: aSharedThirdParty,
      chainAffinity: aChainAffinity,
    },
    counts: {
      introducers: allIntroducers.length,
      directConnections: directConnectionsCount,
    },
    partialResults: errors.length > 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Calculate differences between two arrays of IDs
export function calculateConnectionDifferences(currentIds: string[], newIds: string[]): {
  toAdd: string[],
  toRemove: string[]
} {
  const currentSet = new Set(currentIds)
  const newSet = new Set(newIds)
  
  const toAdd = newIds.filter(id => !currentSet.has(id))
  const toRemove = currentIds.filter(id => !newSet.has(id))
  
  return { toAdd, toRemove }
}

// Pre-filter duplicate relationships before database operations
function deduplicateRelationships<T extends {userId: string, orgUserId: string}>(relationships: T[]): T[] {
  const seen = new Set<string>()
  return relationships.filter(rel => {
    const key = `${rel.userId}|${rel.orgUserId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// Create FOLLOWS relationships for specific user IDs only (optimized)
export async function addFollowsRelationships(relationships: Array<{followerUserId: string, followingUserId: string}>): Promise<void> {
  if (relationships.length === 0) return

  // Deduplicate relationships first
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel => [`${rel.followerUserId}|${rel.followingUserId}`, rel])).values()
  )

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(uniqueRelationships.length / batchSize)

  console.log(`📎 Adding ${uniqueRelationships.length} FOLLOWS relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (follower:User {userId: rel.followerUserId})
    MATCH (following:User {userId: rel.followingUserId})
    MERGE (follower)-[:FOLLOWS]->(following)
  `

  // Process batches in parallel groups
  let successCount = 0

  for (let i = 0; i < uniqueRelationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < uniqueRelationships.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, uniqueRelationships.length)
      const batch = uniqueRelationships.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then(() => batch.length)
          .catch((error: any) => {
            console.error(`❌ Relationship batch failed:`, error.message)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    successCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Added ${successCount} FOLLOWS relationships`)
}

// Remove FOLLOWS relationships for specific user IDs only - PARALLEL VERSION
export async function removeFollowsRelationships(relationships: Array<{followerUserId: string, followingUserId: string}>): Promise<void> {
  if (relationships.length === 0) return

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(relationships.length / batchSize)

  console.log(`🗑️ Removing ${relationships.length} FOLLOWS relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (follower:User {userId: rel.followerUserId})-[r:FOLLOWS]->(following:User {userId: rel.followingUserId})
    DELETE r
  `

  // Process batches in parallel groups
  let removedCount = 0

  for (let i = 0; i < relationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < relationships.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, relationships.length)
      const batch = relationships.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then(() => batch.length)
          .catch((error: any) => {
            console.error(`❌ Remove batch failed:`, error.message)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    removedCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Removed ${removedCount} FOLLOWS relationships`)
}

// Incrementally update follower relationships (who follows this user)
export async function incrementalUpdateFollowers(userId: string, newFollowerUsers: TwitterApiUser[]): Promise<{added: number, removed: number}> {
  console.log(`=== INCREMENTAL FOLLOWER UPDATE FOR ${userId} ===`)

  // Get current follower IDs from Neo4j (inlined query)
  const followerQuery = `
    MATCH (follower:User)-[:FOLLOWS]->(u:User {userId: $userId})
    RETURN follower.userId as followerId
  `
  const followerResults = await runQuery(followerQuery, { userId })
  const currentFollowerIds = followerResults.map(record => record.followerId)
  const newFollowerIds = newFollowerUsers.map(user => user.id_str || user.id)

  console.log(`Current followers in Neo4j: ${currentFollowerIds.length}`)
  console.log(`New followers from API: ${newFollowerIds.length}`)

  // Calculate differences
  const { toAdd, toRemove } = calculateConnectionDifferences(currentFollowerIds, newFollowerIds)

  console.log(`Followers to add: ${toAdd.length}`)
  console.log(`Followers to remove: ${toRemove.length}`)

  // Create or update new follower users first
  const newFollowersToAdd = newFollowerUsers.filter(user => toAdd.includes(user.id_str || user.id))
  if (newFollowersToAdd.length > 0) {
    const neo4jUsers = newFollowersToAdd.map(user => transformToNeo4jUser(user))
    await createOrUpdateUsersWithScreenNameMergeBatch(neo4jUsers)
  }

  // Add new follower relationships
  const relationshipsToAdd = toAdd.map(followerId => ({
    followerUserId: followerId,
    followingUserId: userId
  }))
  await addFollowsRelationships(relationshipsToAdd)

  // Remove old follower relationships
  const relationshipsToRemove = toRemove.map(followerId => ({
    followerUserId: followerId,
    followingUserId: userId
  }))
  await removeFollowsRelationships(relationshipsToRemove)

  console.log(`Incremental follower update complete: +${toAdd.length}, -${toRemove.length}`)
  return { added: toAdd.length, removed: toRemove.length }
}

// Incrementally update following relationships (who this user follows)
export async function incrementalUpdateFollowings(userId: string, newFollowingUsers: TwitterApiUser[]): Promise<{added: number, removed: number}> {
  console.log(`=== INCREMENTAL FOLLOWING UPDATE FOR ${userId} ===`)

  // Get current following IDs from Neo4j (inlined query)
  const followingQuery = `
    MATCH (u:User {userId: $userId})-[:FOLLOWS]->(following:User)
    RETURN following.userId as followingId
  `
  const followingResults = await runQuery(followingQuery, { userId })
  const currentFollowingIds = followingResults.map(record => record.followingId)
  const newFollowingIds = newFollowingUsers.map(user => user.id_str || user.id)

  console.log(`Current followings in Neo4j: ${currentFollowingIds.length}`)
  console.log(`New followings from API: ${newFollowingIds.length}`)

  // Calculate differences
  const { toAdd, toRemove } = calculateConnectionDifferences(currentFollowingIds, newFollowingIds)

  console.log(`Followings to add: ${toAdd.length}`)
  console.log(`Followings to remove: ${toRemove.length}`)

  // Create or update new following users first
  const newFollowingsToAdd = newFollowingUsers.filter(user => toAdd.includes(user.id_str || user.id))
  if (newFollowingsToAdd.length > 0) {
    const neo4jUsers = newFollowingsToAdd.map(user => transformToNeo4jUser(user))
    await createOrUpdateUsersWithScreenNameMergeBatch(neo4jUsers)
  }

  // Add new following relationships
  const relationshipsToAdd = toAdd.map(followingId => ({
    followerUserId: userId,
    followingUserId: followingId
  }))
  await addFollowsRelationships(relationshipsToAdd)

  // Remove old following relationships
  const relationshipsToRemove = toRemove.map(followingId => ({
    followerUserId: userId,
    followingUserId: followingId
  }))
  await removeFollowsRelationships(relationshipsToRemove)
  
  console.log(`Incremental following update complete: +${toAdd.length}, -${toRemove.length}`)
  return { added: toAdd.length, removed: toRemove.length }
}

// Check if organization has following data
export async function hasFollowingData(orgUserId: string): Promise<boolean> {
  console.log(`🔍 [Neo4j] Checking following data for user: ${orgUserId}`)
  const query = `
    MATCH (org:User {userId: $orgUserId})-[:FOLLOWS]->(:User)
    RETURN count(*) > 0 as hasFollowings
  `
  
  const results = await runQuery(query, { orgUserId })
  const hasFollowings = results[0]?.hasFollowings || false
  console.log(`🔍 [Neo4j] User ${orgUserId} has followings: ${hasFollowings}`)
  return hasFollowings
}

// Get organization's following users (filtered for potential affiliates)
export async function getOrganizationFollowingUsers(orgUserId: string): Promise<Neo4jUser[]> {
  console.log(`🔍 [Neo4j] Fetching following users for organization: ${orgUserId}`)
  const query = `
    MATCH (org:User {userId: $orgUserId})-[:FOLLOWS]->(following:User)
    RETURN following
    ORDER BY following.followersCount DESC
  `
  
  const results = await runQuery(query, { orgUserId })
  const followingUsers = results.map(record => record.following.properties)
  console.log(`✅ [Neo4j] Retrieved ${followingUsers.length} following users for organization ${orgUserId}`)
  return followingUsers
}

// Convert Twitter API user to Neo4j format with organization flag
// Note: Organizations are stored as User nodes with vibe='organization'
export function transformToNeo4jOrganization(apiUser: TwitterApiUser): Neo4jUser {
  return {
    userId: apiUser.id_str || apiUser.id,
    screenName: apiUser.screen_name,
    name: apiUser.name,
    profileImageUrl: apiUser.profile_image_url_https || undefined,
    description: apiUser.description || undefined,
    location: apiUser.location || undefined,
    url: apiUser.url || undefined,
    followersCount: apiUser.followers_count || 0,
    followingCount: apiUser.friends_count || 0,
    verified: Boolean(apiUser.verified),
    lastUpdated: new Date().toISOString(),
    createdAt: apiUser.created_at || undefined,
    listedCount: apiUser.listed_count || 0,
    statusesCount: apiUser.statuses_count || 0,
    favouritesCount: apiUser.favourites_count || 0,
    protected: Boolean(apiUser.protected),
    canDm: Boolean(apiUser.can_dm),
    profileBannerUrl: apiUser.profile_banner_url || undefined,
    verificationType: apiUser.verification_info?.type || undefined,
    verificationReason: apiUser.verification_info?.reason || undefined,
    vibe: 'organization', // Mark as organization using vibe field
    department: undefined,      // Not applicable for organizations
    // Organization classification fields - set to undefined by default, updated by classifier
    org_type: undefined,
    org_subtype: undefined,
    web3_focus: undefined
  }
}

// Create multiple WORKS_AT relationships in batch with parallel processing
export async function addWorksAtRelationships(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  // Deduplicate relationships based on screenNames
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.userScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(uniqueRelationships.length / batchSize)

  console.log(`📝 Adding ${uniqueRelationships.length} WORKS_AT relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(rel.userScreenName)
    MATCH (o:User)
    WHERE toLower(o.screenName) = toLower(rel.orgScreenName)
    MERGE (u)-[:WORKS_AT]->(o)
    RETURN u.screenName as userScreenName, o.screenName as orgScreenName
  `

  let successCount = 0

  for (let i = 0; i < uniqueRelationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < uniqueRelationships.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, uniqueRelationships.length)
      const batch = uniqueRelationships.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then((results) => results.length)
          .catch((error: any) => {
            console.error(`❌ WORKS_AT batch failed:`, error.message)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    successCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Added ${successCount} WORKS_AT relationships`)
}

// Create multiple WORKED_AT relationships in batch with parallel processing
export async function addWorkedAtRelationships(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  // Deduplicate relationships based on screenNames
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.userScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(uniqueRelationships.length / batchSize)

  console.log(`📝 Adding ${uniqueRelationships.length} WORKED_AT relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(rel.userScreenName)
    MATCH (o:User)
    WHERE toLower(o.screenName) = toLower(rel.orgScreenName)
    MERGE (u)-[:WORKED_AT]->(o)
    RETURN u.screenName as userScreenName, o.screenName as orgScreenName
  `

  let successCount = 0

  for (let i = 0; i < uniqueRelationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < uniqueRelationships.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, uniqueRelationships.length)
      const batch = uniqueRelationships.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then((results) => results.length)
          .catch((error: any) => {
            console.error(`❌ WORKED_AT batch failed:`, error.message)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    successCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Added ${successCount} WORKED_AT relationships`)
}

// Create multiple MEMBER_OF relationships in batch with parallel processing
export async function addMemberOfRelationships(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  // Deduplicate relationships based on screenNames
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.userScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(uniqueRelationships.length / batchSize)

  console.log(`📝 Adding ${uniqueRelationships.length} MEMBER_OF relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(rel.userScreenName)
    MATCH (o:User)
    WHERE toLower(o.screenName) = toLower(rel.orgScreenName)
    MERGE (u)-[:MEMBER_OF]->(o)
    RETURN u.screenName as userScreenName, o.screenName as orgScreenName
  `

  let successCount = 0

  for (let i = 0; i < uniqueRelationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && i + j * batchSize < uniqueRelationships.length; j++) {
      const batchStart = i + j * batchSize
      const batch = uniqueRelationships.slice(batchStart, batchStart + batchSize)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then(results => results.length)
          .catch(err => {
            console.error(`Batch ${Math.floor(batchStart / batchSize) + 1} MEMBER_OF failed:`, err)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    successCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Added ${successCount} MEMBER_OF relationships`)
}

// Create multiple AFFILIATED_WITH relationships in batch with parallel processing
export async function addAffiliateRelationships(relationships: Array<{orgUserId: string, affiliateUserId: string}>): Promise<void> {
  if (relationships.length === 0) return

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES
  const totalBatches = Math.ceil(relationships.length / batchSize)

  console.log(`📎 Adding ${relationships.length} AFFILIATED_WITH relationships in ${totalBatches} batches (${parallelBatches} parallel)...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (org:User {userId: rel.orgUserId})
    MATCH (affiliate:User {userId: rel.affiliateUserId})
    MERGE (affiliate)-[:AFFILIATED_WITH]->(org)
  `

  // Process batches in parallel groups
  let successCount = 0

  for (let i = 0; i < relationships.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<number>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < relationships.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, relationships.length)
      const batch = relationships.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(query, { relationships: batch })
          .then(() => batch.length)
          .catch((error: any) => {
            console.error(`❌ Affiliate batch failed:`, error.message)
            return 0
          })
      )
    }

    const results = await Promise.all(batchPromises)
    successCount += results.reduce((sum, count) => sum + count, 0)
  }

  console.log(`✅ Added ${successCount} AFFILIATED_WITH relationships`)
}

// ============================================================================
// ICP RELATIONSHIP FUNCTIONS
// These create relationships from ICP analysis data (competitors, investors, partners, auditors)
// ============================================================================

/**
 * Add bidirectional COMPETES_WITH relationships between organizations
 * Both orgs are marked as competitors of each other
 */
export async function addCompetitorRelationships(relationships: Array<{orgScreenName: string, competitorScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.orgScreenName.toLowerCase()}|${rel.competitorScreenName.toLowerCase()}`, rel]
    )).values()
  )

  console.log(`🏁 Adding ${uniqueRelationships.length} bidirectional COMPETES_WITH relationships...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower(rel.orgScreenName)
    MATCH (competitor:User)
    WHERE toLower(competitor.screenName) = toLower(rel.competitorScreenName)
    MERGE (org)-[:COMPETES_WITH]->(competitor)
    MERGE (competitor)-[:COMPETES_WITH]->(org)
    RETURN org.screenName as orgScreenName, competitor.screenName as competitorScreenName
  `

  const results = await runQuery(query, { relationships: uniqueRelationships })
  console.log(`✅ Added ${results.length} COMPETES_WITH relationship pairs`)
}

/**
 * Add bidirectional PARTNERS_WITH relationships between organizations
 * Both orgs are marked as partners of each other
 */
export async function addPartnerRelationships(relationships: Array<{orgScreenName: string, partnerScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.orgScreenName.toLowerCase()}|${rel.partnerScreenName.toLowerCase()}`, rel]
    )).values()
  )

  console.log(`🤝 Adding ${uniqueRelationships.length} bidirectional PARTNERS_WITH relationships...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower(rel.orgScreenName)
    MATCH (partner:User)
    WHERE toLower(partner.screenName) = toLower(rel.partnerScreenName)
    MERGE (org)-[:PARTNERS_WITH]->(partner)
    MERGE (partner)-[:PARTNERS_WITH]->(org)
    RETURN org.screenName as orgScreenName, partner.screenName as partnerScreenName
  `

  const results = await runQuery(query, { relationships: uniqueRelationships })
  console.log(`✅ Added ${results.length} PARTNERS_WITH relationship pairs`)
}

/**
 * Add INVESTED_IN relationships from investors to organizations
 * Direction: (investor)-[:INVESTED_IN]->(org)
 */
export async function addInvestorRelationships(relationships: Array<{investorScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.investorScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )

  console.log(`💰 Adding ${uniqueRelationships.length} INVESTED_IN relationships...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (investor:User)
    WHERE toLower(investor.screenName) = toLower(rel.investorScreenName)
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower(rel.orgScreenName)
    MERGE (investor)-[:INVESTED_IN]->(org)
    RETURN investor.screenName as investorScreenName, org.screenName as orgScreenName
  `

  const results = await runQuery(query, { relationships: uniqueRelationships })
  console.log(`✅ Added ${results.length} INVESTED_IN relationships`)
}

/**
 * Add AUDITS relationships from auditors to organizations
 * Direction: (auditor)-[:AUDITS]->(org)
 */
export async function addAuditorRelationships(relationships: Array<{auditorScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) return

  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel =>
      [`${rel.auditorScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )

  console.log(`🔒 Adding ${uniqueRelationships.length} AUDITS relationships...`)

  const query = `
    UNWIND $relationships AS rel
    MATCH (auditor:User)
    WHERE toLower(auditor.screenName) = toLower(rel.auditorScreenName)
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower(rel.orgScreenName)
    MERGE (auditor)-[:AUDITS]->(org)
    RETURN auditor.screenName as auditorScreenName, org.screenName as orgScreenName
  `

  const results = await runQuery(query, { relationships: uniqueRelationships })
  console.log(`✅ Added ${results.length} AUDITS relationships`)
}

/**
 * Find a matching username in the database using fuzzy matching
 * Helps correct hallucinated usernames from AI analysis
 *
 * Matching strategy (in order of preference):
 * 1. Exact match (case-insensitive)
 * 2. Username contains the search term (e.g., "messaricrypto" contains "messari")
 * 3. Search term contains the username
 * 4. Normalized match (remove underscores, compare)
 *
 * @param searchUsername - The username to search for (potentially hallucinated)
 * @returns The best matching username from the database, or null if no good match
 */
export async function findMatchingUsername(searchUsername: string): Promise<string | null> {
  const normalized = searchUsername.toLowerCase().trim()

  // Strategy 1: Exact match
  const exactMatch = await getUserByScreenName(normalized)
  if (exactMatch) {
    return exactMatch.screenName
  }

  // Strategy 2 & 3: Partial matching using database search
  // Find usernames where:
  // - The DB username contains our search term
  // - Our search term contains the DB username
  // - Normalized versions match (without underscores/numbers)
  const query = `
    MATCH (u:User)
    WHERE u.screenName IS NOT NULL
    WITH u, toLower(u.screenName) as dbName, $searchTerm as searchTerm
    WHERE
      // DB username contains search term (e.g., "messaricrypto" contains "messari")
      dbName CONTAINS searchTerm
      // Search term contains DB username (e.g., "delphidigital" contains "delphi")
      OR searchTerm CONTAINS dbName
      // Normalized match: remove underscores and compare
      OR replace(dbName, '_', '') = replace(searchTerm, '_', '')
      OR replace(dbName, '_', '') CONTAINS replace(searchTerm, '_', '')
      OR replace(searchTerm, '_', '') CONTAINS replace(dbName, '_', '')
    RETURN u.screenName as screenName,
           dbName,
           // Score matches: exact normalized > contains > partial
           CASE
             WHEN replace(dbName, '_', '') = replace(searchTerm, '_', '') THEN 100
             WHEN dbName CONTAINS searchTerm THEN 80
             WHEN searchTerm CONTAINS dbName THEN 70
             WHEN replace(dbName, '_', '') CONTAINS replace(searchTerm, '_', '') THEN 60
             WHEN replace(searchTerm, '_', '') CONTAINS replace(dbName, '_', '') THEN 50
             ELSE 0
           END as score
    ORDER BY score DESC, size(dbName) ASC
    LIMIT 1
  `

  const results = await runQuery(query, { searchTerm: normalized })

  if (results.length > 0 && results[0].score >= 50) {
    const match = results[0].screenName
    console.log(`  🔍 Fuzzy match: "${searchUsername}" → "${match}" (score: ${results[0].score})`)
    return match
  }

  return null
}

/**
 * Process ICP relationships from analysis data
 * Uses fuzzy matching to find existing nodes before creating new ones
 * Creates nodes if they don't exist and builds appropriate relationships
 *
 * @param orgScreenName - The organization being analyzed
 * @param icpData - Object containing arrays of competitors, investors, partners, auditor (as @usernames)
 */
export async function processICPRelationships(
  orgScreenName: string,
  icpData: {
    competitors?: string[]
    investors?: string[]
    partners?: string[]
    auditor?: string[]
  }
): Promise<{
  created: { competitors: number, investors: number, partners: number, auditors: number }
  relationships: { competitors: number, investors: number, partners: number, auditors: number }
  matched: { competitors: number, investors: number, partners: number, auditors: number }
  skipped: { competitors: number, investors: number, partners: number, auditors: number }
}> {
  console.log(`\n🔗 Processing ICP relationships for @${orgScreenName}...`)

  const stats = {
    created: { competitors: 0, investors: 0, partners: 0, auditors: 0 },
    relationships: { competitors: 0, investors: 0, partners: 0, auditors: 0 },
    matched: { competitors: 0, investors: 0, partners: 0, auditors: 0 },
    skipped: { competitors: 0, investors: 0, partners: 0, auditors: 0 }
  }

  // Helper to normalize usernames (remove @ prefix)
  const normalizeUsername = (username: string): string =>
    username.replace(/^@/, '').toLowerCase().trim()

  // Helper to filter valid usernames
  const filterValidUsernames = (usernames: string[] | undefined): string[] => {
    if (!usernames || !Array.isArray(usernames)) return []
    return usernames
      .map(normalizeUsername)
      .filter(u => u.length > 0 && u !== orgScreenName.toLowerCase())
  }

  // Helper to resolve username with fuzzy matching and SocialAPI validation
  // Returns the resolved username, or null if user should be skipped (spam/not found)
  const resolveUsername = async (
    username: string,
    category: 'competitors' | 'investors' | 'partners' | 'auditors'
  ): Promise<string | null> => {
    // First try fuzzy matching to find existing user in database
    const matchedUsername = await findMatchingUsername(username)

    if (matchedUsername) {
      stats.matched[category]++
      return matchedUsername
    }

    // No match found - fetch from SocialAPI to validate before creating
    try {
      const socialApiUser = await fetchUserFromSocialAPI(username)

      if (!socialApiUser) {
        console.log(`  ⚠️ "${username}" not found on Twitter, skipping`)
        stats.skipped[category]++
        return null
      }

      // Check if it's a spam account (low followers AND low following)
      const followers = socialApiUser.followers_count || 0
      const following = socialApiUser.friends_count || 0
      if (followers < 10 && following < 10) {
        console.log(`  🚫 "${username}" is spam (followers: ${followers}, following: ${following}), skipping`)
        stats.skipped[category]++
        return null
      }

      // Valid user - create node with real data from SocialAPI
      const realUsername = socialApiUser.screen_name?.toLowerCase() || username
      await createOrUpdateUserWithScreenNameMerge(transformToNeo4jUser(socialApiUser))
      stats.created[category]++
      console.log(`  ✅ Created node for @${realUsername} (from SocialAPI)`)
      return realUsername

    } catch (error: any) {
      console.log(`  ⚠️ Failed to fetch "${username}" from SocialAPI: ${error.message}, skipping`)
      stats.skipped[category]++
      return null
    }
  }

  // Process competitors
  const competitors = filterValidUsernames(icpData.competitors)
  if (competitors.length > 0) {
    console.log(`  → Processing ${competitors.length} competitors...`)
    const resolvedCompetitors: string[] = []
    for (const competitor of competitors) {
      const resolved = await resolveUsername(competitor, 'competitors')
      if (resolved) resolvedCompetitors.push(resolved)
    }
    if (resolvedCompetitors.length > 0) {
      await addCompetitorRelationships(
        resolvedCompetitors.map(c => ({ orgScreenName, competitorScreenName: c }))
      )
      stats.relationships.competitors = resolvedCompetitors.length
    }
  }

  // Process investors
  const investors = filterValidUsernames(icpData.investors)
  if (investors.length > 0) {
    console.log(`  → Processing ${investors.length} investors...`)
    const resolvedInvestors: string[] = []
    for (const investor of investors) {
      const resolved = await resolveUsername(investor, 'investors')
      if (resolved) resolvedInvestors.push(resolved)
    }
    if (resolvedInvestors.length > 0) {
      await addInvestorRelationships(
        resolvedInvestors.map(i => ({ investorScreenName: i, orgScreenName }))
      )
      stats.relationships.investors = resolvedInvestors.length
    }
  }

  // Process partners
  const partners = filterValidUsernames(icpData.partners)
  if (partners.length > 0) {
    console.log(`  → Processing ${partners.length} partners...`)
    const resolvedPartners: string[] = []
    for (const partner of partners) {
      const resolved = await resolveUsername(partner, 'partners')
      if (resolved) resolvedPartners.push(resolved)
    }
    if (resolvedPartners.length > 0) {
      await addPartnerRelationships(
        resolvedPartners.map(p => ({ orgScreenName, partnerScreenName: p }))
      )
      stats.relationships.partners = resolvedPartners.length
    }
  }

  // Process auditors
  const auditors = filterValidUsernames(icpData.auditor)
  if (auditors.length > 0) {
    console.log(`  → Processing ${auditors.length} auditors...`)
    const resolvedAuditors: string[] = []
    for (const auditor of auditors) {
      const resolved = await resolveUsername(auditor, 'auditors')
      if (resolved) resolvedAuditors.push(resolved)
    }
    if (resolvedAuditors.length > 0) {
      await addAuditorRelationships(
        resolvedAuditors.map(a => ({ auditorScreenName: a, orgScreenName }))
      )
      stats.relationships.auditors = resolvedAuditors.length
    }
  }

  console.log(`✅ ICP relationships processed:`)
  console.log(`   Fuzzy matched: ${stats.matched.competitors} competitors, ${stats.matched.investors} investors, ${stats.matched.partners} partners, ${stats.matched.auditors} auditors`)
  console.log(`   Created nodes: ${stats.created.competitors} competitors, ${stats.created.investors} investors, ${stats.created.partners} partners, ${stats.created.auditors} auditors`)
  console.log(`   Skipped: ${stats.skipped.competitors} competitors, ${stats.skipped.investors} investors, ${stats.skipped.partners} partners, ${stats.skipped.auditors} auditors`)
  console.log(`   Relationships: ${stats.relationships.competitors} COMPETES_WITH, ${stats.relationships.investors} INVESTED_IN, ${stats.relationships.partners} PARTNERS_WITH, ${stats.relationships.auditors} AUDITS`)

  return stats
}

// Check if employment relationships already exist using screenName lookups
export async function checkExistingEmploymentRelationshipsScreenName(
  worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}>,
  workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}>,
  memberOfRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
): Promise<{
  existingWorksAt: Array<{userScreenName: string, orgScreenName: string}>
  existingWorkedAt: Array<{userScreenName: string, orgScreenName: string}>
  existingMemberOf: Array<{userScreenName: string, orgScreenName: string}>
}> {
  const allRelationships = [...worksAtRelationships, ...workedAtRelationships, ...memberOfRelationships]

  if (allRelationships.length === 0) {
    return { existingWorksAt: [], existingWorkedAt: [], existingMemberOf: [] }
  }

  const [worksAtResults, workedAtResults, memberOfResults] = await Promise.all([
    // Check WORKS_AT relationships
    worksAtRelationships.length > 0 ? runQuery(`
      UNWIND $relationships AS rel
      MATCH (u:User)-[:WORKS_AT]->(o:User)
      WHERE toLower(u.screenName) = toLower(rel.userScreenName)
        AND toLower(o.screenName) = toLower(rel.orgScreenName)
      RETURN u.screenName as userScreenName, o.screenName as orgScreenName
    `, { relationships: worksAtRelationships }) : [],

    // Check WORKED_AT relationships
    workedAtRelationships.length > 0 ? runQuery(`
      UNWIND $relationships AS rel
      MATCH (u:User)-[:WORKED_AT]->(o:User)
      WHERE toLower(u.screenName) = toLower(rel.userScreenName)
        AND toLower(o.screenName) = toLower(rel.orgScreenName)
      RETURN u.screenName as userScreenName, o.screenName as orgScreenName
    `, { relationships: workedAtRelationships }) : [],

    // Check MEMBER_OF relationships
    memberOfRelationships.length > 0 ? runQuery(`
      UNWIND $relationships AS rel
      MATCH (u:User)-[:MEMBER_OF]->(o:User)
      WHERE toLower(u.screenName) = toLower(rel.userScreenName)
        AND toLower(o.screenName) = toLower(rel.orgScreenName)
      RETURN u.screenName as userScreenName, o.screenName as orgScreenName
    `, { relationships: memberOfRelationships }) : []
  ])

  return {
    existingWorksAt: worksAtResults.map((r: any) => ({ userScreenName: r.userScreenName, orgScreenName: r.orgScreenName })),
    existingWorkedAt: workedAtResults.map((r: any) => ({ userScreenName: r.userScreenName, orgScreenName: r.orgScreenName })),
    existingMemberOf: memberOfResults.map((r: any) => ({ userScreenName: r.userScreenName, orgScreenName: r.orgScreenName }))
  }
}

// Check if AFFILIATED_WITH relationships already exist
export async function checkExistingAffiliateRelationships(relationships: Array<{orgUserId: string, affiliateUserId: string}>): Promise<Array<{orgUserId: string, affiliateUserId: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (affiliate:User {userId: rel.affiliateUserId})-[:AFFILIATED_WITH]->(org:User {userId: rel.orgUserId})
    RETURN rel.orgUserId as orgUserId, rel.affiliateUserId as affiliateUserId
  `
  
  const results = await runQuery(query, { relationships })
  return results.map(record => ({
    orgUserId: record.orgUserId,
    affiliateUserId: record.affiliateUserId
  }))
}

// Check if FOLLOWS relationships already exist
export async function checkExistingFollowsRelationships(relationships: Array<{followerUserId: string, followingUserId: string}>): Promise<Array<{followerUserId: string, followingUserId: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (follower:User {userId: rel.followerUserId})-[:FOLLOWS]->(following:User {userId: rel.followingUserId})
    RETURN rel.followerUserId as followerUserId, rel.followingUserId as followingUserId
  `
  
  const results = await runQuery(query, { relationships })
  return results.map(record => ({
    followerUserId: record.followerUserId,
    followingUserId: record.followingUserId
  }))
}

// Filter out existing relationships from a list
export function filterOutExistingRelationships<T extends {[key: string]: string}>(
  allRelationships: T[],
  existingRelationships: T[],
  keyFields: string[]
): T[] {
  const existingSet = new Set(
    existingRelationships.map(rel => 
      keyFields.map(field => rel[field]).join('|')
    )
  )
  
  return allRelationships.filter(rel => 
    !existingSet.has(keyFields.map(field => rel[field]).join('|'))
  )
}

// Batch fetch organizations from SocialAPI to avoid N+1 queries
export async function fetchOrganizationsBatch(usernames: string[]): Promise<TwitterApiUser[]> {
  if (usernames.length === 0) return []
  
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    console.error('[Config] SOCIALAPI_BEARER_TOKEN not configured')
    return []
  }

  const results: TwitterApiUser[] = []
  const batchSize = 10 // Conservative batch size for external API
  
  try {
    // Process in small batches to avoid overwhelming the API
    for (let i = 0; i < usernames.length; i += batchSize) {
      const batch = usernames.slice(i, i + batchSize)
      
      // Use Promise.allSettled for parallel requests within batch
      const batchPromises = batch.map(async (username) => {
        try {
          const response = await fetch(`https://api.socialapi.me/twitter/user/${username}`, {
            headers: {
              'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
              'Accept': 'application/json',
            }
          })

          if (response.ok) {
            const data = await response.json()
            return data
          } else {
            console.warn(`⚠️ SocialAPI returned ${response.status} for @${username}`)
            return null
          }
        } catch (error: any) {
          console.error(`❌ Error fetching @${username}:`, error.message)
          return null
        }
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      batchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        }
      })
      
      // Small delay between batches to be API-friendly
      if (i + batchSize < usernames.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
  } catch (error: any) {
    console.error('❌ Error in batch fetch:', error.message)
  }
  
  return results
}

// Single organization fetch (now uses batch function for consistency)
export async function fetchOrganizationFromSocialAPI(username: string): Promise<TwitterApiUser | null> {
  const results = await fetchOrganizationsBatch([username])
  return results.length > 0 ? results[0] : null
}

// Ultra-fast employment data processing with parallel operations
export async function processEmploymentData(profiles: any[]): Promise<void> {
  if (!profiles.length) return

  console.log(`🚀 Processing employment data for ${profiles.length} profiles`)
  const startTime = Date.now()

  // Extract all organization data in single pass
  const { orgUsernames, worksAtRelationships, workedAtRelationships, memberOfRelationships, departmentUpdates } = extractOrganizationData(profiles)

  console.log(`📊 Extracted data:`)
  console.log(`   - Unique organizations: ${orgUsernames.length}`)
  console.log(`   - WORKS_AT relationships: ${worksAtRelationships.length}`)
  console.log(`   - WORKED_AT relationships: ${workedAtRelationships.length}`)
  console.log(`   - MEMBER_OF relationships: ${memberOfRelationships.length}`)
  console.log(`   - Department updates: ${departmentUpdates.length}`)

  if (orgUsernames.length === 0) {
    console.log('❌ No organizations found to process')
    return
  }

  // Log some examples for debugging
  if (orgUsernames.length > 0) {
    console.log(`   Organizations: ${orgUsernames.slice(0, 3).join(', ')}${orgUsernames.length > 3 ? '...' : ''}`)
  }
  if (worksAtRelationships.length > 0) {
    console.log(`   Example WORKS_AT: @${worksAtRelationships[0].userScreenName} → @${worksAtRelationships[0].orgScreenName}`)
  }
  if (memberOfRelationships.length > 0) {
    console.log(`   Example MEMBER_OF: @${memberOfRelationships[0].userScreenName} → @${memberOfRelationships[0].orgScreenName}`)
  }

  // Parallel execution of all operations that don't have dependencies
  const operations = []

  // 1. Ensure organizations exist (this will create/update org nodes using screenName as primary key)
  operations.push(
    ensureOrganizationsExistOptimized(orgUsernames).then(orgMap => {
      console.log(`🗺️  Organization mapping complete: ${orgMap.size} organizations available`)

      // Now we can directly use the screenName-based relationships without conversion
      console.log(`🔗 Using direct screenName relationships:`)
      console.log(`   - WORKS_AT relationships: ${worksAtRelationships.length}`)
      console.log(`   - WORKED_AT relationships: ${workedAtRelationships.length}`)
      console.log(`   - MEMBER_OF relationships: ${memberOfRelationships.length}`)

      // Check for existing relationships to avoid duplicates
      return checkExistingEmploymentRelationshipsScreenName(worksAtRelationships, workedAtRelationships, memberOfRelationships)
        .then(({ existingWorksAt, existingWorkedAt, existingMemberOf }) => {
          console.log(`🔍 Existing relationships:`)
          console.log(`   - Existing WORKS_AT: ${existingWorksAt.length}`)
          console.log(`   - Existing WORKED_AT: ${existingWorkedAt.length}`)
          console.log(`   - Existing MEMBER_OF: ${existingMemberOf.length}`)

          // Filter out existing relationships
          const newWorksAt = worksAtRelationships.filter(rel =>
            !existingWorksAt.some(existing =>
              existing.userScreenName.toLowerCase() === rel.userScreenName.toLowerCase() &&
              existing.orgScreenName.toLowerCase() === rel.orgScreenName.toLowerCase()
            )
          )

          const newWorkedAt = workedAtRelationships.filter(rel =>
            !existingWorkedAt.some(existing =>
              existing.userScreenName.toLowerCase() === rel.userScreenName.toLowerCase() &&
              existing.orgScreenName.toLowerCase() === rel.orgScreenName.toLowerCase()
            )
          )

          const newMemberOf = memberOfRelationships.filter(rel =>
            !existingMemberOf.some(existing =>
              existing.userScreenName.toLowerCase() === rel.userScreenName.toLowerCase() &&
              existing.orgScreenName.toLowerCase() === rel.orgScreenName.toLowerCase()
            )
          )

          console.log(`📝 New relationships to create:`)
          console.log(`   - New WORKS_AT: ${newWorksAt.length}`)
          console.log(`   - New WORKED_AT: ${newWorkedAt.length}`)
          console.log(`   - New MEMBER_OF: ${newMemberOf.length}`)

          // Execute relationship operations in parallel
          const relationshipOps = []

          if (newWorksAt.length > 0) {
            console.log(`   → Adding ${newWorksAt.length} WORKS_AT relationships...`)
            relationshipOps.push(addWorksAtRelationships(newWorksAt))
          }

          if (newWorkedAt.length > 0) {
            console.log(`   → Adding ${newWorkedAt.length} WORKED_AT relationships...`)
            relationshipOps.push(addWorkedAtRelationships(newWorkedAt))
          }

          if (newMemberOf.length > 0) {
            console.log(`   → Adding ${newMemberOf.length} MEMBER_OF relationships...`)
            relationshipOps.push(addMemberOfRelationships(newMemberOf))
          }

          return Promise.all(relationshipOps).then(() => ({ newWorksAt, newWorkedAt, newMemberOf, existingWorksAt, existingWorkedAt, existingMemberOf }))
        })
    })
  )
  
  // 2. Update departments in parallel (need to convert to userId-based for now)
  if (departmentUpdates.length > 0) {
    console.log(`   → Converting ${departmentUpdates.length} department updates to userId-based...`)
    
    // Convert screenName-based department updates to userId-based
    const userIdDepartmentUpdates = await Promise.all(
      departmentUpdates.map(async (update) => {
        const userQuery = `
          MATCH (u:User)
          WHERE toLower(u.screenName) = toLower($screenName)
          RETURN u.userId as userId
          LIMIT 1
        `
        const result = await runQuery(userQuery, { screenName: update.userScreenName })
        return result.length > 0 ? { userId: result[0].userId, department: update.department } : null
      })
    )
    
    const validDepartmentUpdates = userIdDepartmentUpdates.filter(update => update !== null) as Array<{userId: string, department: string}>
    
    if (validDepartmentUpdates.length > 0) {
      console.log(`   → Updating ${validDepartmentUpdates.length} user departments...`)
      operations.push(updateUserDepartmentsOptimized(validDepartmentUpdates))
    }
  }
  
  // Execute all operations in parallel
  const results = await Promise.all(operations)
  const relationshipResults = results[0] as any
  
  const duration = Date.now() - startTime
  console.log(`✅ Employment data processing complete in ${duration}ms`)
  
  if (relationshipResults) {
    console.log(`📈 Final Results:`)
    console.log(`   - New WORKS_AT: ${relationshipResults.newWorksAt?.length || 0} (${relationshipResults.existingWorksAt?.length || 0} already existed)`)
    console.log(`   - New WORKED_AT: ${relationshipResults.newWorkedAt?.length || 0} (${relationshipResults.existingWorkedAt?.length || 0} already existed)`)
    console.log(`   - New MEMBER_OF: ${relationshipResults.newMemberOf?.length || 0} (${relationshipResults.existingMemberOf?.length || 0} already existed)`)
  }
  console.log(`   - Department updates: ${departmentUpdates.length}`)
}

// Extract all organization and employment data from profiles in a single pass
// Updated to handle flattened employment structure
export function extractOrganizationData(profiles: any[]): {
  orgUsernames: string[]
  worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}>
  workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}>
  memberOfRelationships: Array<{userScreenName: string, orgScreenName: string}>
  departmentUpdates: Array<{userScreenName: string, department: string}>
} {
  const orgUsernames = new Set<string>()
  const worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
  const workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
  const memberOfRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
  const departmentUpdates: Array<{userScreenName: string, department: string}> = []

  let profilesProcessed = 0
  let profilesWithEmploymentData = 0

  profiles.forEach(profile => {
    const userScreenName = profile.screen_name
    if (!userScreenName) return

    profilesProcessed++

    // Check for flattened employment data structure
    const employmentData = profile._employment_data
    if (!employmentData) {
      console.warn(`⚠️  Profile @${userScreenName} has no employment data, skipping...`)
      return
    }

    // Validate that employment data has at least one organization (current, past, or member_of)
    const hasCurrentOrgs = employmentData.current_organizations &&
                           Array.isArray(employmentData.current_organizations) &&
                           employmentData.current_organizations.length > 0

    const hasPastOrgs = employmentData.past_organizations &&
                        Array.isArray(employmentData.past_organizations) &&
                        employmentData.past_organizations.length > 0

    const hasMemberOf = employmentData.member_of &&
                        Array.isArray(employmentData.member_of) &&
                        employmentData.member_of.length > 0

    if (!hasCurrentOrgs && !hasPastOrgs && !hasMemberOf) {
      console.log(`ℹ️  Profile @${userScreenName} has empty employment data (no organizations to process)`)
      return
    }

    profilesWithEmploymentData++

    // Extract department from flattened structure
    if (employmentData.department) {
      departmentUpdates.push({
        userScreenName,
        department: employmentData.department
      })
    }

    // Current organizations from flattened structure
    if (employmentData.current_organizations && Array.isArray(employmentData.current_organizations)) {
      employmentData.current_organizations.forEach((org: string) => {
        const cleanOrg = org.replace(/^@/, '')
        if (cleanOrg && cleanOrg.length > 0) {
          orgUsernames.add(cleanOrg.toLowerCase())
          worksAtRelationships.push({ userScreenName, orgScreenName: cleanOrg })
        }
      })
    }

    // Past organizations from flattened structure
    if (employmentData.past_organizations && Array.isArray(employmentData.past_organizations)) {
      employmentData.past_organizations.forEach((org: string) => {
        const cleanOrg = org.replace(/^@/, '')
        if (cleanOrg && cleanOrg.length > 0) {
          orgUsernames.add(cleanOrg.toLowerCase())
          workedAtRelationships.push({ userScreenName, orgScreenName: cleanOrg })
        }
      })
    }

    // Member of (communities, NFT holders, ambiguous orgs)
    if (employmentData.member_of && Array.isArray(employmentData.member_of)) {
      employmentData.member_of.forEach((org: string) => {
        const cleanOrg = org.replace(/^@/, '')
        if (cleanOrg && cleanOrg.length > 0) {
          orgUsernames.add(cleanOrg.toLowerCase())
          memberOfRelationships.push({ userScreenName, orgScreenName: cleanOrg })
        }
      })
    }
  })

  console.log(`🔍 extractOrganizationData Summary:`)
  console.log(`   - Profiles processed: ${profilesProcessed}`)
  console.log(`   - Profiles with employment data: ${profilesWithEmploymentData}`)
  console.log(`   - Unique organizations found: ${orgUsernames.size}`)

  return {
    orgUsernames: Array.from(orgUsernames),
    worksAtRelationships,
    workedAtRelationships,
    memberOfRelationships,
    departmentUpdates
  }
}

// Check existing employment relationships in batch
export async function checkExistingEmploymentRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<{
  existingWorksAt: Array<{userId: string, orgUserId: string}>
  existingWorkedAt: Array<{userId: string, orgUserId: string}>
}> {
  if (relationships.length === 0) return { existingWorksAt: [], existingWorkedAt: [] }
  
  const [worksAtResults, workedAtResults] = await Promise.all([
    // Check WORKS_AT relationships
    runQuery(`
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})-[:WORKS_AT]->(o:User {userId: rel.orgUserId})
      RETURN rel.userId as userId, rel.orgUserId as orgUserId
    `, { relationships }),
    
    // Check WORKED_AT relationships  
    runQuery(`
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})-[:WORKED_AT]->(o:User {userId: rel.orgUserId})
      RETURN rel.userId as userId, rel.orgUserId as orgUserId
    `, { relationships })
  ])
  
  return {
    existingWorksAt: worksAtResults.map(r => ({ userId: r.userId, orgUserId: r.orgUserId })),
    existingWorkedAt: workedAtResults.map(r => ({ userId: r.userId, orgUserId: r.orgUserId }))
  }
}

// Filter out existing employment relationships to avoid redundant writes
export function filterOutExistingEmploymentRelationships(
  worksAtRelationships: Array<{userId: string, orgUserId: string}>,
  workedAtRelationships: Array<{userId: string, orgUserId: string}>,
  existingWorksAt: Array<{userId: string, orgUserId: string}>,
  existingWorkedAt: Array<{userId: string, orgUserId: string}>
): {
  newWorksAt: Array<{userId: string, orgUserId: string}>
  newWorkedAt: Array<{userId: string, orgUserId: string}>
} {
  const existingWorksAtSet = new Set(
    existingWorksAt.map(rel => `${rel.userId}|${rel.orgUserId}`)
  )
  const existingWorkedAtSet = new Set(
    existingWorkedAt.map(rel => `${rel.userId}|${rel.orgUserId}`)
  )
  
  const newWorksAt = worksAtRelationships.filter(rel => 
    !existingWorksAtSet.has(`${rel.userId}|${rel.orgUserId}`)
  )
  const newWorkedAt = workedAtRelationships.filter(rel => 
    !existingWorkedAtSet.has(`${rel.userId}|${rel.orgUserId}`)
  )
  
  return { newWorksAt, newWorkedAt }
}

// Optimized: Check which users need updates before upserting
export async function getStaleOrMissingUsers(users: Neo4jUser[], maxAgeHours: number = 1080): Promise<{
  missingUsers: Neo4jUser[],
  staleUsers: Neo4jUser[],
  upToDateUsers: Neo4jUser[]
}> {
  if (users.length === 0) {
    return { missingUsers: [], staleUsers: [], upToDateUsers: [] }
  }
  
  const userIds = users.map(u => u.userId)
  
  // Get existing users from database
  const query = `
    UNWIND $userIds AS userId
    OPTIONAL MATCH (u:User {userId: userId})
    RETURN userId, u
  `
  
  const results = await runQuery(query, { userIds })
  const existingUserMap = new Map<string, Neo4jUser>()
  
  results.forEach(record => {
    if (record.u?.properties) {
      existingUserMap.set(record.userId, record.u.properties)
    }
  })
  
  const missingUsers: Neo4jUser[] = []
  const staleUsers: Neo4jUser[] = []
  const upToDateUsers: Neo4jUser[] = []
  
  users.forEach(newUser => {
    const existingUser = existingUserMap.get(newUser.userId)
    
    if (!existingUser) {
      // User doesn't exist, needs to be created
      missingUsers.push(newUser)
    } else if (isUserDataStale(existingUser, maxAgeHours) || hasUserDataChanged(existingUser, newUser)) {
      // User exists but is stale or data has changed
      staleUsers.push(newUser)
    } else {
      // User is up-to-date
      upToDateUsers.push(newUser)
    }
  })
  
  return { missingUsers, staleUsers, upToDateUsers }
}

// New: Check if user data has actually changed (compare key fields)
export function hasUserDataChanged(existingUser: Neo4jUser, newUser: Neo4jUser): boolean {
  const keyFields = [
    'screenName', 'name', 'profileImageUrl', 'description', 'location', 'url',
    'followersCount', 'followingCount', 'verified', 'vibe'
  ]
  
  return keyFields.some(field => {
    const existing = (existingUser as any)[field]
    const newVal = (newUser as any)[field]
    return existing !== newVal
  })
}

// Optimized: Only update users that need updating
export async function createOrUpdateUsersOptimized(users: Neo4jUser[], maxAgeHours: number = 1080): Promise<{
  created: number,
  updated: number,
  skipped: number
}> {
  if (users.length === 0) {
    return { created: 0, updated: 0, skipped: 0 }
  }
  
  console.log(`🔍 Checking ${users.length} users for updates...`)
  
  // Check which users need updates
  const { missingUsers, staleUsers, upToDateUsers } = await getStaleOrMissingUsers(users, maxAgeHours)
  
  console.log(`📊 User analysis: ${missingUsers.length} missing, ${staleUsers.length} stale, ${upToDateUsers.length} up-to-date`)
  
  // Only process users that need updates
  const usersToUpdate = [...missingUsers, ...staleUsers]

  if (usersToUpdate.length > 0) {
    console.log(`🚀 Batch processing ${usersToUpdate.length} users with screenName-based deduplication...`)

    // Use batch processing instead of individual calls for massive performance improvement
    await createOrUpdateUsersWithScreenNameMergeBatch(usersToUpdate)

    console.log(`✅ Batch processing complete for ${usersToUpdate.length} users`)
  }
  
  return {
    created: missingUsers.length,
    updated: staleUsers.length,
    skipped: upToDateUsers.length
  }
}

// Optimized: Only update vibes that have actually changed
export async function updateUserVibesOptimized(updates: Array<{userId: string, vibe: string}>): Promise<number> {
  if (updates.length === 0) return 0
  
  // Validate all vibe values before processing (batch validation)
  const { validUsers, invalidUsers } = await import('@/lib/validation').then(mod => 
    mod.validateVibesBatch(updates)
  )
  
  // Log any validation errors (only in development)
  if (invalidUsers.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(`🚨 Found ${invalidUsers.length} invalid vibe values in optimized batch update:`)
    invalidUsers.forEach(({ userId, originalVibe, error }) => {
      logValidationError('vibe', originalVibe, error, `updateUserVibesOptimized batch for user ${userId}`)
    })
  }
  
  if (validUsers.length === 0) {
    return 0
  }
  
  // Bulk check which users actually need vibe updates
  const userIds = validUsers.map(u => u.userId)
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    RETURN u.userId as userId, u.vibe as currentVibe
  `
  
  const results = await runQuery(query, { userIds })
  const currentVibes = new Map<string, string>()
  
  results.forEach(record => {
    currentVibes.set(record.userId, record.currentVibe || '')
  })
  
  // Filter to only updates that are actually changing the vibe
  const actualUpdates = validUsers.filter(update => {
    const currentVibe = currentVibes.get(update.userId) || ''
    return currentVibe !== update.vibe
  })
  
  if (actualUpdates.length === 0) {
    return 0
  }
  
  console.log(`📝 Updating vibe for ${actualUpdates.length} users (${validUsers.length - actualUpdates.length} already correct)`)

  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT * 10 // Larger batch for simple updates
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES

  const updateQuery = `
    UNWIND $updates AS update
    MATCH (u:User {userId: update.userId})
    SET u.vibe = update.vibe
  `

  // Process batches in parallel
  for (let i = 0; i < actualUpdates.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<void>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < actualUpdates.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, actualUpdates.length)
      const batch = actualUpdates.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(updateQuery, { updates: batch })
          .then(() => {})
          .catch((error: any) => console.error(`❌ Vibe update batch failed:`, error.message))
      )
    }

    await Promise.all(batchPromises)
  }

  return actualUpdates.length
}

// Optimized: Update user departments (for individual users)
export async function updateUserDepartmentsOptimized(updates: Array<{userId: string, department: string}>): Promise<number> {
  if (updates.length === 0) return 0
  
  console.log(`🔍 Checking department updates for ${updates.length} users...`)
  
  // First, check which users need department updates (and are individuals or unclassified)
  const userIds = updates.map(u => u.userId)
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    WHERE (u.vibe = 'individual' OR u.vibe = '' OR u.vibe IS NULL)
    RETURN u.userId as userId, u.department as currentDepartment
  `
  
  const results = await runQuery(query, { userIds })
  const currentDepartments = new Map<string, string>()
  
  results.forEach(record => {
    currentDepartments.set(record.userId, record.currentDepartment || '')
  })
  
  // Filter to only updates for individual/unclassified users that are actually changing the department
  const actualUpdates = updates.filter(update => {
    const currentDepartment = currentDepartments.get(update.userId)
    // Only update if user exists as individual/unclassified and department is different
    return currentDepartment !== undefined && currentDepartment !== update.department
  })
  
  if (actualUpdates.length === 0) {
    console.log(`✅ All departments are already up-to-date`)
    return 0
  }

  console.log(`📝 Updating department for ${actualUpdates.length} users (${updates.length - actualUpdates.length} skipped)`)

  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  const parallelBatches = OPTIMAL_BATCH_SIZES.PARALLEL_BATCHES

  const updateQuery = `
    UNWIND $updates AS update
    MATCH (u:User {userId: update.userId})
    WHERE (u.vibe = 'individual' OR u.vibe = '' OR u.vibe IS NULL)
    SET u.department = update.department
  `

  // Process batches in parallel
  for (let i = 0; i < actualUpdates.length; i += batchSize * parallelBatches) {
    const batchPromises: Promise<void>[] = []

    for (let j = 0; j < parallelBatches && (i + j * batchSize) < actualUpdates.length; j++) {
      const startIdx = i + j * batchSize
      const endIdx = Math.min(startIdx + batchSize, actualUpdates.length)
      const batch = actualUpdates.slice(startIdx, endIdx)

      batchPromises.push(
        runQuery(updateQuery, { updates: batch })
          .then(() => {})
          .catch((error: any) => console.error(`❌ Department update batch failed:`, error.message))
      )
    }

    await Promise.all(batchPromises)
  }

  return actualUpdates.length
}

// Optimized: Ensure organizations exist with staleness check - BATCH VERSION
export async function ensureOrganizationsExistOptimized(orgUsernames: string[]): Promise<Map<string, string>> {
  if (orgUsernames.length === 0) return new Map()

  console.log(`🔍 Ensuring ${orgUsernames.length} organizations exist (batch lookup)...`)

  const orgMap = new Map<string, string>()
  const orgsToFetch: string[] = []
  const orgsToUpdate: string[] = []

  // OPTIMIZED: Single batch query instead of individual queries per org
  const batchExistingQuery = `
    UNWIND $screenNames AS screenName
    OPTIONAL MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(screenName)
    RETURN screenName as inputScreenName,
           u.userId as userId,
           u.screenName as foundScreenName,
           u.vibe as vibe,
           u.lastUpdated as lastUpdated
  `

  const existingResults = await runQuery(batchExistingQuery, { screenNames: orgUsernames })

  // Process all results in single pass
  const staleThreshold = 1080 * 60 * 60 * 1000 // 45 days in ms

  existingResults.forEach(result => {
    if (result.userId) {
      // User exists
      orgMap.set(result.inputScreenName.toLowerCase(), result.userId)

      const isStale = result.lastUpdated
        ? (Date.now() - new Date(result.lastUpdated).getTime()) > staleThreshold
        : true

      if (result.vibe !== 'organization' || isStale) {
        orgsToUpdate.push(result.inputScreenName)
      }
    } else {
      // Organization doesn't exist, needs to be fetched
      orgsToFetch.push(result.inputScreenName)
    }
  })
  
  console.log(`📊 Organization status:`)
  console.log(`   - Already exist: ${orgMap.size}`)
  console.log(`   - Need fetching: ${orgsToFetch.length}`)
  console.log(`   - Need updating: ${orgsToUpdate.length}`)
  
  // Fetch new organizations from SocialAPI
  let fetchedOrgs: any[] = []
  if (orgsToFetch.length > 0) {
    console.log(`📥 Fetching ${orgsToFetch.length} new organizations from SocialAPI`)
    fetchedOrgs = await fetchOrganizationsBatch(orgsToFetch)
  }
  
  // Process all organizations that need creation/updates
  const orgsToProcess: Neo4jUser[] = []
  
  // Add fetched organizations
  fetchedOrgs.forEach(org => {
    orgsToProcess.push(transformToNeo4jOrganization(org))
  })
  
  // Add organizations that need vibe/data updates
  orgsToUpdate.forEach(orgUsername => {
    if (!fetchedOrgs.find(org => org.screen_name.toLowerCase() === orgUsername.toLowerCase())) {
      // This is an existing user that needs to be updated to organization vibe
      orgsToProcess.push({
        userId: orgMap.get(orgUsername.toLowerCase()) || `org_${orgUsername.toLowerCase()}`,
        screenName: orgUsername,
        name: orgUsername,
        profileImageUrl: undefined,
        description: undefined,
        location: undefined,
        url: undefined,
        followersCount: 0,
        followingCount: 0,
        verified: false,
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        listedCount: 0,
        statusesCount: 0,
        favouritesCount: 0,
        protected: false,
        canDm: false,
        profileBannerUrl: undefined,
        verificationType: undefined,
        verificationReason: undefined,
        vibe: 'organization', // Ensure it's marked as organization
        department: undefined,
        org_type: undefined,
        org_subtype: undefined,
        web3_focus: undefined
      })
    }
  })
  
  // Process organizations using batch function instead of individual calls
  if (orgsToProcess.length > 0) {
    console.log(`💾 Batch processing ${orgsToProcess.length} organizations...`)

    // Use the batch function for much better performance
    await createOrUpdateUsersWithScreenNameMergeBatch(orgsToProcess)

    // Update orgMap with all processed organizations
    orgsToProcess.forEach(org => {
      orgMap.set(org.screenName.toLowerCase(), org.userId)
    })

    console.log(`✅ Organization batch processing complete for ${orgsToProcess.length} organizations`)
  } else if (orgMap.size === orgUsernames.length) {
    console.log(`✅ All ${orgUsernames.length} organizations are up-to-date`)
  }

  console.log(`🎯 Organization mapping complete: ${orgMap.size} total organizations available`)
  
  // Log a few examples for debugging
  if (orgMap.size > 0) {
    const examples = Array.from(orgMap.entries()).slice(0, 3)
    console.log(`   Examples: ${examples.map(([name, id]) => `@${name}→${id}`).join(', ')}`)
  }
  
  return orgMap
}

// New function to check existing employment relationships for users with a specific organization
export async function getUsersWithExistingEmploymentRelationships(userIds: string[], orgUserId: string): Promise<Array<{
  userId: string,
  hasWorksAt: boolean,
  hasWorkedAt: boolean,
  currentPosition?: {
    organizations: string[],
    department?: string
  },
  employmentHistory?: Array<{
    organization: string,
    role?: string
  }>
}>> {
  if (userIds.length === 0) return []
  
  console.log(`🔍 Checking ${userIds.length} users for existing employment relationships with org ${orgUserId}...`)
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    MATCH (org:User {userId: $orgUserId})
    
    OPTIONAL MATCH (u)-[:WORKS_AT]->(org)
    OPTIONAL MATCH (u)-[:WORKED_AT]->(org)
    
    RETURN u.userId as userId,
           u.screenName as userScreenName,
           u.vibe as userVibe,
           org.screenName as orgScreenName,
           EXISTS((u)-[:WORKS_AT]->(org)) as hasWorksAt,
           EXISTS((u)-[:WORKED_AT]->(org)) as hasWorkedAt
  `
  
  const results = await runQuery(query, { userIds, orgUserId })
  
  const usersWithRelationships = results
    .filter(record => record.hasWorksAt || record.hasWorkedAt)
    .map(record => ({
      userId: record.userId,
      hasWorksAt: record.hasWorksAt,
      hasWorkedAt: record.hasWorkedAt,
      currentPosition: record.hasWorksAt ? {
        organizations: [record.orgScreenName], // Use org screenName
        department: record.userVibe || 'Unknown' // Use user's vibe as department
      } : undefined,
      employmentHistory: record.hasWorkedAt ? [{
        organization: record.orgScreenName,
        role: record.userVibe || 'Unknown'
      }] : []
    }))
  
  console.log(`✅ Found ${usersWithRelationships.length} users with existing employment relationships`)
  
  return usersWithRelationships
}

// Batch check all user employment data to avoid N+1 queries
export async function batchCheckUserEmploymentData(userIds: string[], orgId: string): Promise<{
  existingEmployees: string[],
  hasEmploymentData: string[],
  needsGrokAnalysis: string[]
}> {
  if (userIds.length === 0) {
    return { existingEmployees: [], hasEmploymentData: [], needsGrokAnalysis: [] }
  }

  console.log(`🔍 Batch checking employment data for ${userIds.length} users...`)

  // Optimized query: uses COUNT instead of COLLECT for better performance
  const query = `
    WITH $userIds AS userIdList, $orgId AS targetOrgId
    UNWIND userIdList AS userId
    OPTIONAL MATCH (u:User {userId: userId})
    OPTIONAL MATCH (u)-[:WORKS_AT]->(currentOrg:User)
    OPTIONAL MATCH (u)-[:WORKED_AT]->(pastOrg:User)
    OPTIONAL MATCH (u)-[targetWork:WORKS_AT]->(targetOrg:User {userId: targetOrgId})

    WITH userId, u, targetWork,
         COUNT(DISTINCT currentOrg) > 0 OR COUNT(DISTINCT pastOrg) > 0 as hasAnyEmploymentData,
         COLLECT(DISTINCT currentOrg.screenName) as currentEmployers,
         COLLECT(DISTINCT pastOrg.screenName) as pastEmployers

    RETURN
      userId,
      u IS NOT NULL as userExists,
      targetWork IS NOT NULL as isCurrentEmployee,
      hasAnyEmploymentData,
      u.department as department,
      u.vibe as vibe,
      currentEmployers,
      pastEmployers
  `
  
  const results = await runQuery(query, { userIds, orgId })
  
  const existingEmployees: string[] = []
  const hasEmploymentData: string[] = []
  const needsGrokAnalysis: string[] = []
  
  results.forEach(record => {
    if (!record.userExists) {
      needsGrokAnalysis.push(record.userId)
    } else if (record.isCurrentEmployee) {
      existingEmployees.push(record.userId)
    } else if (record.hasAnyEmploymentData) {
      hasEmploymentData.push(record.userId)
    } else {
      needsGrokAnalysis.push(record.userId)
    }
  })
  
  console.log(`   → Existing employees: ${existingEmployees.length}`)
  console.log(`   → Has employment data: ${hasEmploymentData.length}`)
  console.log(`   → Needs Grok analysis: ${needsGrokAnalysis.length}`)
  
  return { existingEmployees, hasEmploymentData, needsGrokAnalysis }
}

// Consolidated user existence check for multiple profile sources
export async function consolidatedUserExistenceCheck(profileSources: {
  memberProfiles?: any[],
  followingProfiles?: any[],
  grokProfiles?: any[],
  searchProfiles?: any[],
  affiliatedUsers?: any[],
  additionalUserIds?: string[]
}): Promise<Set<string>> {
  
  // Collect ALL possible user IDs from ALL sources at once
  const allUserIds: string[] = []
  
  if (profileSources.memberProfiles) {
    allUserIds.push(...profileSources.memberProfiles.map(p => p.id_str || p.id).filter(Boolean))
  }
  if (profileSources.followingProfiles) {
    allUserIds.push(...profileSources.followingProfiles.map(p => p.id_str || p.id).filter(Boolean))
  }
  if (profileSources.grokProfiles) {
    allUserIds.push(...profileSources.grokProfiles.map(p => p.id_str || p.id).filter(Boolean))
  }
  if (profileSources.searchProfiles) {
    allUserIds.push(...profileSources.searchProfiles.map(p => p.id_str || p.id).filter(Boolean))
  }
  if (profileSources.affiliatedUsers) {
    allUserIds.push(...profileSources.affiliatedUsers.map(p => p.id_str || p.id).filter(Boolean))
  }
  if (profileSources.additionalUserIds) {
    allUserIds.push(...profileSources.additionalUserIds)
  }
  
  const uniqueUserIds = Array.from(new Set(allUserIds))
  
  if (uniqueUserIds.length === 0) return new Set()
  
  console.log(`🔍 Consolidated existence check for ${uniqueUserIds.length} unique user IDs...`)
  
  try {
    // SINGLE batch existence check for all users
    const existingIds = await checkUsersExist(uniqueUserIds)
    console.log(`   → Found ${existingIds.length}/${uniqueUserIds.length} existing users`)
    return new Set(existingIds)
  } catch (error: any) {
    console.warn(`⚠️ Consolidated existence check failed:`, error.message)
    return new Set()
  }
}

// Get all users who have WORKS_AT relationship with the organization (using screenName lookup)
export async function getOrganizationEmployeesByScreenName(orgScreenName: string): Promise<Array<{
  userId: string,
  screenName: string,
  name: string,
  profileImageUrl?: string,
  description?: string,
  location?: string,
  url?: string,
  followersCount: number,
  followingCount: number,
  verified: boolean,
  createdAt?: string,
  listedCount?: number,
  statusesCount?: number,
  favouritesCount?: number,
  protected?: boolean,
  canDm?: boolean,
  profileBannerUrl?: string,
  verificationType?: string,
  verificationReason?: string,
  vibe?: string,
  department?: string,
  position?: string,
  startDate?: string,
  endDate?: string
}>> {
  console.log(`👥 Fetching all employees for organization @${orgScreenName}...`)
  
  const query = `
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower($orgScreenName)
    MATCH (u:User)-[works:WORKS_AT]->(org)
    RETURN 
      u.userId as userId,
      u.screenName as screenName,
      u.name as name,
      u.profileImageUrl as profileImageUrl,
      u.description as description,
      u.location as location,
      u.url as url,
      u.followersCount as followersCount,
      u.followingCount as followingCount,
      u.verified as verified,
      u.createdAt as createdAt,
      u.listedCount as listedCount,
      u.statusesCount as statusesCount,
      u.favouritesCount as favouritesCount,
      u.protected as protected,
      u.canDm as canDm,
      u.profileBannerUrl as profileBannerUrl,
      u.verificationType as verificationType,
      u.verificationReason as verificationReason,
      u.vibe as vibe,
      u.department as department,
      works.position as position,
      works.startDate as startDate,
      works.endDate as endDate
    ORDER BY u.screenName
  `
  
  const results = await runQuery(query, { orgScreenName })
  
  const employees = results.map(record => ({
    userId: record.userId,
    screenName: record.screenName,
    name: record.name,
    profileImageUrl: record.profileImageUrl,
    description: record.description,
    location: record.location,
    url: record.url,
    followersCount: record.followersCount || 0,
    followingCount: record.followingCount || 0,
    verified: Boolean(record.verified),
    createdAt: record.createdAt,
    listedCount: record.listedCount || 0,
    statusesCount: record.statusesCount || 0,
    favouritesCount: record.favouritesCount || 0,
    protected: Boolean(record.protected),
    canDm: Boolean(record.canDm),
    profileBannerUrl: record.profileBannerUrl,
    verificationType: record.verificationType,
    verificationReason: record.verificationReason,
    vibe: record.vibe,
    department: record.department,
    position: record.position,
    startDate: record.startDate,
    endDate: record.endDate
  }))

  console.log(`✅ Found ${employees.length} employees for organization @${orgScreenName}`)
  
  return employees
}

// Lightweight function to get only employee IDs (for filtering operations)
export async function getOrganizationEmployeeIdsByScreenName(orgScreenName: string): Promise<string[]> {
  console.log(`🔍 Fetching employee IDs for organization @${orgScreenName}...`)
  
  const query = `
    MATCH (org:User)
    WHERE toLower(org.screenName) = toLower($orgScreenName)
    MATCH (u:User)-[:WORKS_AT]->(org)
    RETURN u.userId as userId
    ORDER BY u.userId
  `
  
  const results = await runQuery(query, { orgScreenName })
  const employeeIds = results.map(record => record.userId)
  
  console.log(`✅ Found ${employeeIds.length} employee IDs for @${orgScreenName}`)
  
  return employeeIds
}

// Update organization classification data for existing organizations
export async function updateOrganizationClassification(
  organizations: Array<{
    userId: string,
    classification: {
      org_type?: string,
      org_subtype?: string,
      web3_focus?: string
    }
  }>
): Promise<void> {
  if (organizations.length === 0) return

  console.log(`📊 Updating organization classification for ${organizations.length} organizations...`)

  const query = `
    UNWIND $organizations AS org
    MATCH (u:User {userId: org.userId})
    SET 
      u.org_type = CASE 
        WHEN org.classification.org_type IS NOT NULL AND org.classification.org_type <> '' 
        THEN org.classification.org_type 
        ELSE COALESCE(u.org_type, 'service') 
      END,
      u.org_subtype = CASE 
        WHEN org.classification.org_subtype IS NOT NULL AND org.classification.org_subtype <> '' 
        THEN org.classification.org_subtype 
        ELSE COALESCE(u.org_subtype, 'other') 
      END,
      u.web3_focus = CASE 
        WHEN org.classification.web3_focus IS NOT NULL AND org.classification.web3_focus <> '' 
        THEN org.classification.web3_focus 
        ELSE COALESCE(u.web3_focus, 'traditional') 
      END,
      u.vibe = 'organization',
      u.lastUpdated = datetime()
    RETURN u.screenName as screenName, u.org_type as orgType, u.org_subtype as orgSubtype, u.web3_focus as web3Focus
  `

  try {
    const results = await runQuery<{
      screenName: string,
      orgType: string,
      orgSubtype: string,
      web3Focus: string
    }>(query, { organizations })

    console.log(`✅ Updated organization classification for ${results.length} organizations`)
    
    // Log the updates for verification
    results.forEach(result => {
      console.log(`     🏢 @${result.screenName}: ${result.orgType}/${result.orgSubtype} (${result.web3Focus})`)
    })

  } catch (error: any) {
    console.error('❌ Error updating organization classification:', error)
    throw error
  }
}

// ================================================================================================
// ICP ANALYSIS OPTIMIZATION FUNCTIONS
// ================================================================================================

/**
 * Get all properties for an organization to use in ICP analysis optimization
 */
export async function getOrganizationProperties(identifier: string): Promise<Record<string, any> | null> {
  console.log(`🔍 [Neo4j] Fetching organization properties for: ${identifier}`)
  
  // Try by userId first, then by screenName
  let query = `
    MATCH (u:User {userId: $identifier})
    WHERE u.vibe = 'organization'
    RETURN properties(u) as props
  `
  
  let results = await runQuery(query, { identifier })
  
  if (results.length === 0) {
    // Try by screenName (case-insensitive)
    query = `
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower($identifier) AND u.vibe = 'organization'
      RETURN properties(u) as props
    `
    
    results = await runQuery(query, { identifier })
  }
  
  if (results.length === 0) {
    console.log(`❌ [Neo4j] Organization not found: ${identifier}`)
    return null
  }
  
  const properties = results[0].props
  console.log(`✅ [Neo4j] Found organization with ${Object.keys(properties).length} properties`)
  
  return properties
}

/**
 * Update organization properties with new data from ICP analysis
 * Uses centralized mapping utilities to eliminate drift
 */
export async function updateOrganizationProperties(
  userId: string, 
  newProperties: Record<string, any>
): Promise<void> {
  console.log(`[Neo4j] Updating organization properties for: ${userId}`)
  console.log(`[Neo4j] Input properties keys: ${Object.keys(newProperties).length}`)
  
  // Filter out null/undefined/empty values
  const validProperties: Record<string, any> = {}
  Object.entries(newProperties).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      validProperties[key] = value
    }
  })
  
  if (Object.keys(validProperties).length === 0) {
    console.log(`[Neo4j] No valid properties to update for ${userId}`)
    return
  }
  
  console.log(`[Neo4j] Processing ${Object.keys(validProperties).length} valid properties`)
  
  // Build dynamic SET clause
  const setClause = Object.keys(validProperties)
    .map(key => `u.${key} = $${key}`)
    .join(', ')
  
  const query = `
    MATCH (u:User {userId: $userId})
    SET ${setClause}, u.lastUpdated = datetime()
    RETURN u.userId as updatedUserId
  `
  
  const params = { userId, ...validProperties }
  await runQuery(query, params)
  
  console.log(`[Neo4j] Updated ${Object.keys(validProperties).length} properties for organization ${userId}`)
}

/**
 * Remove specific properties from an organization user in Neo4j
 * Sets properties to null which effectively removes them in Neo4j
 * Uses canonical forbidden properties list by default
 */
export async function removeOrganizationProperties(
  userId: string, 
  keys: string[] = ["password", "email", "privateKey", "secret"] // Basic forbidden list instead of FORBIDDEN_PROPERTIES
): Promise<void> {
  if (!keys || keys.length === 0) {
    console.log(`[Neo4j] No properties to remove for ${userId}`)
    return
  }
  
  console.log(`[Neo4j] Removing ${keys.length} properties from ${userId}: ${keys.join(', ')}`)
  
  // Build dynamic SET clause to null (Neo4j removes properties when set to null)
  const removeClause = keys.map(k => `u.${k} = null`).join(', ')
  
  const query = `
    MATCH (u:User {userId: $userId})
    SET ${removeClause}
    RETURN u.userId as updatedUserId
  `
  
  await runQuery(query, { userId })
  console.log(`[Neo4j] Removed ${keys.length} properties for organization ${userId}`)
}

/**
 * Get organization properties and inflate to UI-friendly format
 * Uses centralized mapping to reconstruct canonical object structure
 */
export async function getOrganizationForUI(identifier: string): Promise<Record<string, any> | null> {
  console.log(`🔍 [Neo4j] Retrieving organization data for UI: ${identifier}`)
  
  // Try by userId first, then by screenName (same logic as getOrganizationProperties)
  let query = `
    MATCH (u:User {userId: $identifier})
    WHERE u.vibe = 'organization'
    RETURN properties(u) as props
  `
  
  let result = await runQuery(query, { identifier })
  
  if (!result || result.length === 0) {
    // Try by screenName (case-insensitive)
    query = `
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower($identifier) AND u.vibe = 'organization'
      RETURN properties(u) as props
    `
    
    result = await runQuery(query, { identifier })
  }
  
  if (!result || result.length === 0) {
    console.log(`❌ [Neo4j] No organization found for ${identifier}`)
    return null
  }
  
  const nodeProps = result[0].props
  console.log(`✅ [Neo4j] Found organization with ${Object.keys(nodeProps).length} properties`)
  
  // Use centralized inflation that handles mapping and backward compatibility
  const inflatedData = nodeProps // Direct assignment instead of inflateForUI
  
  console.log(`✅ [Neo4j] Inflated ${Object.keys(nodeProps).length} flat properties → ${JSON.stringify(inflatedData).length} chars UI object`)
  
  return inflatedData
}

/**
 * Clean up all forbidden properties from an organization
 * Convenience function to remove all canonical forbidden properties
 */
export async function cleanupForbiddenProperties(userId: string): Promise<void> {
  await removeOrganizationProperties(userId, ["password", "email", "privateKey", "secret"]) // Basic list instead of FORBIDDEN_PROPERTIES
}
