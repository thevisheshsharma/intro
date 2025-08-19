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
  department?: string         // current department/role from current_position.department
  // Organization classification fields (can be null for individuals/spam accounts)
  org_type?: string           // Organization type: protocol, infrastructure, exchange, investment, service, community
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
    profileImageUrl: apiUser.profile_image_url_https || '',
    description: apiUser.description || '',
    location: apiUser.location || '',
    url: apiUser.url || '',
    followersCount: apiUser.followers_count || 0,
    followingCount: apiUser.friends_count || 0,
    verified: Boolean(apiUser.verified),
    lastUpdated: new Date().toISOString(),
    // Map additional fields with defaults
    createdAt: apiUser.created_at || '',
    listedCount: apiUser.listed_count || 0,
    statusesCount: apiUser.statuses_count || 0,
    favouritesCount: apiUser.favourites_count || 0,
    protected: Boolean(apiUser.protected),
    canDm: Boolean(apiUser.can_dm),
    profileBannerUrl: apiUser.profile_banner_url || '',
    verificationType: apiUser.verification_info?.type || '',
    verificationReason: apiUser.verification_info?.reason || '',
    vibe: sanitizedVibe,
    department: '',       // Initialize department field
    // Organization classification fields - set to empty strings by default, updated by classifier
    org_type: '',
    org_subtype: '',
    web3_focus: ''
  }
}

// Create or update a user in Neo4j (optimized query)
export async function createOrUpdateUser(user: Neo4jUser): Promise<void> {
  // Validate vibe field before saving
  const vibeValidation = validateVibe(user.vibe)
  if (!vibeValidation.isValid) {
    logValidationError('vibe', user.vibe, vibeValidation.error!, `createOrUpdateUser for user ${user.userId}`)
  }
  
  // Use sanitized vibe value
  const validatedUser = {
    ...user,
    vibe: vibeValidation.sanitizedValue
  }

  // Optimized query with better MERGE and SET patterns
  const query = `
    MERGE (u:User {userId: $userId})
    ON CREATE SET
      u.screenName = $screenName,
      u.name = $name,
      u.createdAt = $createdAt,
      u.lastUpdated = $lastUpdated
    ON MATCH SET
      u.lastUpdated = $lastUpdated
    SET
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
    RETURN u.userId as userId
  `
  
  // Ensure all parameters are defined (remove COALESCE overhead)
  const finalUser = {
    ...validatedUser,
    profileImageUrl: validatedUser.profileImageUrl || '',
    description: validatedUser.description || '',
    location: validatedUser.location || '',
    url: validatedUser.url || '',
    createdAt: validatedUser.createdAt || new Date().toISOString(),
    profileBannerUrl: validatedUser.profileBannerUrl || '',
    verificationType: validatedUser.verificationType || '',
    verificationReason: validatedUser.verificationReason || '',
    department: validatedUser.department || '',
    org_type: validatedUser.org_type || '',
    org_subtype: validatedUser.org_subtype || '',
    web3_focus: validatedUser.web3_focus || ''
  }
  
  await runQuery(query, finalUser)
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

// Batch get follower counts for multiple users
export async function getUserFollowerCounts(userIds: string[]): Promise<Array<{userId: string, followerCount: number}>> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)
    RETURN userId, count(follower) as followerCount
  `
  
  const results = await runQuery(query, { userIds })
  return results.map(record => ({
    userId: record.userId,
    followerCount: record.followerCount?.low || 0
  }))
}

// Batch get following counts for multiple users
export async function getUserFollowingCounts(userIds: string[]): Promise<Array<{userId: string, followingCount: number}>> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
    RETURN userId, count(following) as followingCount
  `
  
  const results = await runQuery(query, { userIds })
  return results.map(record => ({
    userId: record.userId,
    followingCount: record.followingCount?.low || 0
  }))
}

