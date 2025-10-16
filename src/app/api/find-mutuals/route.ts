import { NextRequest, NextResponse } from 'next/server'
import { 
  createOrUpdateUserWithScreenNameMerge, 
  getUserByScreenName,
  getUsersByScreenNames,
  findMutualConnections,
  transformToNeo4jUser,
  isUserDataStale,
  getUserFollowerCount,
  getUserFollowingCount,
  hasSignificantCountDifference,
  incrementalUpdateFollowers,
  incrementalUpdateFollowings,
  type TwitterApiUser
} from '@/services'
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
  // Step 1: Run Neo4j lookup and SocialAPI fetch in parallel
  const [user, userData] = await Promise.all([
    getUserByScreenName(username),
    fetchUserFromSocialAPI(username)
  ])
  
  const userId = userData.id_str || userData.id

  // Step 2: Run user upsert and count check in parallel
  const neo4jUser = transformToNeo4jUser(userData)
  
  const [, cachedCount] = await Promise.all([
    createOrUpdateUserWithScreenNameMerge(neo4jUser),
    fetchFollowers ? getUserFollowerCount(userId) : getUserFollowingCount(userId)
  ])

  // Step 3: Check if we need to fetch connections based on count differences
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

    // Run user verification, count fetching, and mutual finding in parallel
    console.log(`Starting parallel verification and mutual finding...`)
    const verificationStartTime = Date.now()
    
    const [users, loggedInUserFollowerCount, searchUserFollowingCount, mutuals] = await Promise.all([
      // Verify both users exist after processing - OPTIMIZED with batch query
      getUsersByScreenNames([loggedInUserUsername, searchUsername]),
      // Get follower count for logged in user
      getUserFollowerCount(loggedInUserId),
      // Get following count for search user  
      getUserFollowingCount(searchUserId),
      // Find mutual connections (this is the most expensive operation)
      findMutualConnections(loggedInUserUsername, searchUsername)
    ])
    
    const verificationTime = Date.now() - verificationStartTime
    console.log(`Parallel verification and mutual finding completed in ${verificationTime}ms`)
    
    const loggedInUser = users.find(u => u.screenName.toLowerCase() === loggedInUserUsername.toLowerCase())
    const searchUser = users.find(u => u.screenName.toLowerCase() === searchUsername.toLowerCase())
    
    console.log(`After processing - Logged in user exists: ${!!loggedInUser}`)
    console.log(`After processing - Search user exists: ${!!searchUser}`)
    console.log(`${loggedInUserUsername} has ${loggedInUserFollowerCount} followers in Neo4j`)
    console.log(`${searchUsername} follows ${searchUserFollowingCount} users in Neo4j`)

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
        loggedInUserFollowers: loggedInUserFollowerCount,
        searchUserFollowings: searchUserFollowingCount
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
