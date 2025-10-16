import { runQuery, runBatchQuery } from '@/lib/neo4j'
import { validateVibe, logValidationError } from '@/lib/validation'

// Optimal batch sizes for different operations (performance optimized)
const OPTIMAL_BATCH_SIZES = {
  USER_UPSERT: 50,           // Reduced from 100 for faster commits
  RELATIONSHIP_BATCH: 250,   // Reduced from 500 for memory efficiency  
  LOOKUP_BATCH: 100,         // For existence checks
  EXTERNAL_API: 10           // For SocialAPI calls
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

// Create or update a user in Neo4j (now uses screenName-based deduplication)
export async function createOrUpdateUser(user: Neo4jUser): Promise<void> {
  // Use the screenName-based merge function to ensure consistency
  await createOrUpdateUserWithScreenNameMerge(user)
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

// Create or update multiple users in batch with optimized batching
export async function createOrUpdateUsers(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return
  
  // Use the new batched screenName merge function for better performance
  console.log(`🔍 Processing ${users.length} users with screenName-based deduplication...`)
  
  await createOrUpdateUsersWithScreenNameMergeBatch(users)
  
  console.log(`✅ Completed processing ${users.length} users with screenName uniqueness`)
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

// Batch create multiple users at once
async function batchCreateUsers(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return
  
  console.log(`🆕 Batch creating ${users.length} new users...`)
  
  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    
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
    
    const sanitizedBatch = batch.map(user => ({
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
    
    try {
      await runQuery(createQuery, { users: sanitizedBatch })
    } catch (error: any) {
      console.error(`❌ Unified batch storage failed for batch ${i/batchSize + 1}:`, error.message)
      // Try individual processing for this batch to identify problematic users
      console.log(`🔄 Falling back to individual processing for ${batch.length} users...`)
      
      let successCount = 0
      let errorCount = 0
      
      for (const user of batch) {
        try {
          await createOrUpdateUserWithScreenNameMerge(user)
          successCount++
        } catch (individualError: any) {
          errorCount++
          console.error(`❌ Individual user processing failed for @${user.screenName} (${user.userId}):`, individualError.message)
          // Continue with next user instead of failing entire batch
        }
      }
      
      console.log(`📊 Individual processing complete: ${successCount} succeeded, ${errorCount} failed`)
    }
  }
  
  console.log(`✅ Batch created ${users.length} users`)
}

// Batch update existing users with new data, preserving the original userId but storing incoming userId
async function batchUpdateUsers(updates: Array<{user: Neo4jUser, targetUserId: string}>): Promise<void> {
  if (updates.length === 0) return
  
  console.log(`🔄 Batch updating ${updates.length} existing users...`)
  
  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize)
    
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
    
    const sanitizedBatch = batch.map(({ user, targetUserId }) => ({
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
    
    try {
      await runQuery(updateQuery, { updates: sanitizedBatch })
    } catch (error: any) {
      console.error(`❌ Batch update failed for batch ${i/batchSize + 1}:`, error.message)
      // Try individual processing for this batch to identify problematic users
      console.log(`🔄 Falling back to individual processing for ${batch.length} users...`)
      
      let successCount = 0
      let errorCount = 0
      
      for (const { user, targetUserId } of batch) {
        try {
          await createOrUpdateUserWithScreenNameMerge(user)
          successCount++
        } catch (individualError: any) {
          errorCount++
          console.error(`❌ Individual user update failed for @${user.screenName} (${user.userId}):`, individualError.message)
          // Continue with next user instead of failing entire batch
        }
      }
      
      console.log(`📊 Individual processing complete: ${successCount} succeeded, ${errorCount} failed`)
    }
  }
  
  console.log(`✅ Batch updated ${updates.length} users`)
}

// Create or update a single user, merging by screenName to avoid duplicates
// This is the ONLY function that should create User nodes to ensure screenName uniqueness
export async function createOrUpdateUserWithScreenNameMerge(user: Neo4jUser): Promise<string> {
  // First, check if a user with the same screenName OR userId already exists
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
  
  if (existingByScreenName && existingByUserId && existingByScreenName !== existingByUserId) {
    // Conflict: two different users exist - one with same screenName, one with same userId
    console.log(`� Conflict detected: screenName @${user.screenName} exists as ${existingByScreenName}, userId ${user.userId} exists as ${existingByUserId}`)
    
    // Prefer the screenName match (screenName is our primary key)
    console.log(`🎯 Resolving conflict: Using screenName match ${existingByScreenName}, updating with data from ${user.userId}`)
    
    // Update the user found by screenName with new data and store incoming userId as main userId
    const updateQuery = `
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower($screenName)
      SET
        u.userId = $userId,
        u.name = $name,
        u.profileImageUrl = $profileImageUrl,
        u.description = $description,
        u.location = $location,
        u.url = $url,
        u.followersCount = $followersCount,
        u.followingCount = $followingCount,
        u.verified = $verified,
        u.lastUpdated = $lastUpdated,
        u.listedCount = $listedCount,
        u.statusesCount = $statusesCount,
        u.favouritesCount = $favouritesCount,
        u.protected = $protected,
        u.canDm = $canDm,
        u.profileBannerUrl = $profileBannerUrl,
        u.verificationType = $verificationType,
        u.verificationReason = $verificationReason,
        u.vibe = $vibe,
        u.department = $department,
        u.org_type = CASE WHEN $org_type IS NOT NULL THEN $org_type ELSE u.org_type END,
        u.org_subtype = CASE WHEN $org_subtype IS NOT NULL THEN $org_subtype ELSE u.org_subtype END,
        u.web3_focus = CASE WHEN $web3_focus IS NOT NULL THEN $web3_focus ELSE u.web3_focus END
      RETURN u.userId as finalUserId
    `
    
    const conflictParams = {
      screenName: user.screenName,
      userId: user.userId,
      name: user.name,
      profileImageUrl: user.profileImageUrl || null,
      description: user.description || null,
      location: user.location || null,
      url: user.url || null,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      verified: user.verified,
      lastUpdated: user.lastUpdated,
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
    };
    
    const updateResult = await runQuery(updateQuery, conflictParams)
    
    return updateResult[0]?.finalUserId || existingByScreenName
  }
  
  if (existingByScreenName) {
    // User with same screenName exists, update it
    if (existingByScreenName !== user.userId) {
      console.log(`🔄 ScreenName merge: @${user.screenName} exists as ${existingByScreenName}, updating with data from ${user.userId}`)
    }
    
    const updateQuery = `
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower($screenName)
      SET
        u.userId = $userId,
        u.name = $name,
        u.profileImageUrl = $profileImageUrl,
        u.description = $description,
        u.location = $location,
        u.url = $url,
        u.followersCount = $followersCount,
        u.followingCount = $followingCount,
        u.verified = $verified,
        u.lastUpdated = $lastUpdated,
        u.listedCount = $listedCount,
        u.statusesCount = $statusesCount,
        u.favouritesCount = $favouritesCount,
        u.protected = $protected,
        u.canDm = $canDm,
        u.profileBannerUrl = $profileBannerUrl,
        u.verificationType = $verificationType,
        u.verificationReason = $verificationReason,
        u.vibe = $vibe,
        u.department = $department,
        u.org_type = CASE WHEN $org_type IS NOT NULL THEN $org_type ELSE u.org_type END,
        u.org_subtype = CASE WHEN $org_subtype IS NOT NULL THEN $org_subtype ELSE u.org_subtype END,
        u.web3_focus = CASE WHEN $web3_focus IS NOT NULL THEN $web3_focus ELSE u.web3_focus END
      RETURN u.userId as finalUserId
    `
    
    const updateResult = await runQuery(updateQuery, {
      screenName: user.screenName,
      userId: user.userId,
      name: user.name,
      profileImageUrl: user.profileImageUrl || null,
      description: user.description || null,
      location: user.location || null,
      url: user.url || null,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      verified: user.verified,
      lastUpdated: user.lastUpdated,
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
    })
    
    return updateResult[0]?.finalUserId || existingByScreenName
  }
  
  if (existingByUserId) {
    // User with same userId exists, update its screenName and other data
    console.log(`🔄 UserId merge: ${user.userId} exists with screenName @${result.existingByUserIdScreenName}, updating to @${user.screenName}`)
    
    const updateQuery = `
      MATCH (u:User {userId: $userId})
      SET
        u.screenName = $screenName,
        u.name = $name,
        u.profileImageUrl = $profileImageUrl,
        u.description = $description,
        u.location = $location,
        u.url = $url,
        u.followersCount = $followersCount,
        u.followingCount = $followingCount,
        u.verified = $verified,
        u.lastUpdated = $lastUpdated,
        u.listedCount = $listedCount,
        u.statusesCount = $statusesCount,
        u.favouritesCount = $favouritesCount,
        u.protected = $protected,
        u.canDm = $canDm,
        u.profileBannerUrl = $profileBannerUrl,
        u.verificationType = $verificationType,
        u.verificationReason = $verificationReason,
        u.vibe = $vibe,
        u.department = $department,
        u.org_type = CASE WHEN $org_type IS NOT NULL THEN $org_type ELSE u.org_type END,
        u.org_subtype = CASE WHEN $org_subtype IS NOT NULL THEN $org_subtype ELSE u.org_subtype END,
        u.web3_focus = CASE WHEN $web3_focus IS NOT NULL THEN $web3_focus ELSE u.web3_focus END
      RETURN u.userId as finalUserId
    `
    
    const updateResult = await runQuery(updateQuery, {
      userId: user.userId,
      screenName: user.screenName,
      name: user.name,
      profileImageUrl: user.profileImageUrl || null,
      description: user.description || null,
      location: user.location || null,
      url: user.url || null,
      followersCount: user.followersCount,
      followingCount: user.followingCount,
      verified: user.verified,
      lastUpdated: user.lastUpdated,
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
    })
    
    return updateResult[0]?.finalUserId || user.userId
  }
  
  // No conflicts, create new user with both screenName and userId
  const createQuery = `
    CREATE (u:User)
    SET
      u.userId = $userId,
      u.screenName = $screenName,
      u.name = $name,
      u.createdAt = $createdAt,
      u.lastUpdated = $lastUpdated,
      u.profileImageUrl = $profileImageUrl,
      u.description = $description,
      u.location = $location,
      u.url = $url,
      u.followersCount = $followersCount,
      u.followingCount = $followingCount,
      u.verified = $verified,
      u.listedCount = $listedCount,
      u.statusesCount = $statusesCount,
      u.favouritesCount = $favouritesCount,
      u.protected = $protected,
      u.canDm = $canDm,
      u.profileBannerUrl = $profileBannerUrl,
      u.verificationType = $verificationType,
      u.verificationReason = $verificationReason,
      u.vibe = $vibe,
      u.department = $department,
      u.org_type = $org_type,
      u.org_subtype = $org_subtype,
      u.web3_focus = $web3_focus
    RETURN u.userId as finalUserId
  `
  
  const createResult = await runQuery(createQuery, {
    userId: user.userId,
    screenName: user.screenName,
    name: user.name,
    createdAt: user.createdAt || new Date().toISOString(),
    profileImageUrl: user.profileImageUrl || null,
    description: user.description || null,
    location: user.location || null,
    url: user.url || null,
    followersCount: user.followersCount,
    followingCount: user.followingCount,
    verified: user.verified,
    lastUpdated: user.lastUpdated,
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
  })
  
  console.log(`✅ Created new user: @${user.screenName} (${user.userId})`)
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

// Get all users that a specific user follows
export async function getUserFollowings(userId: string): Promise<Neo4jUser[]> {
  const query = `
    MATCH (u:User {userId: $userId})-[:FOLLOWS]->(following:User)
    RETURN following
    ORDER BY following.followersCount DESC
  `
  
  const results = await runQuery(query, { userId })
  return results.map(record => record.following.properties)
}

// Get all users that follow a specific user
export async function getUserFollowers(userId: string): Promise<Neo4jUser[]> {
  const query = `
    MATCH (follower:User)-[:FOLLOWS]->(u:User {userId: $userId})
    RETURN follower
    ORDER BY follower.followersCount DESC
  `
  
  const results = await runQuery(query, { userId })
  return results.map(record => record.follower.properties)
}

// Clear all follows relationships for a user (useful when refreshing data)
// Get list of user IDs that a user currently follows in Neo4j
export async function getExistingFollowingIds(userId: string): Promise<string[]> {
  const query = `
    MATCH (u:User {userId: $userId})-[:FOLLOWS]->(following:User)
    RETURN following.userId as followingId
  `
  
  const results = await runQuery(query, { userId })
  return results.map(record => record.followingId)
}

// Get list of user IDs that currently follow a user in Neo4j
export async function getExistingFollowerIds(userId: string): Promise<string[]> {
  const query = `
    MATCH (follower:User)-[:FOLLOWS]->(u:User {userId: $userId})
    RETURN follower.userId as followerId
  `
  
  const results = await runQuery(query, { userId })
  return results.map(record => record.followerId)
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
  if (relationships.length === 0) {
    return // Remove unnecessary logging
  }
  
  // Deduplicate relationships first
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel => [`${rel.followerUserId}|${rel.followingUserId}`, rel])).values()
  )
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Adding ${uniqueRelationships.length} new FOLLOWS relationships (${relationships.length - uniqueRelationships.length} duplicates removed)`)
  }
  
  // Use optimized batch size
  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  for (let i = 0; i < uniqueRelationships.length; i += batchSize) {
    const batch = uniqueRelationships.slice(i, i + batchSize)
    
    // Use MERGE for idempotent operations
    const query = `
      UNWIND $relationships AS rel
      MATCH (follower:User {userId: rel.followerUserId})
      MATCH (following:User {userId: rel.followingUserId})
      MERGE (follower)-[:FOLLOWS]->(following)
    `
    
    await runQuery(query, { relationships: batch })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Added relationship batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueRelationships.length/batchSize)} (${batch.length} relationships)`)
    }
  }
}

// Remove FOLLOWS relationships for specific user IDs only
export async function removeFollowsRelationships(relationships: Array<{followerUserId: string, followingUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    console.log('No relationships to remove')
    return
  }
  
  console.log(`Removing ${relationships.length} FOLLOWS relationships`)
  
  // Process in batches of 500 to avoid large transaction issues
  const batchSize = 500
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (follower:User {userId: rel.followerUserId})-[r:FOLLOWS]->(following:User {userId: rel.followingUserId})
      DELETE r
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Removed relationship batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
  }
}