// Batch check if users have specific data types (affiliate, following)
export async function batchCheckUserDataTypes(userIds: string[]): Promise<Array<{
  userId: string,
  hasAffiliateData: boolean,
  hasFollowingData: boolean
}>> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    MATCH (u:User {userId: userId})
    OPTIONAL MATCH (affiliate:User)-[:AFFILIATED_WITH]->(u)
    WITH u, userId, count(affiliate) > 0 as hasAffiliates
    OPTIONAL MATCH (u)-[:FOLLOWS]->(:User)
    RETURN userId, hasAffiliates as hasAffiliateData, count(*) > 0 as hasFollowingData
  `
  
  const results = await runQuery(query, { userIds })
  return results.map(record => ({
    userId: record.userId,
    hasAffiliateData: record.hasAffiliateData || false,
    hasFollowingData: record.hasFollowingData || false
  }))
}

// Create or update multiple users in batch with optimized batching
export async function createOrUpdateUsers(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return
  
  // Use optimized batch size
  const batchSize = OPTIMAL_BATCH_SIZES.USER_UPSERT
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    
    // Pre-sanitize batch to ensure all parameters are defined
    const sanitizedBatch = batch.map(user => ({
      ...user,
      profileImageUrl: user.profileImageUrl || '',
      description: user.description || '',
      location: user.location || '',
      url: user.url || '',
      createdAt: user.createdAt || new Date().toISOString(),
      profileBannerUrl: user.profileBannerUrl || '',
      verificationType: user.verificationType || '',
      verificationReason: user.verificationReason || '',
      department: user.department || '',
      org_type: user.org_type || '',
      org_subtype: user.org_subtype || '',
      web3_focus: user.web3_focus || ''
    }))
    
    // Optimized bulk upsert query
    const query = `
      UNWIND $users AS userData
      MERGE (u:User {userId: userData.userId})
      ON CREATE SET
        u.screenName = userData.screenName,
        u.name = userData.name,
        u.createdAt = userData.createdAt,
        u.lastUpdated = userData.lastUpdated
      ON MATCH SET
        u.lastUpdated = userData.lastUpdated
      SET
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
    `
    
    await runQuery(query, { users: sanitizedBatch })
    
    // Reduced logging for performance
    if (process.env.NODE_ENV === 'development') {
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)} (${batch.length} users)`)
    }
  }
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
    profileImageUrl: apiUser.profile_image_url_https || '',
    description: apiUser.description || '',
    location: apiUser.location || '',
    url: apiUser.url || '',
    followersCount: apiUser.followers_count || 0,
    followingCount: apiUser.friends_count || 0,
    verified: Boolean(apiUser.verified),
    lastUpdated: new Date().toISOString(),
    createdAt: apiUser.created_at || '',
    listedCount: apiUser.listed_count || 0,
    statusesCount: apiUser.statuses_count || 0,
    favouritesCount: apiUser.favourites_count || 0,
    protected: Boolean(apiUser.protected),
    canDm: Boolean(apiUser.can_dm),
    profileBannerUrl: apiUser.profile_banner_url || '',
    verificationType: apiUser.verification_info?.type || '',
    verificationReason: apiUser.verification_info?.reason || '',
    vibe: 'organization', // Mark as organization using vibe field
    department: '',      // Not applicable for organizations
    // Organization classification fields - set to empty strings by default, updated by classifier
    org_type: '',
    org_subtype: '',
    web3_focus: ''
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

// Create WORKS_AT relationship between user and organization (both User nodes)
export async function createWorksAtRelationship(userId: string, orgUserId: string): Promise<void> {
  const query = `
    MATCH (u:User {userId: $userId})
    MATCH (o:User {userId: $orgUserId})
    WHERE o.vibe = 'organization'
    MERGE (u)-[:WORKS_AT]->(o)
  `
  
  await runQuery(query, { userId, orgUserId })
}

// Create WORKED_AT relationship between user and organization (both User nodes)
export async function createWorkedAtRelationship(userId: string, orgUserId: string): Promise<void> {
  const query = `
    MATCH (u:User {userId: $userId})
    MATCH (o:User {userId: $orgUserId})
    WHERE o.vibe = 'organization'
    MERGE (u)-[:WORKED_AT]->(o)
  `
  
  await runQuery(query, { userId, orgUserId })
}

