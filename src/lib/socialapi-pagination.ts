import { TwitterApiUser } from '@/lib/neo4j/services/user-service'

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

  let url = `https://api.socialapi.me/twitter/friends/list?user_id=${userId}&count=200`
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

// Optimized parallel pagination for any connection type
async function fetchConnectionsWithParallelPagination<T extends TwitterApiUser>(
  firstPageFetcher: () => Promise<{ users: T[], nextCursor?: string }>,
  pageFetcher: (cursor: string) => Promise<{ users: T[], nextCursor?: string }>,
  connectionType: string
): Promise<T[]> {
  // Start with the first page
  const firstPage = await firstPageFetcher()
  let allConnections: T[] = [...firstPage.users]
  
  if (!firstPage.nextCursor || firstPage.nextCursor === '0') {
    console.log(`Fetched ${allConnections.length} ${connectionType} (single page)`)
    return allConnections
  }

  // For multiple pages, use hybrid approach:
  // 1. Fetch a few pages sequentially to get cursors
  // 2. Then fetch remaining pages in parallel batches
  
  const cursors: string[] = [firstPage.nextCursor]
  const maxSequentialPages = 3 // Get first few cursors sequentially
  
  // Fetch a few pages sequentially to collect cursors
  for (let i = 0; i < maxSequentialPages && cursors[cursors.length - 1] !== '0'; i++) {
    const page = await pageFetcher(cursors[cursors.length - 1])
    allConnections.push(...page.users)
    
    if (page.nextCursor && page.nextCursor !== '0') {
      cursors.push(page.nextCursor)
    } else {
      break
    }
    
    // Small delay between sequential requests
    await new Promise(resolve => setTimeout(resolve, 50))
  }

  // If we have more pages, fetch them in parallel batches
  const remainingCursors = cursors.slice(maxSequentialPages)
  if (remainingCursors.length > 0) {
    const batchSize = 5 // Fetch 5 pages in parallel
    
    for (let i = 0; i < remainingCursors.length; i += batchSize) {
      const batch = remainingCursors.slice(i, i + batchSize)
      
      try {
        const pagePromises = batch.map(cursor => pageFetcher(cursor))
        const pages = await Promise.all(pagePromises)
        
        // Add all users from this batch
        for (const page of pages) {
          allConnections.push(...page.users)
          
          // Collect any new cursors for potential future batches
          if (page.nextCursor && page.nextCursor !== '0' && 
              !cursors.includes(page.nextCursor) && 
              !remainingCursors.includes(page.nextCursor)) {
            remainingCursors.push(page.nextCursor)
          }
        }
        
        console.log(`Parallel batch ${Math.floor(i/batchSize) + 1} completed: +${pages.reduce((sum, p) => sum + p.users.length, 0)} ${connectionType}`)
        
        // Brief pause between batches to be respectful to the API
        if (i + batchSize < remainingCursors.length) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (error) {
        console.error(`Error in parallel batch ${Math.floor(i/batchSize) + 1}:`, error)
        // Fall back to sequential for this batch
        for (const cursor of batch) {
          try {
            const page = await pageFetcher(cursor)
            allConnections.push(...page.users)
            await new Promise(resolve => setTimeout(resolve, 100))
          } catch (pageError) {
            console.error(`Failed to fetch page with cursor ${cursor}:`, pageError)
          }
        }
      }
    }
  }

  console.log(`Fetched ${allConnections.length} ${connectionType} (${cursors.length + 1} total pages)`)
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

  return fetchConnectionsWithParallelPagination(
    () => fetchFollowersPage(userId),
    (cursor: string) => fetchFollowersPage(userId, cursor),
    `followers for ${username}`
  )
}

// Fetch followings with optimized parallel pagination
export async function fetchFollowingsFromSocialAPI(userId: string): Promise<TwitterApiUser[]> {
  return fetchConnectionsWithParallelPagination(
    () => fetchFollowingsPage(userId),
    (cursor: string) => fetchFollowingsPage(userId, cursor),
    `followings for user ${userId}`
  )
}
