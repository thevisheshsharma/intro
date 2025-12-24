import { NextRequest, NextResponse } from 'next/server'
import {
  createOrUpdateUserWithScreenNameMerge,
  getUserByScreenName,
  getUsersByScreenNames,
  findTwoPOVMutuals,
  transformToNeo4jUser,
  isUserDataStale,
  getUserFollowerCount,
  getUserFollowingCount,
  hasSignificantCountDifference,
  incrementalUpdateFollowers,
  incrementalUpdateFollowings,
  userNeedsClassification,
  getOrgsNeedingConnectionDiscovery,
  type TwitterApiUser,
  type TwoPOVMutualsResult
} from '@/services'
import {
  fetchFollowersFromSocialAPI,
  fetchFollowingsFromSocialAPI
} from '@/lib/socialapi-pagination'
import { classifyProfileComplete, type TwitterProfile } from '@/lib/classifier'
import { getCachedMutuals, setCachedMutuals } from '@/lib/mutual-cache'
import { ensureOrgIndexFresh } from '@/lib/org-index'

interface FindMutualsRequest {
  loggedInUserUsername: string
  searchUsername: string
}

// Convert TwitterApiUser to TwitterProfile format for classifier
function toTwitterProfile(userData: TwitterApiUser): TwitterProfile {
  return {
    screen_name: userData.screen_name,
    name: userData.name,
    description: userData.description,
    location: userData.location,
    url: userData.url,
    followers_count: userData.followers_count,
    friends_count: userData.friends_count,
    verified: userData.verified,
    verification_info: userData.verification_info,
    profile_image_url_https: userData.profile_image_url_https,
    id_str: userData.id_str || userData.id,
    id: userData.id
  }
}

// Fire-and-forget classification for a user
async function classifyUserInBackground(
  username: string,
  userData: TwitterApiUser
): Promise<void> {
  try {
    console.log(`🔍 Background classification triggered for @${username}`)
    const profileData = toTwitterProfile(userData)
    await classifyProfileComplete(username, profileData)
    console.log(`✅ Background classification completed for @${username}`)
  } catch (error) {
    console.error(`❌ Background classification failed for @${username}:`, error)
  }
}

// Fire-and-forget org connection discovery
async function discoverOrgConnectionsInBackground(orgScreenName: string): Promise<void> {
  try {
    console.log(`🔍 Background org discovery triggered for @${orgScreenName}`)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    await fetch(`${baseUrl}/api/find-from-org`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgUsername: orgScreenName })
    })
    console.log(`✅ Background org discovery completed for @${orgScreenName}`)
  } catch (error) {
    console.error(`❌ Background org discovery failed for @${orgScreenName}:`, error)
  }
}

// Fetch user data from SocialAPI
async function fetchUserFromSocialAPI(username: string): Promise<TwitterApiUser> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('API configuration error')
  }

  const response = await fetch(
    `https://api.socialapi.me/twitter/user/${username}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json',
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch user ${username}: ${response.statusText}`)
  }

  const data = await response.json()
  if (!data.id) {
    throw new Error(`User ${username} not found`)
  }

  return data
}