// Create multiple WORKS_AT relationships in batch (optimized)
export async function addWorksAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    return // Remove unnecessary logging
  }
  
  // Deduplicate relationships
  const uniqueRelationships = deduplicateRelationships(relationships)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Adding ${uniqueRelationships.length} new WORKS_AT relationships`)
  }
  
  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  for (let i = 0; i < uniqueRelationships.length; i += batchSize) {
    const batch = uniqueRelationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})
      MATCH (o:User {userId: rel.orgUserId})
      WHERE o.vibe = 'organization'
      MERGE (u)-[:WORKS_AT]->(o)
    `
    
    await runQuery(query, { relationships: batch })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Added WORKS_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueRelationships.length/batchSize)} (${batch.length} relationships)`)
    }
  }
}

// Create multiple WORKED_AT relationships in batch (optimized)
export async function addWorkedAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    return // Remove unnecessary logging
  }
  
  // Deduplicate relationships
  const uniqueRelationships = deduplicateRelationships(relationships)
  
  if (process.env.NODE_ENV === 'development') {
    console.log(`Adding ${uniqueRelationships.length} new WORKED_AT relationships`)
  }
  
  const batchSize = OPTIMAL_BATCH_SIZES.RELATIONSHIP_BATCH
  for (let i = 0; i < uniqueRelationships.length; i += batchSize) {
    const batch = uniqueRelationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})
      MATCH (o:User {userId: rel.orgUserId})
      WHERE o.vibe = 'organization'
      MERGE (u)-[:WORKED_AT]->(o)
    `
    
    await runQuery(query, { relationships: batch })
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Added WORKED_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(uniqueRelationships.length/batchSize)} (${batch.length} relationships)`)
    }
  }
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

// Check if WORKS_AT relationships already exist (for deduplication)
export async function checkExistingWorksAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<Array<{userId: string, orgUserId: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User {userId: rel.userId})-[:WORKS_AT]->(o:User {userId: rel.orgUserId})
    RETURN rel.userId as userId, rel.orgUserId as orgUserId
  `
  
  const results = await runQuery(query, { relationships })
  return results.map(record => ({
    userId: record.userId,
    orgUserId: record.orgUserId
  }))
}

