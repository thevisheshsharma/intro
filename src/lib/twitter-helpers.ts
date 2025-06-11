// Utility helpers for Twitter logic, extracted from page.tsx

// Extract Twitter username from Clerk user object
export function extractTwitterUsername(user: any): string | null {
  // Try to extract from Clerk's public metadata or username field
  if (!user) return null
  if (user.username) return user.username
  if (user.publicMetadata && user.publicMetadata.twitter) return user.publicMetadata.twitter
  return null
}

// Transform Twitter user API response to table-friendly object
export function transformTwitterUser(user: any) {
  return {
    name: user.name,
    screen_name: user.screen_name || user.username,
    profile_image_url_https: user.profile_image_url_https || user.profile_image_url,
    description: user.description || user.bio,
    followers_count: user.followers_count,
    friends_count: user.friends_count,
    location: user.location,
    url: user.url,
    verified: user.verified,
    id: user.id_str || user.id,
  }
}

// Fetch and cache followers for a username
export async function fetchFollowers(username: string) {
  const res = await fetch(`/api/twitter/followers?username=${username}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to fetch followers')
  if (!Array.isArray(data.users)) throw new Error('Invalid response format from server (followers)')
  return data.users
}

// Lookup Twitter user by username
export async function lookupTwitterUser(username: string) {
  const res = await fetch(`/api/twitter/user-lookup?screen_name=${username}`)
  const data = await res.json()
  if (!res.ok || !data.id) throw new Error(data.error || data.message || 'User not found')
  return data
}

// Fetch followings for a user_id
export async function fetchFollowings(user_id: string, username: string) {
  const res = await fetch(`/api/twitter/following-list?user_id=${user_id}&username=${username}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Failed to fetch followings')
  if (!Array.isArray(data.users)) throw new Error('Invalid response format from server (followings)')
  return data.users
}
