import { TwitterApiUser } from '@/services'

// Fetch user data from SocialAPI by screen name (for protocols)
export async function fetchUserFromSocialAPI(
  screenName: string,
  retryCount = 0
): Promise<TwitterApiUser | null> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('API configuration error')
  }

  try {
    const response = await fetch(
      `https://api.socialapi.me/twitter/user/${screenName}`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      if (response.status === 404) {
        // User not found, return null
        return null
      }
      
      if (response.status === 429 && retryCount < 3) {
        // Rate limited, wait and retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`Rate limited fetching user ${screenName}, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchUserFromSocialAPI(screenName, retryCount + 1)
      }
      
      throw new Error(`Failed to fetch user ${screenName}: ${response.statusText}`)
    }

    const data = await response.json()
    if (!data.id) {
      return null
    }

    return data
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Error fetching user ${screenName}, retrying (${retryCount + 1}/3):`, error)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return fetchUserFromSocialAPI(screenName, retryCount + 1)
    }
    console.error(`Failed to fetch user ${screenName} after ${retryCount + 1} attempts:`, error)
    return null
  }
}

// Helper function to fetch a single page of followers
export async function fetchFollowersPage(
  userId: string, 
  cursor?: string,
  retryCount = 0
): Promise<{ users: TwitterApiUser[], nextCursor?: string }> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('API configuration error')
  }

  let url = `https://api.socialapi.me/twitter/followers/list?user_id=${userId}&limit=200`
  if (cursor && cursor !== '0') {
    url += `&cursor=${cursor}`
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        // Rate limited, wait and retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchFollowersPage(userId, cursor, retryCount + 1)
      }
      throw new Error(`Failed to fetch followers page: ${response.statusText}`)
    }

    const data = await response.json()
    
    return {
      users: Array.isArray(data.users) ? data.users : [],
      nextCursor: data.next_cursor_str || data.next_cursor
    }
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Error fetching followers page, retrying (${retryCount + 1}/3):`, error)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return fetchFollowersPage(userId, cursor, retryCount + 1)
    }
    throw error
  }
}

// Helper function to fetch a single page of followings
export async function fetchFollowingsPage(
  userId: string, 
  cursor?: string,
  retryCount = 0
): Promise<{ users: TwitterApiUser[], nextCursor?: string }> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('API configuration error')
  }

  let url = `https://api.socialapi.me/twitter/friends/list?user_id=${userId}&limit=200`
  if (cursor && cursor !== '0') {
    url += `&cursor=${cursor}`
  }

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 429 && retryCount < 3) {
        // Rate limited, wait and retry with exponential backoff
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        console.log(`Rate limited, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
        return fetchFollowingsPage(userId, cursor, retryCount + 1)
      }
      throw new Error(`Failed to fetch followings page: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Validate response structure
    if (!Array.isArray(data.users)) {
      console.warn(`Unexpected API response structure for followings:`, data)
    }
    
    return {
      users: Array.isArray(data.users) ? data.users : [],
      nextCursor: data.next_cursor_str || data.next_cursor
    }
  } catch (error) {
    if (retryCount < 3) {
      console.log(`Error fetching followings page, retrying (${retryCount + 1}/3):`, error)
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)))
      return fetchFollowingsPage(userId, cursor, retryCount + 1)
    }
    throw error
  }
}

// Sequential pagination for any connection type - reliable and efficient
async function fetchConnectionsSequentially<T extends TwitterApiUser>(
  firstPageFetcher: () => Promise<{ users: T[], nextCursor?: string }>,
  pageFetcher: (cursor: string) => Promise<{ users: T[], nextCursor?: string }>,
  connectionType: string
): Promise<T[]> {
  const allConnections: T[] = []
  let pageCount = 0
  let totalFetched = 0
  
  // Start with the first page
  const firstPage = await firstPageFetcher()
  allConnections.push(...firstPage.users)
  pageCount++
  totalFetched += firstPage.users.length
  
  console.log(`Page ${pageCount}: +${firstPage.users.length} ${connectionType} (total: ${totalFetched})`)
  
  if (!firstPage.nextCursor || firstPage.nextCursor === '0') {
    console.log(`Fetched ${allConnections.length} ${connectionType} (${pageCount} total pages)`)
    return allConnections
  }

  // Continue fetching pages sequentially
  let cursor: string | undefined = firstPage.nextCursor
  
  while (cursor && cursor !== '0') {
    try {
      const page = await pageFetcher(cursor)
      allConnections.push(...page.users)
      pageCount++
      totalFetched += page.users.length
      
      console.log(`Page ${pageCount}: +${page.users.length} ${connectionType} (total: ${totalFetched})`)
      
      cursor = page.nextCursor
      
      // Small delay between requests to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Progress logging every 10 pages
      if (pageCount % 10 === 0) {
        console.log(`Progress: ${pageCount} pages, ${totalFetched} ${connectionType} fetched...`)
      }
      
    } catch (error) {
      console.error(`Error fetching page ${pageCount + 1} of ${connectionType}:`, error)
      // On error, log what we have so far and break
      console.log(`Stopping pagination due to error. Fetched ${totalFetched} ${connectionType} from ${pageCount} pages.`)
      break
    }
  }

  console.log(`Fetched ${allConnections.length} ${connectionType} (${pageCount} total pages)`)
  return allConnections
}

// Fetch followers with optimized parallel pagination
export async function fetchFollowersFromSocialAPI(username: string): Promise<TwitterApiUser[]> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('API configuration error')
  }

  // First get the user ID
  const userResponse = await fetch(
    `https://api.socialapi.me/twitter/user/${username}`,
    {
      headers: {
        'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
        'Accept': 'application/json',
      },
    }
  )

  if (!userResponse.ok) {
    throw new Error(`Failed to fetch user ${username}: ${userResponse.statusText}`)
  }

  const userData = await userResponse.json()
  const userId = userData.id_str || userData.id

  return fetchConnectionsSequentially(
    () => fetchFollowersPage(userId),
    (cursor: string) => fetchFollowersPage(userId, cursor),
    `followers for ${username}`
  )
}

// Fetch followings with sequential pagination and validation
export async function fetchFollowingsFromSocialAPI(userId: string): Promise<TwitterApiUser[]> {
  const connections = await fetchConnectionsSequentially(
    () => fetchFollowingsPage(userId),
    (cursor: string) => fetchFollowingsPage(userId, cursor),
    `followings for user ${userId}`
  )
  
  return connections
}