// Check if WORKED_AT relationships already exist (for deduplication)
export async function checkExistingWorkedAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<Array<{userId: string, orgUserId: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (u:User {userId: rel.userId})-[:WORKED_AT]->(o:User {userId: rel.orgUserId})
    RETURN rel.userId as userId, rel.orgUserId as orgUserId
  `
  
  const results = await runQuery(query, { relationships })
  return results.map(record => ({
    userId: record.userId,
    orgUserId: record.orgUserId
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

// Optimized: Remove artificial delays, use Promise.allSettled for true parallelism
export async function fetchOrganizationFromSocialAPI(username: string): Promise<TwitterApiUser | null> {
  try {
    if (!process.env.SOCIALAPI_BEARER_TOKEN) {
      console.error('[Config] SOCIALAPI_BEARER_TOKEN not configured')
      return null
    }

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
}

// Ultra-fast employment data processing with parallel operations
export async function processEmploymentData(profiles: any[]): Promise<void> {
  if (!profiles.length) return
  
  console.log(`🚀 Processing employment data for ${profiles.length} profiles`)
  const startTime = Date.now()
  
  // Extract all organization data in single pass
  const { orgUsernames, worksAtRelationships, workedAtRelationships, departmentUpdates } = extractOrganizationData(profiles)
  
  if (orgUsernames.length === 0) {
    console.log('No organizations found to process')
    return
  }
  
  console.log(`📊 Found ${orgUsernames.length} unique organizations`)
  
  // Parallel execution of all operations that don't have dependencies
  const operations = []
  
  // 1. Ensure organizations exist
  operations.push(
    ensureOrganizationsExistOptimized(orgUsernames).then(orgMap => {
      // Convert username-based relationships to userId-based relationships
      const worksAtWithUserIds: Array<{userId: string, orgUserId: string}> = []
      const workedAtWithUserIds: Array<{userId: string, orgUserId: string}> = []
      
      worksAtRelationships.forEach(({ userId, orgUsername }) => {
        const orgUserId = orgMap.get(orgUsername.toLowerCase())
        if (orgUserId) {
          worksAtWithUserIds.push({ userId, orgUserId })
        }
      })
      
      workedAtRelationships.forEach(({ userId, orgUsername }) => {
        const orgUserId = orgMap.get(orgUsername.toLowerCase())
        if (orgUserId) {
          workedAtWithUserIds.push({ userId, orgUserId })
        }
      })
      
      // Check for existing relationships to avoid duplicates
      return checkExistingEmploymentRelationships([...worksAtWithUserIds, ...workedAtWithUserIds])
        .then(({ existingWorksAt, existingWorkedAt }) => {
          // Filter out existing relationships
          const { newWorksAt, newWorkedAt } = filterOutExistingEmploymentRelationships(
            worksAtWithUserIds,
            workedAtWithUserIds,
            existingWorksAt,
            existingWorkedAt
          )
          
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
  
  // 2. Update departments in parallel
  if (departmentUpdates.length > 0) {
    console.log(`   → Updating ${departmentUpdates.length} user departments...`)
    operations.push(updateUserDepartmentsOptimized(departmentUpdates))
  }
  
  // Execute all operations in parallel
  const results = await Promise.all(operations)
  const relationshipResults = results[0] as any
  
  const duration = Date.now() - startTime
  console.log(`✅ Employment data processing complete in ${duration}ms`)
  
  if (relationshipResults) {
    console.log(`   - New WORKS_AT: ${relationshipResults.newWorksAt?.length || 0} (${relationshipResults.existingWorksAt?.length || 0} already existed)`)
    console.log(`   - New WORKED_AT: ${relationshipResults.newWorkedAt?.length || 0} (${relationshipResults.existingWorkedAt?.length || 0} already existed)`)
  }
  console.log(`   - Department updates: ${departmentUpdates.length}`)
}

// Ultra-fast organization existence ensuring with optimized API calls
export async function ensureOrganizationsExist(orgUsernames: string[]): Promise<Map<string, string>> {
  if (orgUsernames.length === 0) return new Map()
  
  console.log(`🔍 Ensuring ${orgUsernames.length} organizations exist...`)
  
  // Check which organizations already exist
  const existingOrgs = await getOrganizationsByScreenNames(orgUsernames)
  const existingOrgMap = new Map<string, string>()
  existingOrgs.forEach(org => {
    existingOrgMap.set(org.organization.screenName.toLowerCase(), org.organization.userId)
  })
  
  // Find organizations that need to be fetched
  const orgsToFetch = orgUsernames.filter(username => 
    !existingOrgMap.has(username.toLowerCase())
  )
  
  if (orgsToFetch.length === 0) {
    console.log(`✅ All ${orgUsernames.length} organizations already exist`)
    return existingOrgMap
  }
  
  console.log(`🌐 Fetching ${orgsToFetch.length} missing organizations from SocialAPI`)
  
  // Fetch missing organizations with optimized batch size and parallel processing
  const newOrgs: Neo4jUser[] = []
  const batchSize = OPTIMAL_BATCH_SIZES.EXTERNAL_API
  
  // Process in smaller batches with better error handling
  const fetchPromises = []
  for (let i = 0; i < orgsToFetch.length; i += batchSize) {
    const batch = orgsToFetch.slice(i, i + batchSize)
    
    const batchPromise = Promise.all(
      batch.map(async (username) => {
        try {
          const apiUser = await fetchOrganizationFromSocialAPI(username)
          return apiUser ? transformToNeo4jOrganization(apiUser) : null
        } catch (error: any) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(`⚠️ Failed to fetch @${username}:`, error.message)
          }
          return null
        }
      })
    )
    
    fetchPromises.push(batchPromise)
  }
  
  // Execute all batch promises in parallel
  const batchResults = await Promise.allSettled(fetchPromises)
  
  // Flatten results and filter out nulls
  batchResults.forEach((result) => {
    if (result.status === 'fulfilled') {
      result.value.forEach(org => {
        if (org) newOrgs.push(org)
      })
    }
  })
  
  // Store new organizations in single batch
  if (newOrgs.length > 0) {
    console.log(`💾 Storing ${newOrgs.length} new organizations`)
    await createOrUpdateUsers(newOrgs)
    
    // Add to map
    newOrgs.forEach(org => {
      existingOrgMap.set(org.screenName.toLowerCase(), org.userId)
    })
  }
  
  console.log(`✅ Organization ensure complete: ${existingOrgMap.size} total`)
  return existingOrgMap
}

// Extract all organization and employment data from profiles in a single pass
export function extractOrganizationData(profiles: any[]): {
  orgUsernames: string[]
  worksAtRelationships: Array<{userId: string, orgUsername: string}>
  workedAtRelationships: Array<{userId: string, orgUsername: string}>
  departmentUpdates: Array<{userId: string, department: string}>
} {
  const orgUsernames = new Set<string>()
  const worksAtRelationships: Array<{userId: string, orgUsername: string}> = []
  const workedAtRelationships: Array<{userId: string, orgUsername: string}> = []
  const departmentUpdates: Array<{userId: string, department: string}> = []
  
  profiles.forEach(profile => {
    const userId = profile.id_str || profile.id
    if (!userId) return
    
    const grokAnalysis = profile._grok_analysis
    if (!grokAnalysis) return
    
    // Extract department (only for users who are already classified as individuals)
    if (grokAnalysis.current_position?.department) {
      departmentUpdates.push({
        userId,
        department: grokAnalysis.current_position.department
      })
    }
    
    // Current organizations - handle null organizations array
    if (grokAnalysis.current_position?.organizations && Array.isArray(grokAnalysis.current_position.organizations)) {
      grokAnalysis.current_position.organizations.forEach((org: string) => {
        const cleanOrg = org.replace(/^@/, '').toLowerCase()
        if (cleanOrg && cleanOrg.length > 0) {
          orgUsernames.add(cleanOrg)
          worksAtRelationships.push({ userId, orgUsername: cleanOrg })
        }
      })
    }
    
    // Past organizations
    if (grokAnalysis.employment_history && Array.isArray(grokAnalysis.employment_history)) {
      grokAnalysis.employment_history.forEach((employment: any) => {
        if (employment.organization) {
          const cleanOrg = employment.organization.replace(/^@/, '').toLowerCase()
          if (cleanOrg && cleanOrg.length > 0) {
            orgUsernames.add(cleanOrg)
            workedAtRelationships.push({ userId, orgUsername: cleanOrg })
          }
        }
      })
    }
  })
  
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
    await createOrUpdateUsers(usersToUpdate)
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
  
  console.log(`🔍 Ensuring ${orgUsernames.length} organizations exist...`)
  
  // Single batch lookup of existing organizations
  const existingOrgs = await getOrganizationsByScreenNames(orgUsernames)
  const orgMap = new Map<string, string>()
  const existingUsernames = new Set<string>()
  const staleOrgs: string[] = []
  
  existingOrgs.forEach(org => {
    const username = org.organization.screenName.toLowerCase()
    orgMap.set(username, org.organization.userId)
    existingUsernames.add(username)
    
    // Check if org data is stale (older than 45 days for organizations)
    if (isUserDataStale(org.organization, 1080)) { // 45 days = 1080 hours
      staleOrgs.push(username)
    }
  })
  
  // Find missing organizations
  const missingOrgs = orgUsernames.filter(username => 
    !existingUsernames.has(username.toLowerCase())
  )
  
  // Combine missing and stale organizations for update
  const orgsToFetch = [...missingOrgs, ...staleOrgs]
  
  if (orgsToFetch.length === 0) {
    console.log(`✅ All ${orgUsernames.length} organizations are up-to-date`)
    return orgMap
  }
  
  console.log(`📥 Fetching ${orgsToFetch.length} organizations from SocialAPI (${missingOrgs.length} missing, ${staleOrgs.length} stale)`)
  
  // Parallel fetch with concurrency control
  const fetchPromises = orgsToFetch.map(username => 
    fetchOrganizationFromSocialAPI(username)
  )
  
  const results = await Promise.allSettled(fetchPromises)
  const newOrgs: Neo4jUser[] = []
  
  results.forEach((result, idx) => {
    if (result.status === 'fulfilled' && result.value) {
      const org = transformToNeo4jOrganization(result.value)
      newOrgs.push(org)
      orgMap.set(orgsToFetch[idx].toLowerCase(), org.userId)
    }
  })
  
  // Batch create/update all new/stale organizations at once
  if (newOrgs.length > 0) {
    await createOrUpdateUsers(newOrgs)
    console.log(`💾 Created/updated ${newOrgs.length} organizations`)
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

// Get all users who have WORKS_AT relationship with the organization
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
  console.log(`👥 Fetching all employees for organization ${orgUserId}...`)
  
  const query = `
    MATCH (org:User {userId: $orgUserId})
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
  
  const results = await runQuery(query, { orgUserId })
  
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
    verified: record.verified || false,
    createdAt: record.createdAt,
    listedCount: record.listedCount,
    statusesCount: record.statusesCount,
    favouritesCount: record.favouritesCount,
    protected: record.protected,
    canDm: record.canDm,
    profileBannerUrl: record.profileBannerUrl,
    verificationType: record.verificationType,
    verificationReason: record.verificationReason,
    vibe: record.vibe,
    department: record.department,
    position: record.position,
    startDate: record.startDate,
    endDate: record.endDate
  }))
  
  console.log(`✅ Found ${employees.length} employees for organization`)
  
  return employees
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
      u.org_type = COALESCE(org.classification.org_type, u.org_type, ''),
      u.org_subtype = COALESCE(org.classification.org_subtype, u.org_subtype, ''),
      u.web3_focus = COALESCE(org.classification.web3_focus, u.web3_focus, ''),
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