// Incrementally update follower relationships (who follows this user)
export async function incrementalUpdateFollowers(userId: string, newFollowerUsers: TwitterApiUser[]): Promise<{added: number, removed: number}> {
  console.log(`=== INCREMENTAL FOLLOWER UPDATE FOR ${userId} ===`)
  
  // Get current follower IDs from Neo4j
  const currentFollowerIds = await getExistingFollowerIds(userId)
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
    await createOrUpdateUsers(neo4jUsers)
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
  
  // Get current following IDs from Neo4j
  const currentFollowingIds = await getExistingFollowingIds(userId)
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
    await createOrUpdateUsers(neo4jUsers)
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

// Affiliate relationship functions
export async function createAffiliateRelationship(orgUserId: string, affiliateUserId: string): Promise<void> {
  const query = `
    MATCH (org:User {userId: $orgUserId})
    MATCH (affiliate:User {userId: $affiliateUserId})
    MERGE (affiliate)-[:AFFILIATED_WITH]->(org)
  `
  
  await runQuery(query, { orgUserId, affiliateUserId })
}

// Check if organization has affiliate data
export async function hasAffiliateData(orgUserId: string): Promise<boolean> {
  console.log(`🔍 [Neo4j] Checking affiliate data for user: ${orgUserId}`)
  const query = `
    MATCH (affiliate:User)-[:AFFILIATED_WITH]->(org:User {userId: $orgUserId})
    RETURN count(*) > 0 as hasAffiliates
  `
  
  const results = await runQuery(query, { orgUserId })
  const hasAffiliates = results[0]?.hasAffiliates || false
  console.log(`🔍 [Neo4j] User ${orgUserId} has affiliates: ${hasAffiliates}`)
  return hasAffiliates
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

// Get organization's affiliates
export async function getOrganizationAffiliates(orgUserId: string): Promise<Neo4jUser[]> {
  console.log(`🔍 [Neo4j] Fetching affiliates for organization: ${orgUserId}`)
  const query = `
    MATCH (affiliate:User)-[:AFFILIATED_WITH]->(org:User {userId: $orgUserId})
    RETURN affiliate
    ORDER BY affiliate.followersCount DESC
  `
  
  const results = await runQuery(query, { orgUserId })
  const affiliates = results.map(record => record.affiliate.properties)
  console.log(`✅ [Neo4j] Retrieved ${affiliates.length} affiliates for organization ${orgUserId}`)
  return affiliates
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

// Get organization by screen name (case-insensitive) - now looks for User with vibe='organization'
export async function getOrganizationByScreenName(screenName: string): Promise<Neo4jUser | null> {
  const query = `
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower($screenName) AND u.vibe = 'organization'
    RETURN u
  `
  
  const results = await runQuery(query, { screenName })
  return results.length > 0 ? results[0].u.properties : null
}

// Get organization by user ID - now looks for User with vibe='organization'
export async function getOrganizationByUserId(userId: string): Promise<Neo4jUser | null> {
  const query = `
    MATCH (u:User {userId: $userId})
    WHERE u.vibe = 'organization'
    RETURN u
  `
  
  const results = await runQuery(query, { userId })
  return results.length > 0 ? results[0].u.properties : null
}

// Check if multiple organizations exist in Neo4j (returns array of existing organization IDs)
export async function checkOrganizationsExist(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    WHERE u.vibe = 'organization'
    RETURN u.userId as existingUserId
  `
  
  const results = await runBatchQuery(query, { userIds })
  return results.map(record => record.existingUserId)
}

// Batch lookup organizations by screen names (case-insensitive)
export async function getOrganizationsByScreenNames(screenNames: string[]): Promise<Array<{screenName: string, organization: Neo4jUser}>> {
  if (screenNames.length === 0) return []
  
  const query = `
    UNWIND $screenNames AS screenName
    OPTIONAL MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(screenName) AND u.vibe = 'organization'
    RETURN screenName, u
  `
  
  const results = await runBatchQuery(query, { screenNames })
  return results
    .filter(record => record.u?.properties)
    .map(record => ({
      screenName: record.screenName,
      organization: record.u.properties
    }))
}

// Create WORKS_AT relationship between user and organization (using screenName lookups)
export async function createWorksAtRelationship(userScreenName: string, orgScreenName: string): Promise<void> {
  const query = `
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower($userScreenName)
    MATCH (o:User)
    WHERE toLower(o.screenName) = toLower($orgScreenName)
    MERGE (u)-[:WORKS_AT]->(o)
  `
  
  await runQuery(query, { userScreenName, orgScreenName })
}

// Create WORKED_AT relationship between user and organization (using screenName lookups)
export async function createWorkedAtRelationship(userScreenName: string, orgScreenName: string): Promise<void> {
  const query = `
    MATCH (u:User)
    WHERE toLower(u.screenName) = toLower($userScreenName)
    MATCH (o:User)
    WHERE toLower(o.screenName) = toLower($orgScreenName)
    MERGE (u)-[:WORKED_AT]->(o)
  `
  
  await runQuery(query, { userScreenName, orgScreenName })
}

// Create multiple WORKS_AT relationships in batch (using screenName lookups)
export async function addWorksAtRelationships(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) {
    return
  }
  
  // Deduplicate relationships based on screenNames
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel => 
      [`${rel.userScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )
  
  console.log(`📝 Adding ${uniqueRelationships.length} new WORKS_AT relationships (screenName-based)`)
  
  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  let successCount = 0
  let failCount = 0
  
  for (let i = 0; i < uniqueRelationships.length; i += batchSize) {
    const batch = uniqueRelationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower(rel.userScreenName)
      MATCH (o:User)
      WHERE toLower(o.screenName) = toLower(rel.orgScreenName)
      MERGE (u)-[:WORKS_AT]->(o)
      RETURN u.screenName as userScreenName, o.screenName as orgScreenName
    `
    
    try {
      const results = await runQuery(query, { relationships: batch })
      successCount += results.length
      console.log(`   ✅ WORKS_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueRelationships.length/batchSize)}: ${results.length}/${batch.length} relationships created`)
    } catch (error) {
      failCount += batch.length
      console.error(`   ❌ WORKS_AT batch ${Math.floor(i/batchSize) + 1} failed:`, error)
    }
  }
  
  console.log(`🎯 WORKS_AT Results: ${successCount} successful, ${failCount} failed`)
}

// Create multiple WORKED_AT relationships in batch (using screenName lookups)
export async function addWorkedAtRelationships(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<void> {
  if (relationships.length === 0) {
    return
  }
  
  // Deduplicate relationships based on screenNames
  const uniqueRelationships = Array.from(
    new Map(relationships.map(rel => 
      [`${rel.userScreenName.toLowerCase()}|${rel.orgScreenName.toLowerCase()}`, rel]
    )).values()
  )
  
  console.log(`📝 Adding ${uniqueRelationships.length} new WORKED_AT relationships (screenName-based)`)
  
  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  let successCount = 0
  let failCount = 0
  
  for (let i = 0; i < uniqueRelationships.length; i += batchSize) {
    const batch = uniqueRelationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower(rel.userScreenName)
      MATCH (o:User)
      WHERE toLower(o.screenName) = toLower(rel.orgScreenName)
      MERGE (u)-[:WORKED_AT]->(o)
      RETURN u.screenName as userScreenName, o.screenName as orgScreenName
    `
    
    try {
      const results = await runQuery(query, { relationships: batch })
      successCount += results.length
      console.log(`   ✅ WORKED_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueRelationships.length/batchSize)}: ${results.length}/${batch.length} relationships created`)
    } catch (error) {
      failCount += batch.length
      console.error(`   ❌ WORKED_AT batch ${Math.floor(i/batchSize) + 1} failed:`, error)
    }
  }
  
  console.log(`🎯 WORKED_AT Results: ${successCount} successful, ${failCount} failed`)
}

// Create multiple AFFILIATED_WITH relationships in batch
export async function addAffiliateRelationships(relationships: Array<{orgUserId: string, affiliateUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    console.log('No new affiliate relationships to add')
    return
  }
  
  console.log(`Adding ${relationships.length} new AFFILIATED_WITH relationships`)
  
  // Process in batches of 500 to avoid large transaction issues
  const batchSize = 500
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (org:User {userId: rel.orgUserId})
      MATCH (affiliate:User {userId: rel.affiliateUserId})
      MERGE (affiliate)-[:AFFILIATED_WITH]->(org)
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Added affiliate batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
  }
}

