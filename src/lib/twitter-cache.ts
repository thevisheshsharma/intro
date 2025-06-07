import { supabase } from '@/lib/supabase'

// Cache Twitter user data by username or user ID
export async function getCachedTwitterUser(identifier: string) {
  const { data: dataByUsername, error: errorByUsername } = await supabase
    .from('twitter_user_cache')
    .select('user_data, fetched_at')
    .eq('username', identifier)
    .single()

  if (dataByUsername) return dataByUsername

  const { data: dataByUserId, error: errorByUserId } = await supabase
    .from('twitter_user_cache')
    .select('user_data, fetched_at')
    .eq('user_id', identifier)
    .single()

  if (errorByUserId && errorByUsername) return null
  return dataByUserId
}

export async function setCachedTwitterUser(username: string, userData: any) {
  const user_id = userData.id_str || userData.id
  await supabase
    .from('twitter_user_cache')
    .upsert({ 
      username, 
      user_id,
      user_data: userData, 
      fetched_at: new Date().toISOString() 
    })
}

// Cache Twitter followings by username or user ID
export async function getCachedTwitterFollowings(identifier: string) {
  const { data: dataByUsername, error: errorByUsername } = await supabase
    .from('twitter_followings_cache')
    .select('followings, fetched_at')
    .eq('username', identifier)
    .single()

  if (dataByUsername) return dataByUsername

  const { data: dataByUserId, error: errorByUserId } = await supabase
    .from('twitter_followings_cache')
    .select('followings, fetched_at')
    .eq('user_id', identifier)
    .single()

  if (errorByUserId && errorByUsername) return null
  return dataByUserId
}

export async function setCachedTwitterFollowings(username: string, userData: any, userId?: string) {
  const user_id = userId || userData.user_id || userData.id_str || userData.id
  if (!user_id) {
    console.error('No user ID provided for caching followings')
    return
  }
  
  await supabase
    .from('twitter_followings_cache')
    .upsert({ 
      username,
      user_id,
      followings: userData,
      fetched_at: new Date().toISOString() 
    })
}

// Cache Twitter followers by username or user ID
export async function getCachedTwitterFollowers(identifier: string) {
  const { data: dataByUsername, error: errorByUsername } = await supabase
    .from('twitter_followers_cache')
    .select('followers, fetched_at')
    .eq('username', identifier)
    .single()

  if (dataByUsername) return dataByUsername

  const { data: dataByUserId, error: errorByUserId } = await supabase
    .from('twitter_followers_cache')
    .select('followers, fetched_at')
    .eq('user_id', identifier)
    .single()

  if (errorByUserId && errorByUsername) return null
  return dataByUserId
}

export async function setCachedTwitterFollowers(username: string, followersData: any, userId?: string) {
  const user_id = userId || followersData.user_id || followersData.id_str || followersData.id
  if (!user_id) {
    console.error('No user ID provided for caching followers')
    return
  }
  await supabase
    .from('twitter_followers_cache')
    .upsert({
      username,
      user_id,
      followers: followersData,
      fetched_at: new Date().toISOString()
    })
}
