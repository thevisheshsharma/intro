import { NextRequest, NextResponse } from 'next/server'
import { 
  createOrUpdateUser, 
  getUserByScreenName,
  transformToNeo4jUser,
  isUserDataStale,
  getUserFollowerCount,
  incrementalUpdateFollowers,
  type TwitterApiUser
} from '@/lib/neo4j/services/user-service'
import { fetchFollowersFromSocialAPI } from '@/lib/socialapi-pagination'

interface SyncFollowersRequest {
  username: string
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

// Background sync followers for a user
async function syncUserFollowers(username: string): Promise<{ synced: boolean, reason: string, followerCount: number }> {
  console.log(`=== SYNCING FOLLOWERS FOR ${username} ===`)
  
  // Step 1: Get or fetch user data from both SocialAPI and Neo4j
  let user = await getUserByScreenName(username)
  let userData: TwitterApiUser

  // Always fetch user profile from SocialAPI to get current counts
  userData = await fetchUserFromSocialAPI(username)
  const userId = userData.id_str || userData.id

  // Create or update user in Neo4j
  const neo4jUser = transformToNeo4jUser(userData)
  await createOrUpdateUser(neo4jUser)

  // Step 2: Check if we need to fetch followers based on count differences or staleness
  const cachedFollowerCount = await getUserFollowerCount(userId)
  const apiFollowerCount = userData.followers_count || 0
  
  console.log(`${username}: Cached followers: ${cachedFollowerCount}, API followers: ${apiFollowerCount}`)
  
  // Check if counts differ significantly (>10%) or user data is stale
  const hasSignificantDifference = cachedFollowerCount === 0 || Math.abs(cachedFollowerCount - apiFollowerCount) / cachedFollowerCount > 0.1
  const shouldFetch = hasSignificantDifference || 
                      !user || 
                      isUserDataStale(user, 1080) // 45 days = 1080 hours

  if (!shouldFetch) {
    console.log(`Using cached followers for ${username} (difference within threshold and data fresh)`)
    return { 
      synced: false, 
      reason: 'Data is fresh and within threshold', 
      followerCount: cachedFollowerCount 
    }
  }

  console.log(`Fetching fresh followers for ${username} (significant difference or stale data)`)
  
  // Step 3: Fetch and store followers using optimized parallel pagination
  const followers = await fetchFollowersFromSocialAPI(username)
  
  // Use incremental update instead of clearing all relationships
  const updateResult = await incrementalUpdateFollowers(userId, followers)
  
  console.log(`Successfully synced followers for ${username}: +${updateResult.added}, -${updateResult.removed}`)
  return { 
    synced: true, 
    reason: `Incremental update: +${updateResult.added}, -${updateResult.removed}`, 
    followerCount: followers.length 
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SyncFollowersRequest = await request.json()
    const { username } = body

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    console.log(`Background sync request for user: ${username}`)
    
    // Perform the sync
    const result = await syncUserFollowers(username)

    return NextResponse.json({
      success: true,
      username,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error in sync-followers API:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