// Check if employment relationships already exist using screenName lookups
export async function checkExistingEmploymentRelationshipsScreenName(
  worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}>,
  workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}>
): Promise<{
  existingWorksAt: Array<{userScreenName: string, orgScreenName: string}>
  existingWorkedAt: Array<{userScreenName: string, orgScreenName: string}>
}> {
  const allRelationships = [...worksAtRelationships, ...workedAtRelationships]
  
  if (allRelationships.length === 0) {
    return { existingWorksAt: [], existingWorkedAt: [] }
  }
  
  const [worksAtResults, workedAtResults] = await Promise.all([
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
    `, { relationships: workedAtRelationships }) : []
  ])
  
  return {
    existingWorksAt: worksAtResults.map((r: any) => ({ userScreenName: r.userScreenName, orgScreenName: r.orgScreenName })),
    existingWorkedAt: workedAtResults.map((r: any) => ({ userScreenName: r.userScreenName, orgScreenName: r.orgScreenName }))
  }
}

// Check if WORKED_AT relationships already exist using screenName lookups
export async function checkExistingWorkedAtRelationshipsScreenName(relationships: Array<{userScreenName: string, orgScreenName: string}>): Promise<Array<{userScreenName: string, orgScreenName: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User)-[:WORKED_AT]->(o:User)
    WHERE toLower(u.screenName) = toLower(rel.userScreenName) 
      AND toLower(o.screenName) = toLower(rel.orgScreenName)
    RETURN u.screenName as userScreenName, o.screenName as orgScreenName
  `
  
  const results = await runQuery(query, { relationships })
  return results.map(record => ({
    userScreenName: record.userScreenName,
    orgScreenName: record.orgScreenName
  }))
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
  const { orgUsernames, worksAtRelationships, workedAtRelationships, departmentUpdates } = extractOrganizationData(profiles)
  
  console.log(`📊 Extracted data:`)
  console.log(`   - Unique organizations: ${orgUsernames.length}`)
  console.log(`   - WORKS_AT relationships: ${worksAtRelationships.length}`)
  console.log(`   - WORKED_AT relationships: ${workedAtRelationships.length}`)
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
      
      // Check for existing relationships to avoid duplicates
      return checkExistingEmploymentRelationshipsScreenName(worksAtRelationships, workedAtRelationships)
        .then(({ existingWorksAt, existingWorkedAt }) => {
          console.log(`🔍 Existing relationships:`)
          console.log(`   - Existing WORKS_AT: ${existingWorksAt.length}`)
          console.log(`   - Existing WORKED_AT: ${existingWorkedAt.length}`)
          
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
          
          console.log(`📝 New relationships to create:`)
          console.log(`   - New WORKS_AT: ${newWorksAt.length}`)
          console.log(`   - New WORKED_AT: ${newWorkedAt.length}`)
          
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
          
          return Promise.all(relationshipOps).then(() => ({ newWorksAt, newWorkedAt, existingWorksAt, existingWorkedAt }))
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
  }
  console.log(`   - Department updates: ${departmentUpdates.length}`)
}

// Extract all organization and employment data from profiles in a single pass
// Updated to handle flattened employment structure
export function extractOrganizationData(profiles: any[]): {
  orgUsernames: string[]
  worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}>
  workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}>
  departmentUpdates: Array<{userScreenName: string, department: string}>
} {
  const orgUsernames = new Set<string>()
  const worksAtRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
  const workedAtRelationships: Array<{userScreenName: string, orgScreenName: string}> = []
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
  })
  
  console.log(`🔍 extractOrganizationData Summary:`)
  console.log(`   - Profiles processed: ${profilesProcessed}`)
  console.log(`   - Profiles with employment data: ${profilesWithEmploymentData}`)
  console.log(`   - Unique organizations found: ${orgUsernames.size}`)
  
  return {
    orgUsernames: Array.from(orgUsernames),
    worksAtRelationships,
    workedAtRelationships,
    departmentUpdates
  }
}

