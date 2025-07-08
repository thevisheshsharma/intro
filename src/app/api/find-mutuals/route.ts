import { NextRequest, NextResponse } from 'next/server'
import { 
  createOrUpdateUser, 
  getUserByScreenName,
  findMutualConnections,
  transformToNeo4jUser,
  isUserDataStale,
  getUserFollowerCount,
  getUserFollowingCount,
  hasSignificantCountDifference,
  incrementalUpdateFollowers,
  incrementalUpdateFollowings,
  type TwitterApiUser
} from '@/lib/neo4j/services/user-service'
import { 
  fetchFollowersFromSocialAPI,
  fetchFollowingsFromSocialAPI
} from '@/lib/socialapi-pagination'

interface FindMutualsRequest {
  loggedInUserUsername: string
  searchUsername: string
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
async function processUserConnections(username: string, fetchFollowers: boolean = false): Promise<string> {
  // Step 1: Get or fetch user data from both SocialAPI and Neo4j
  let user = await getUserByScreenName(username)
  let userData: TwitterApiUser

  // Always fetch user profile from SocialAPI to get current counts
  userData = await fetchUserFromSocialAPI(username)
  const userId = userData.id_str || userData.id

  // Create or update user in Neo4j
  const neo4jUser = transformToNeo4jUser(userData)
  await createOrUpdateUser(neo4jUser)

  // Step 2: Check if we need to fetch connections based on count differences
  let shouldFetchConnections = false
  
  if (fetchFollowers) {
    // Check followers
    const cachedFollowerCount = await getUserFollowerCount(userId)
    const apiFollowerCount = userData.followers_count || 0
    
    console.log(`${username}: Cached followers: ${cachedFollowerCount}, API followers: ${apiFollowerCount}`)
    
    if (hasSignificantCountDifference(cachedFollowerCount, apiFollowerCount) || 
        !user || isUserDataStale(user, 1080)) { // 45 days = 1080 hours
      shouldFetchConnections = true
      console.log(`Fetching fresh followers for ${username} (significant difference or stale data)`)
    } else {
      console.log(`Using cached followers for ${username} (difference within threshold)`)
    }
  } else {
    // Check followings
    const cachedFollowingCount = await getUserFollowingCount(userId)
    const apiFollowingCount = userData.friends_count || 0
    
    console.log(`${username}: Cached followings: ${cachedFollowingCount}, API followings: ${apiFollowingCount}`)
    
    if (hasSignificantCountDifference(cachedFollowingCount, apiFollowingCount) || 
        !user || isUserDataStale(user, 1080)) { // 45 days = 1080 hours
      shouldFetchConnections = true
      console.log(`Fetching fresh followings for ${username} (significant difference or stale data)`)
    } else {
      console.log(`Using cached followings for ${username} (difference within threshold)`)
    }
  }

  // Step 3: Fetch connections only if needed
  if (shouldFetchConnections) {
    let connections: TwitterApiUser[]
    let updateResult: { added: number, removed: number }
    
    if (fetchFollowers) {
      connections = await fetchFollowersFromSocialAPI(username)
      // Use incremental update instead of clearing all relationships
      updateResult = await incrementalUpdateFollowers(userId, connections)
      console.log(`Follower update: +${updateResult.added}, -${updateResult.removed}`)
    } else {
      connections = await fetchFollowingsFromSocialAPI(userId)
      // Use incremental update instead of clearing all relationships
      updateResult = await incrementalUpdateFollowings(userId, connections)
      console.log(`Following update: +${updateResult.added}, -${updateResult.removed}`)
    }
  } else {
    console.log(`Using cached data for ${username}, no API fetch needed`)
  }

  return userId
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

    // Process both users in parallel for significant speed improvement
    console.log(`Starting parallel processing for both users...`)
    const startTime = Date.now()
    
    const [loggedInUserId, searchUserId] = await Promise.all([
      processUserConnections(loggedInUserUsername, true),  // fetch followers
      processUserConnections(searchUsername, false)       // fetch followings
    ])
    
    const processingTime = Date.now() - startTime
    console.log(`Parallel processing completed in ${processingTime}ms`)

    // Verify both users exist after processing
    const loggedInUser = await getUserByScreenName(loggedInUserUsername)
    const searchUser = await getUserByScreenName(searchUsername)
    
    console.log(`After processing - Logged in user exists: ${!!loggedInUser}`)
    console.log(`After processing - Search user exists: ${!!searchUser}`)
    
    if (loggedInUser) {
      const followerCount = await getUserFollowerCount(loggedInUserId)
      console.log(`${loggedInUserUsername} has ${followerCount} followers in Neo4j`)
    }
    
    if (searchUser) {
      const followingCount = await getUserFollowingCount(searchUserId)
      console.log(`${searchUsername} follows ${followingCount} users in Neo4j`)
    }

    // Find mutual connections
    console.log(`Finding mutual connections between ${loggedInUserUsername} and ${searchUsername}...`)
    const mutuals = await findMutualConnections(loggedInUserUsername, searchUsername)

    console.log(`=== RESULT: Found ${mutuals.length} mutuals ===`)

    return NextResponse.json({
      success: true,
      loggedInUser: loggedInUserUsername,
      searchedUser: searchUsername,
      mutuals: mutuals,
      count: mutuals.length,
      debug: {
        loggedInUserExists: !!loggedInUser,
        searchUserExists: !!searchUser,
        loggedInUserFollowers: loggedInUser ? await getUserFollowerCount(loggedInUserId) : 0,
        searchUserFollowings: searchUser ? await getUserFollowingCount(searchUserId) : 0
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