// Process user and their followers/followings with intelligent caching
// Now accepts pre-fetched Neo4j user to support batched lookups
async function processUserConnections(
  username: string,
  fetchFollowers: boolean = false,
  preloadedUser?: Awaited<ReturnType<typeof getUserByScreenName>> | null
): Promise<{ userId: string; userData: TwitterApiUser }> {
  // Step 1: Fetch from SocialAPI (Neo4j lookup may be pre-fetched)
  const userData = await fetchUserFromSocialAPI(username)
  const user = preloadedUser !== undefined ? preloadedUser : await getUserByScreenName(username)

  const userId = userData.id_str || userData.id

  // Step 2: Run user upsert, count check, and classification check in parallel
  const neo4jUser = transformToNeo4jUser(userData)

  const [, cachedCount, needsClassification] = await Promise.all([
    createOrUpdateUserWithScreenNameMerge(neo4jUser),
    fetchFollowers ? getUserFollowerCount(userId) : getUserFollowingCount(userId),
    userNeedsClassification(username)
  ])

  // Step 3: Await classification if needed (so org data is available for queries)
  if (needsClassification) {
    console.log(`🔄 User @${username} needs classification, awaiting...`)
    try {
      // Use a timeout to prevent blocking too long
      const classificationPromise = classifyUserInBackground(username, userData)
      const timeoutPromise = new Promise<void>((resolve) => setTimeout(resolve, 5000))
      await Promise.race([classificationPromise, timeoutPromise])
    } catch (error) {
      console.error(`❌ Classification failed for @${username}, continuing anyway:`, error)
    }
  }

  // Step 4: Check if we need to fetch connections based on count differences
  const apiCount = fetchFollowers ? (userData.followers_count || 0) : (userData.friends_count || 0)
  const connectionType = fetchFollowers ? 'followers' : 'followings'

  console.log(`${username}: Cached ${connectionType}: ${cachedCount}, API ${connectionType}: ${apiCount}`)

  const shouldFetchConnections = hasSignificantCountDifference(cachedCount, apiCount) ||
                                !user || isUserDataStale(user, 1080) // 45 days = 1080 hours

  if (shouldFetchConnections) {
    console.log(`Fetching fresh ${connectionType} for ${username} (significant difference or stale data)`)

    let connections: TwitterApiUser[]
    let updateResult: { added: number, removed: number }

    if (fetchFollowers) {
      connections = await fetchFollowersFromSocialAPI(username)
      updateResult = await incrementalUpdateFollowers(userId, connections)
      console.log(`Follower update: +${updateResult.added}, -${updateResult.removed}`)
    } else {
      connections = await fetchFollowingsFromSocialAPI(userId)
      updateResult = await incrementalUpdateFollowings(userId, connections)
      console.log(`Following update: +${updateResult.added}, -${updateResult.removed}`)
    }
  } else {
    console.log(`Using cached ${connectionType} for ${username} (difference within threshold)`)
  }

  return { userId, userData }
}