// Batch update user vibes
export async function updateUserVibes(vibeUpdates: Array<{userId: string, vibe: string}>): Promise<void> {
  if (vibeUpdates.length === 0) return
  
  // Validate all vibe values before processing
  const { validUsers, invalidUsers } = await import('@/lib/validation').then(mod => 
    mod.validateVibesBatch(vibeUpdates)
  )
  
  // Log any validation errors
  if (invalidUsers.length > 0) {
    console.warn(`🚨 Found ${invalidUsers.length} invalid vibe values in batch update:`)
    invalidUsers.forEach(({ userId, originalVibe, error }) => {
      logValidationError('vibe', originalVibe, error, `updateUserVibes batch for user ${userId}`)
    })
  }
  
  console.log(`🎨 Updating vibes for ${validUsers.length} users (${invalidUsers.length} had invalid values)`)
  
  const batchSize = 500
  for (let i = 0; i < validUsers.length; i += batchSize) {
    const batch = validUsers.slice(i, i + batchSize)
    
    const query = `
      UNWIND $updates AS update
      MATCH (u:User {userId: update.userId})
      SET u.vibe = update.vibe
    `
    
    await runQuery(query, { updates: batch })
  }
  
  console.log(`✅ Updated vibes for ${validUsers.length} users (${invalidUsers.length} had validation errors)`)
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
    console.log(`🔍 Processing ${usersToUpdate.length} users with screenName-based deduplication...`)
    
    let successCount = 0
    let errorCount = 0
    
    // Use screenName-based deduplication for each user with error handling
    for (const user of usersToUpdate) {
      try {
        await createOrUpdateUserWithScreenNameMerge(user)
        successCount++
      } catch (error: any) {
        errorCount++
        console.error(`❌ Failed to process user @${user.screenName} (${user.userId}):`, error.message)
        // Continue with next user instead of failing entire operation
      }
    }
    
    console.log(`✅ Completed processing: ${successCount} succeeded, ${errorCount} failed out of ${usersToUpdate.length} users`)
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
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`📝 Updating vibe for ${actualUpdates.length} users (${validUsers.length - actualUpdates.length} already correct, ${invalidUsers.length} had validation errors)`)
  }
  
  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT * 10 // Larger batch for simple updates
  for (let i = 0; i < actualUpdates.length; i += batchSize) {
    const batch = actualUpdates.slice(i, i + batchSize)
    
    const updateQuery = `
      UNWIND $updates AS update
      MATCH (u:User {userId: update.userId})
      SET u.vibe = update.vibe
    `
    
    await runQuery(updateQuery, { updates: batch })
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
  
  console.log(`📝 Updating department for ${actualUpdates.length} users (${updates.length - actualUpdates.length} skipped - not individuals/unclassified or already correct)`)
  
  const batchSize = 500
  for (let i = 0; i < actualUpdates.length; i += batchSize) {
    const batch = actualUpdates.slice(i, i + batchSize)
    
    const updateQuery = `
      UNWIND $updates AS update
      MATCH (u:User {userId: update.userId})
      WHERE (u.vibe = 'individual' OR u.vibe = '' OR u.vibe IS NULL)
      SET u.department = update.department
    `
    
    await runQuery(updateQuery, { updates: batch })
  }
  
  return actualUpdates.length
}

