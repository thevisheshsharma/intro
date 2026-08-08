import { NextRequest, NextResponse } from 'next/server'
import { 
  createOrUpdateUserWithScreenNameMerge, 
  getUserByScreenName,
  transformToNeo4jUser,
  isUserDataStale,
  getUserFollowerCount,
  hasSignificantCountDifference,
  incrementalUpdateFollowers,
  type TwitterApiUser
} from '@/services'
import { fetchFollowersFromSocialAPI } from '@/lib/socialapi-pagination'
import { z } from 'zod'
import { getPrivyUser, extractTwitterFromPrivyUser } from '@/lib/privy'
import { COST_BEARING_RATE_LIMITS, requireUserAccess } from '@/lib/security/api-access'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'
import { createSafeRouteLogger } from '@/lib/safe-logger'

const logger = createSafeRouteLogger('sync-followers')

const syncFollowersSchema = z.object({
  username: z.string().trim().min(1).max(50),
}).strict()

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
  logger.log(`=== SYNCING FOLLOWERS FOR ${username} ===`)
  
  // Step 1: Get or fetch user data from both SocialAPI and Neo4j
  let user = await getUserByScreenName(username)
  let userData: TwitterApiUser

  // Always fetch user profile from SocialAPI to get current counts
  userData = await fetchUserFromSocialAPI(username)
  const userId = userData.id_str || userData.id

  // Create or update user in Neo4j
  const neo4jUser = transformToNeo4jUser(userData)
  await createOrUpdateUserWithScreenNameMerge(neo4jUser)

  // Step 2: Check if we need to fetch followers based on count differences or staleness
  const cachedFollowerCount = await getUserFollowerCount(userId)
  const apiFollowerCount = userData.followers_count || 0
  
  logger.log(`${username}: Cached followers: ${cachedFollowerCount}, API followers: ${apiFollowerCount}`)
  
  const shouldFetch = hasSignificantCountDifference(cachedFollowerCount, apiFollowerCount) || 
                      !user || 
                      isUserDataStale(user, 1080) // 45 days = 1080 hours

  if (!shouldFetch) {
    logger.log(`Using cached followers for ${username} (difference within threshold and data fresh)`)
    return { 
      synced: false, 
      reason: 'Data is fresh and within threshold', 
      followerCount: cachedFollowerCount 
    }
  }

  logger.log(`Fetching fresh followers for ${username} (significant difference or stale data)`)
  
  // Step 3: Fetch and store followers using optimized parallel pagination
  const followers = await fetchFollowersFromSocialAPI(username)
  
  // Use incremental update instead of clearing all relationships
  const updateResult = await incrementalUpdateFollowers(userId, followers)
  
  logger.log(`Successfully synced followers for ${username}: +${updateResult.added}, -${updateResult.removed}`)
  return { 
    synced: true, 
    reason: `Incremental update: +${updateResult.added}, -${updateResult.removed}`, 
    followerCount: followers.length 
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await requireUserAccess(request, {
      feature: 'pathfinder',
      rateLimit: COST_BEARING_RATE_LIMITS.followerSync,
    })
    if (!access.ok) return access.response

    const body = await parseJsonBody(request, syncFollowersSchema)
    const { username } = body

    const privyUser = await getPrivyUser(access.actor.userId)
    const actorUsername = extractTwitterFromPrivyUser(privyUser)?.replace(/^@/, '').toLowerCase()
    if (!actorUsername || actorUsername !== username.replace(/^@/, '').toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    logger.log(`Background sync request for user: ${username}`)
    
    // Perform the sync
    const result = await syncUserFollowers(username)

    return NextResponse.json({
      success: true,
      username,
      ...result,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    logger.error('Error in sync-followers API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
