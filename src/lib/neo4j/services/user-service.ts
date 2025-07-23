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
  vibe?: string               // department/role from Grok analysis
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
    vibe: vibe || ''
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
        u.verificationReason = COALESCE($verificationReason, ''),
        u.vibe = COALESCE($vibe, '')
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
          u.verificationReason = COALESCE(userData.verificationReason, ''),
          u.vibe = COALESCE(userData.vibe, '')
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
    vibe: 'organization' // Mark as organization using vibe field
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

// Create multiple WORKS_AT relationships in batch
export async function addWorksAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    console.log('No new WORKS_AT relationships to add')
    return
  }
  
  console.log(`Adding ${relationships.length} new WORKS_AT relationships`)
  
  const batchSize = 500
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})
      MATCH (o:User {userId: rel.orgUserId})
      WHERE o.vibe = 'organization'
      MERGE (u)-[:WORKS_AT]->(o)
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Added WORKS_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
  }
}

// Create multiple WORKED_AT relationships in batch
export async function addWorkedAtRelationships(relationships: Array<{userId: string, orgUserId: string}>): Promise<void> {
  if (relationships.length === 0) {
    console.log('No new WORKED_AT relationships to add')
    return
  }
  
  console.log(`Adding ${relationships.length} new WORKED_AT relationships`)
  
  const batchSize = 500
  for (let i = 0; i < relationships.length; i += batchSize) {
    const batch = relationships.slice(i, i + batchSize)
    
    const query = `
      UNWIND $relationships AS rel
      MATCH (u:User {userId: rel.userId})
      MATCH (o:User {userId: rel.orgUserId})
      WHERE o.vibe = 'organization'
      MERGE (u)-[:WORKED_AT]->(o)
    `
    
    await runQuery(query, { relationships: batch })
    console.log(`Added WORKED_AT batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(relationships.length/batchSize)} (${batch.length} relationships)`)
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

// Optimized: Process all employment data efficiently
export async function processEmploymentData(profiles: any[]): Promise<void> {
  if (!profiles.length) return
  
  console.log(`🚀 Processing employment data for ${profiles.length} profiles`)
  const startTime = Date.now()
  
  // Extract all organization data in single pass
  const { orgUsernames, worksAtRelationships, workedAtRelationships, vibeUpdates } = extractOrganizationData(profiles)
  
  if (orgUsernames.length === 0) {
    console.log('No organizations found to process')
    return
  }
  
  console.log(`� Found ${orgUsernames.length} unique organizations`)
  
  // Ensure all organizations exist in Neo4j with staleness check
  const orgMap = await ensureOrganizationsExistOptimized(orgUsernames)
  
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
  const allRelationships = [
    ...worksAtWithUserIds,
    ...workedAtWithUserIds
  ]
  
  const { existingWorksAt, existingWorkedAt } = await checkExistingEmploymentRelationships(allRelationships)
  
  // Filter out existing relationships
  const { newWorksAt, newWorkedAt } = filterOutExistingEmploymentRelationships(
    worksAtWithUserIds,
    workedAtWithUserIds,
    existingWorksAt,
    existingWorkedAt
  )
  
  // Execute all operations in parallel
  const operations = []
  
  if (newWorksAt.length > 0) {
    operations.push(addWorksAtRelationships(newWorksAt))
  }
  
  if (newWorkedAt.length > 0) {
    operations.push(addWorkedAtRelationships(newWorkedAt))
  }
  
  if (vibeUpdates.length > 0) {
    operations.push(updateUserVibesOptimized(vibeUpdates))
  }
  
  if (operations.length > 0) {
    await Promise.all(operations)
  }
  
  const duration = Date.now() - startTime
  console.log(`✅ Employment data processing complete in ${duration}ms`)
  console.log(`   - New WORKS_AT: ${newWorksAt.length} (${existingWorksAt.length} already existed)`)
  console.log(`   - New WORKED_AT: ${newWorkedAt.length} (${existingWorkedAt.length} already existed)`)
  console.log(`   - Vibe updates: ${vibeUpdates.length}`)
}

// Batch ensure multiple organizations exist as User nodes with vibe='organization'
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
  
  // Fetch missing organizations in parallel batches
  const newOrgs: Neo4jUser[] = []
  const batchSize = 10
  
  for (let i = 0; i < orgsToFetch.length; i += batchSize) {
    const batch = orgsToFetch.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (username) => {
      try {
        const apiUser = await fetchOrganizationFromSocialAPI(username)
        return apiUser ? transformToNeo4jOrganization(apiUser) : null
      } catch (error: any) {
        console.warn(`⚠️ Failed to fetch @${username}:`, error.message)
        return null
      }
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        newOrgs.push(result.value)
      }
    })
  }
  
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
  vibeUpdates: Array<{userId: string, vibe: string}>
} {
  const orgUsernames = new Set<string>()
  const worksAtRelationships: Array<{userId: string, orgUsername: string}> = []
  const workedAtRelationships: Array<{userId: string, orgUsername: string}> = []
  const vibeUpdates: Array<{userId: string, vibe: string}> = []
  
  profiles.forEach(profile => {
    const userId = profile.id_str || profile.id
    if (!userId) return
    
    const grokAnalysis = profile._grok_analysis
    if (!grokAnalysis) return
    
    // Extract vibe/department
    if (grokAnalysis.current_position?.department) {
      vibeUpdates.push({
        userId,
        vibe: grokAnalysis.current_position.department
      })
    }
    
    // Current organizations
    if (grokAnalysis.current_position?.organizations) {
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
    vibeUpdates
  }
}

// Batch update user vibes
export async function updateUserVibes(vibeUpdates: Array<{userId: string, vibe: string}>): Promise<void> {
  if (vibeUpdates.length === 0) return
  
  console.log(`🎨 Updating vibes for ${vibeUpdates.length} users`)
  
  const batchSize = 500
  for (let i = 0; i < vibeUpdates.length; i += batchSize) {
    const batch = vibeUpdates.slice(i, i + batchSize)
    
    const query = `
      UNWIND $updates AS update
      MATCH (u:User {userId: update.userId})
      SET u.vibe = update.vibe
    `
    
    await runQuery(query, { updates: batch })
  }
  
  console.log(`✅ Updated vibes for ${vibeUpdates.length} users`)
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
  
  console.log(`🔍 Checking vibe updates for ${updates.length} users...`)
  
  // First, check which users actually need vibe updates
  const userIds = updates.map(u => u.userId)
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
  const actualUpdates = updates.filter(update => {
    const currentVibe = currentVibes.get(update.userId) || ''
    return currentVibe !== update.vibe
  })
  
  if (actualUpdates.length === 0) {
    console.log(`✅ All vibes are already up-to-date`)
    return 0
  }
  
  console.log(`📝 Updating vibe for ${actualUpdates.length} users (${updates.length - actualUpdates.length} already correct)`)
  
  const batchSize = 500
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
