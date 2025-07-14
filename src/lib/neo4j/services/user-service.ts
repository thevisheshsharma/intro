import { runQuery, runBatchQuery } from '@/lib/neo4j'

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
export function transformToNeo4jUser(apiUser: TwitterApiUser): Neo4jUser {
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
    verificationReason: apiUser.verification_info?.reason || ''
  }
}

// Create or update a user in Neo4j
export async function createOrUpdateUser(user: Neo4jUser): Promise<void> {
  const query = `
    MERGE (u:User {userId: $userId})
    SET u.screenName = $screenName,
        u.name = $name,
        u.profileImageUrl = COALESCE($profileImageUrl, ''),
        u.description = COALESCE($description, ''),
        u.location = COALESCE($location, ''),
        u.url = COALESCE($url, ''),
        u.followersCount = $followersCount,
        u.followingCount = $followingCount,
        u.verified = $verified,
        u.lastUpdated = $lastUpdated,
        u.createdAt = COALESCE($createdAt, ''),
        u.listedCount = COALESCE($listedCount, 0),
        u.statusesCount = COALESCE($statusesCount, 0),
        u.favouritesCount = COALESCE($favouritesCount, 0),
        u.protected = COALESCE($protected, false),
        u.canDm = COALESCE($canDm, false),
        u.profileBannerUrl = COALESCE($profileBannerUrl, ''),
        u.verificationType = COALESCE($verificationType, ''),
        u.verificationReason = COALESCE($verificationReason, '')
    RETURN u
  `
  
  await runQuery(query, user)
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
    OPTIONAL MATCH (u)-[:AFFILIATED_WITH]->(:User)
    WITH u, userId, count(*) > 0 as hasAffiliates
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

// Create or update multiple users in batch with improved batching
export async function createOrUpdateUsers(users: Neo4jUser[]): Promise<void> {
  if (users.length === 0) return
  
  // Process in batches of 100 to avoid large transaction issues
  const batchSize = 100
  for (let i = 0; i < users.length; i += batchSize) {
    const batch = users.slice(i, i + batchSize)
    
    const query = `
      UNWIND $users AS userData
      MERGE (u:User {userId: userData.userId})
      SET u.screenName = userData.screenName,
          u.name = userData.name,
          u.profileImageUrl = COALESCE(userData.profileImageUrl, ''),
          u.description = COALESCE(userData.description, ''),
          u.location = COALESCE(userData.location, ''),
          u.url = COALESCE(userData.url, ''),
          u.followersCount = userData.followersCount,
          u.followingCount = userData.followingCount,
          u.verified = userData.verified,
          u.lastUpdated = userData.lastUpdated,
          u.createdAt = COALESCE(userData.createdAt, ''),
          u.listedCount = COALESCE(userData.listedCount, 0),
          u.statusesCount = COALESCE(userData.statusesCount, 0),
          u.favouritesCount = COALESCE(userData.favouritesCount, 0),
          u.protected = COALESCE(userData.protected, false),
          u.canDm = COALESCE(userData.canDm, false),
          u.profileBannerUrl = COALESCE(userData.profileBannerUrl, ''),
          u.verificationType = COALESCE(userData.verificationType, ''),
          u.verificationReason = COALESCE(userData.verificationReason, '')
    `
    
    await runQuery(query, { users: batch })
    console.log(`Processed batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(users.length/batchSize)} (${batch.length} users)`)
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

// Create FOLLOWS relationships for specific user IDs only
export async function addFollowsRelationships(relationships: Array<{followerUserId: string, followingUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    console.log('No new relationships to add')
    return
  }
  
  console.log(`Adding ${relationships.length} new FOLLOWS relationships`)
  
  // Process in batches of 500 to avoid large transaction issues
  const batchSize = 500
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (follower:User {userId: rel.followerUserId})
      MATCH (following:User {userId: rel.followingUserId})
      MERGE (follower)-[:FOLLOWS]->(following)
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Added relationship batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
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
    const neo4jUsers = newFollowersToAdd.map(transformToNeo4jUser)
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
    const neo4jUsers = newFollowingsToAdd.map(transformToNeo4jUser)
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
    MERGE (org)-[:AFFILIATED_WITH]->(affiliate)
  `
  
  await runQuery(query, { orgUserId, affiliateUserId })
}

// Check if organization has affiliate data
export async function hasAffiliateData(orgUserId: string): Promise<boolean> {
  console.log(`🔍 [Neo4j] Checking affiliate data for user: ${orgUserId}`)
  const query = `
    MATCH (org:User {userId: $orgUserId})-[:AFFILIATED_WITH]->(:User)
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
    MATCH (org:User {userId: $orgUserId})-[:AFFILIATED_WITH]->(affiliate:User)
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
      MERGE (org)-[:AFFILIATED_WITH]->(affiliate)
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Added affiliate batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
  }
}

// Check if AFFILIATED_WITH relationships already exist
export async function checkExistingAffiliateRelationships(relationships: Array<{orgUserId: string, affiliateUserId: string}>): Promise<Array<{orgUserId: string, affiliateUserId: string}>> {
  if (relationships.length === 0) return []
  
  const query = `
    UNWIND $relationships AS rel
    MATCH (org:User {userId: rel.orgUserId})-[:AFFILIATED_WITH]->(affiliate:User {userId: rel.affiliateUserId})
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

// Batch lookup users by screen names (case-insensitive) with detailed result mapping
export async function getUsersByScreenNamesWithMapping(screenNames: string[]): Promise<{
  found: Array<{screenName: string, user: Neo4jUser}>,
  notFound: string[]
}> {
  if (screenNames.length === 0) return { found: [], notFound: [] }
  
  const query = `
    UNWIND $screenNames AS screenName
    OPTIONAL MATCH (u:User)
    WHERE toLower(u.screenName) = toLower(screenName)
    RETURN screenName, u
  `
  
  const results = await runQuery(query, { screenNames })
  const found: Array<{screenName: string, user: Neo4jUser}> = []
  const notFound: string[] = []
  
  results.forEach(record => {
    if (record.u?.properties) {
      found.push({
        screenName: record.screenName,
        user: record.u.properties
      })
    } else {
      notFound.push(record.screenName)
    }
  })
  
  return { found, notFound }
}

// Optimized batch user existence and count retrieval
export async function batchUserStatsLookup(userIds: string[]): Promise<Array<{
  userId: string,
  exists: boolean,
  followerCount: number,
  followingCount: number,
  user?: Neo4jUser
}>> {
  if (userIds.length === 0) return []
  
  const query = `
    UNWIND $userIds AS userId
    OPTIONAL MATCH (u:User {userId: userId})
    OPTIONAL MATCH (follower:User)-[:FOLLOWS]->(u)
    OPTIONAL MATCH (u)-[:FOLLOWS]->(following:User)
    RETURN userId, 
           u,
           count(DISTINCT follower) as followerCount,
           count(DISTINCT following) as followingCount
  `
  
  const results = await runQuery(query, { userIds })
  return results.map(record => ({
    userId: record.userId,
    exists: !!record.u?.properties,
    followerCount: record.followerCount?.low || 0,
    followingCount: record.followingCount?.low || 0,
    user: record.u?.properties || undefined
  }))
}