export async function POST(request: NextRequest) {
  try {
    const body: FindMutualsRequest = await request.json()
    const { loggedInUserUsername, searchUsername } = body

    if (!loggedInUserUsername || !searchUsername) {
      return NextResponse.json(
        { error: 'Both loggedInUserUsername and searchUsername are required' },
        { status: 400 }
      )
    }

    console.log(`=== FIND MUTUALS REQUEST ===`)
    console.log(`Logged in user: ${loggedInUserUsername}`)
    console.log(`Search user: ${searchUsername}`)

    // Ensure org index is fresh (fire-and-forget, don't block on it)
    ensureOrgIndexFresh().catch(err => console.error('Org index refresh failed:', err))

    // Batch the initial Neo4j lookup for both users
    console.log(`Starting parallel processing for both users...`)
    const startTime = Date.now()

    // First, batch lookup both users from Neo4j in single query
    const preloadedUsers = await getUsersByScreenNames([loggedInUserUsername, searchUsername])
    const preloadedLoggedInUser = preloadedUsers.find(u => u.screenName.toLowerCase() === loggedInUserUsername.toLowerCase()) || null
    const preloadedSearchUser = preloadedUsers.find(u => u.screenName.toLowerCase() === searchUsername.toLowerCase()) || null

    // Now process both users in parallel with preloaded data
    const [loggedInUserResult, searchUserResult] = await Promise.all([
      processUserConnections(loggedInUserUsername, true, preloadedLoggedInUser),  // fetch followers
      processUserConnections(searchUsername, false, preloadedSearchUser)       // fetch followings
    ])

    const loggedInUserId = loggedInUserResult.userId
    const searchUserId = searchUserResult.userId

    const processingTime = Date.now() - startTime
    console.log(`Parallel processing completed in ${processingTime}ms`)

    // Check cache first for mutuals result
    const cachedMutualsResult = getCachedMutuals(loggedInUserUsername, searchUsername)

    // Run user verification, count fetching, two-POV mutual finding, and org discovery check in parallel
    console.log(`Starting parallel verification and two-POV mutual finding...`)
    const verificationStartTime = Date.now()

    let mutualsResult: TwoPOVMutualsResult

    if (cachedMutualsResult) {
      // Use cached result, but still run verification queries
      mutualsResult = cachedMutualsResult
      const [users, loggedInUserFollowerCount, searchUserFollowingCount, orgsNeedingDiscovery] = await Promise.all([
        getUsersByScreenNames([loggedInUserUsername, searchUsername]),
        getUserFollowerCount(loggedInUserId),
        getUserFollowingCount(searchUserId),
        getOrgsNeedingConnectionDiscovery(searchUsername, [loggedInUserUsername, searchUsername])
      ])

      // Assign to outer scope for later use
      var usersResult = users
      var loggedInUserFollowerCountResult = loggedInUserFollowerCount
      var searchUserFollowingCountResult = searchUserFollowingCount
      var orgsNeedingDiscoveryResult = orgsNeedingDiscovery
    } else {
      // No cache - run full query
      const [users, loggedInUserFollowerCount, searchUserFollowingCount, freshMutualsResult, orgsNeedingDiscovery] = await Promise.all([
        getUsersByScreenNames([loggedInUserUsername, searchUsername]),
        getUserFollowerCount(loggedInUserId),
        getUserFollowingCount(searchUserId),
        findTwoPOVMutuals(loggedInUserUsername, searchUsername),
        getOrgsNeedingConnectionDiscovery(searchUsername, [loggedInUserUsername, searchUsername])
      ])

      mutualsResult = freshMutualsResult
      // Cache the fresh result
      setCachedMutuals(loggedInUserUsername, searchUsername, mutualsResult)

      // Assign to outer scope for later use
      var usersResult = users
      var loggedInUserFollowerCountResult = loggedInUserFollowerCount
      var searchUserFollowingCountResult = searchUserFollowingCount
      var orgsNeedingDiscoveryResult = orgsNeedingDiscovery
    }

    // Trigger background org discovery for orgs that need it (fire-and-forget)
    if (orgsNeedingDiscoveryResult.length > 0) {
      console.log(`🔄 Found ${orgsNeedingDiscoveryResult.length} org(s) needing connection discovery:`,
        orgsNeedingDiscoveryResult.map(o => o.screenName).join(', '))
      for (const org of orgsNeedingDiscoveryResult) {
        discoverOrgConnectionsInBackground(org.screenName).catch(console.error)
      }
    }

    const verificationTime = Date.now() - verificationStartTime
    console.log(`Parallel verification and two-POV mutual finding completed in ${verificationTime}ms`)

    const loggedInUser = usersResult.find(u => u.screenName.toLowerCase() === loggedInUserUsername.toLowerCase())
    const searchUser = usersResult.find(u => u.screenName.toLowerCase() === searchUsername.toLowerCase())

    console.log(`After processing - Logged in user exists: ${!!loggedInUser}`)
    console.log(`After processing - Search user exists: ${!!searchUser}`)
    console.log(`${loggedInUserUsername} has ${loggedInUserFollowerCountResult} followers in Neo4j`)
    console.log(`${searchUsername} follows ${searchUserFollowingCountResult} users in Neo4j`)

    console.log(`=== RESULT: Found ${mutualsResult.counts.introducers} introducers, ${mutualsResult.counts.directConnections} direct connections ===`)

    return NextResponse.json({
      success: true,
      loggedInUser: loggedInUserUsername,
      searchedUser: searchUsername,

      // New two-POV response structure
      introducers: mutualsResult.introducers,
      directConnections: mutualsResult.directConnections,

      // Legacy format for backwards compatibility (using combined introducers)
      mutuals: mutualsResult.introducers.combined,

      counts: {
        total: mutualsResult.counts.introducers + mutualsResult.counts.directConnections,
        introducers: mutualsResult.counts.introducers,
        directConnections: mutualsResult.counts.directConnections,
        // Breakdown by type
        introducersByType: {
          direct: mutualsResult.introducers.direct.length,
          orgDirect: mutualsResult.introducers.orgDirect.length,
          orgIndirect: mutualsResult.introducers.orgIndirect.length,
          sharedThirdParty: mutualsResult.introducers.sharedThirdParty.length,
          chainAffinity: mutualsResult.introducers.chainAffinity.length,
        },
        directConnectionsByType: {
          orgDirect: mutualsResult.directConnections.orgDirect.length,
          orgIndirect: mutualsResult.directConnections.orgIndirect.length,
          sharedThirdParty: mutualsResult.directConnections.sharedThirdParty.length,
          chainAffinity: mutualsResult.directConnections.chainAffinity.length,
        }
      },

      // Legacy field for backwards compatibility
      count: mutualsResult.counts.introducers,

      // Error handling
      partialResults: mutualsResult.partialResults,
      errors: mutualsResult.errors,

      debug: {
        loggedInUserExists: !!loggedInUser,
        searchUserExists: !!searchUser,
        loggedInUserFollowers: loggedInUserFollowerCountResult,
        searchUserFollowings: searchUserFollowingCountResult,
        processingTimeMs: processingTime,
        verificationTimeMs: verificationTime,
        cacheHit: !!cachedMutualsResult
      }
    })

  } catch (error: any) {
    console.error('Error in find-mutuals API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
