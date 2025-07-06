// Utility helpers for Twitter API interactions

interface TwitterUser {
  name: string
  screen_name: string
  profile_image_url_https: string
  description: string
  followers_count: number
  friends_count: number
  location: string
  url: string
  verified: boolean
  id: string
  account_type?: 'organization' | 'individual'
  verification_info?: {
    type?: string
    reason?: string
  }
}

// Extract Twitter username from Clerk user object
export function extractTwitterUsername(user: any): string | null {
  if (!user) return null
  
  // Try multiple sources for Twitter username
  return user.username || 
         user.publicMetadata?.twitter || 
         null
}

// Transform Twitter user API response to standardized format
export function transformTwitterUser(user: any): TwitterUser {
  // Determine account type based on verification_info
  const isOrganization = user.verification_info?.type === 'Business'
  const account_type = isOrganization ? 'organization' : 'individual'
  
  // Check if verified (legacy or new verification system)
  const isVerified = Boolean(user.verified || user.verification_info?.reason)
  
  return {
    name: user.name || '',
    screen_name: user.screen_name || user.username || '',
    profile_image_url_https: user.profile_image_url_https || user.profile_image_url || '',
    description: user.description || user.bio || '',
    followers_count: user.followers_count || 0,
    friends_count: user.friends_count || 0,
    location: user.location || '',
    url: user.url || '',
    verified: isVerified,
    id: user.id_str || user.id || '',
    account_type,
    verification_info: user.verification_info || undefined,
  }
}

// API helper function with error handling
async function makeTwitterApiRequest(endpoint: string, params: Record<string, string>): Promise<any> {
  const url = new URL(`/api/twitter/${endpoint}`, window.location.origin)
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value)
  })

  const response = await fetch(url.toString())
  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.error || data.message || `Failed to fetch ${endpoint}`)
  }
  
  return data
}

// Fetch and cache followers for a username
export async function fetchFollowers(username: string): Promise<any[]> {
  const data = await makeTwitterApiRequest('followers', { username })
  
  if (!Array.isArray(data.users)) {
    throw new Error('Invalid response format from server (followers)')
  }
  
  return data.users
}

// Lookup Twitter user by username
export async function lookupTwitterUser(username: string): Promise<any> {
  const data = await makeTwitterApiRequest('user-lookup', { screen_name: username })
  
  if (!data.id) {
    throw new Error('User not found')
  }
  
  return data
}

// Fetch followings for a user_id
export async function fetchFollowings(user_id: string, username: string): Promise<any[]> {
  const data = await makeTwitterApiRequest('following-list', { user_id, username })
  
  if (!Array.isArray(data.users)) {
    throw new Error('Invalid response format from server (followings)')
  }
  
  return data.users
}