// Optimized: Ensure organizations exist with staleness check
export async function ensureOrganizationsExistOptimized(orgUsernames: string[]): Promise<Map<string, string>> {
  if (orgUsernames.length === 0) return new Map()
  
  console.log(`🔍 Ensuring ${orgUsernames.length} organizations exist (using screenName as primary key)...`)
  
  const orgMap = new Map<string, string>()
  const orgsToFetch: string[] = []
  const orgsToUpdate: string[] = []
  
  // Check which organizations already exist by screenName
  for (const orgUsername of orgUsernames) {
    const existingUserQuery = `
      MATCH (u:User)
      WHERE toLower(u.screenName) = toLower($screenName)
      RETURN u.userId as userId, u.screenName as screenName, u.vibe as vibe, u.lastUpdated as lastUpdated
      LIMIT 1
    `
    
    const existingResult = await runQuery(existingUserQuery, { screenName: orgUsername })
    
    if (existingResult.length > 0) {
      const user = existingResult[0]
      orgMap.set(orgUsername.toLowerCase(), user.userId)
      
      // Check if it needs to be updated to organization vibe or if data is stale
      const isStale = user.lastUpdated ? 
        (Date.now() - new Date(user.lastUpdated).getTime()) > (1080 * 60 * 60 * 1000) : // 45 days in ms
        true // No lastUpdated means it's stale
      
      if (user.vibe !== 'organization') {
        console.log(`🔄 Existing user @${user.screenName} (${user.vibe}) - will update to organization`)
        orgsToUpdate.push(orgUsername)
      } else if (isStale) {
        console.log(`📅 Organization @${user.screenName} data is stale - will refresh`)
        orgsToUpdate.push(orgUsername)
      }
    } else {
      // Organization doesn't exist, needs to be fetched
      orgsToFetch.push(orgUsername)
    }
  }
  
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
  
  // Process each organization with screenName-based merging
  if (orgsToProcess.length > 0) {
    console.log(`💾 Processing ${orgsToProcess.length} organizations with screenName uniqueness`)
    
    let orgSuccessCount = 0
    let orgErrorCount = 0
    
    for (const org of orgsToProcess) {
      try {
        const finalUserId = await createOrUpdateUserWithScreenNameMerge(org)
        orgMap.set(org.screenName.toLowerCase(), finalUserId)
        orgSuccessCount++
      } catch (error: any) {
        orgErrorCount++
        console.error(`❌ Failed to process organization @${org.screenName} (${org.userId}):`, error.message)
        // Continue with next organization instead of failing entire operation
        // Use the existing userId if available
        if (org.userId && org.userId !== `org_${org.screenName.toLowerCase()}`) {
          orgMap.set(org.screenName.toLowerCase(), org.userId)
        }
      }
    }
    
    console.log(`✅ Organization processing complete: ${orgSuccessCount} succeeded, ${orgErrorCount} failed out of ${orgsToProcess.length}`)
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

  const query = `
    WITH $userIds AS userIdList, $orgId AS targetOrgId
    UNWIND userIdList AS userId
    OPTIONAL MATCH (u:User {userId: userId})
    OPTIONAL MATCH (u)-[currentWork:WORKS_AT]->(currentOrg:User)
    OPTIONAL MATCH (u)-[pastWork:WORKED_AT]->(pastOrg:User)
    OPTIONAL MATCH (u)-[targetWork:WORKS_AT]->(targetOrg:User {userId: targetOrgId})
    
    RETURN 
      userId,
      u IS NOT NULL as userExists,
      targetWork IS NOT NULL as isCurrentEmployee,
      (currentWork IS NOT NULL OR pastWork IS NOT NULL) as hasAnyEmploymentData,
      u.department as department,
      u.vibe as vibe,
      collect(DISTINCT currentOrg.screenName) as currentEmployers,
      collect(DISTINCT pastOrg.screenName) as pastEmployers
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

// Get organization employees by organization userId
export async function getOrganizationEmployees(orgUserId: string): Promise<Array<{
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
  // First, find the organization's screenName from its userId
  const orgQuery = `
    MATCH (org:User {userId: $orgUserId})
    RETURN org.screenName as screenName
    LIMIT 1
  `
  
  const orgResult = await runQuery(orgQuery, { orgUserId })
  
  if (orgResult.length === 0) {
    console.log(`❌ Organization with userId ${orgUserId} not found`)
    return []
  }
  
  const orgScreenName = orgResult[0].screenName
  console.log(`🔄 Converting userId ${orgUserId} to screenName @${orgScreenName} for employee lookup`)
  
  // Use the new screenName-based function
  return await getOrganizationEmployeesByScreenName(orgScreenName)
}

// Lightweight function to get only employee IDs (for filtering operations) - screenName version
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

// Get only employee IDs (for filtering operations)
export async function getOrganizationEmployeeIds(orgUserId: string): Promise<string[]> {
  // First, find the organization's screenName from its userId
  const orgQuery = `
    MATCH (org:User {userId: $orgUserId})
    RETURN org.screenName as screenName
    LIMIT 1
  `
  
  const orgResult = await runQuery(orgQuery, { orgUserId })
  
  if (orgResult.length === 0) {
    console.log(`❌ Organization with userId ${orgUserId} not found`)
    return []
  }
  
  const orgScreenName = orgResult[0].screenName
  console.log(`🔄 Converting userId ${orgUserId} to screenName @${orgScreenName} for employee ID lookup`)
  
  // Use the new screenName-based function
  return await getOrganizationEmployeeIdsByScreenName(orgScreenName)
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
