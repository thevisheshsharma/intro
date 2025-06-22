import { supabase } from '@/lib/supabase';
import { CACHE_DURATIONS } from '@/lib/constants';
import { DatabaseUtils } from '@/lib/organization';

interface TwitterUserData {
  id: string;
  id_str: string;
  screen_name: string;
  name: string;
  description: string;
  location?: string;
  url?: string;
  followers_count: number;
  friends_count: number;
  verified: boolean;
  profile_image_url?: string;
  created_at: string;
}

interface CachedTwitterUser {
  user_data: TwitterUserData;
  fetched_at: string;
}

/**
 * Get cached Twitter user data by username or user ID
 */
export async function getCachedTwitterUser(identifier: string): Promise<CachedTwitterUser | null> {
  // Try to find by username first
  const { data: dataByUsername } = await supabase
    .from('twitter_user_cache')
    .select('user_data, fetched_at')
    .eq('username', identifier.toLowerCase())
    .single();

  if (dataByUsername && isCacheValid(dataByUsername.fetched_at)) {
    return dataByUsername;
  }

  // Try to find by user ID
  const { data: dataByUserId } = await supabase
    .from('twitter_user_cache')
    .select('user_data, fetched_at')
    .eq('user_id', identifier)
    .single();

  if (dataByUserId && isCacheValid(dataByUserId.fetched_at)) {
    return dataByUserId;
  }

  return null;
}

/**
 * Cache Twitter user data
 */
export async function setCachedTwitterUser(username: string, userData: TwitterUserData): Promise<void> {
  const user_id = userData.id_str || userData.id;
  
  await supabase
    .from('twitter_user_cache')
    .upsert({ 
      username: username.toLowerCase(), 
      user_id,
      user_data: userData, 
      fetched_at: DatabaseUtils.timestamp()
    }, {
      onConflict: 'username'
    });
}

/**
 * Get cached Twitter followings by username or user ID
 */
export async function getCachedTwitterFollowings(identifier: string) {
  const { data } = await supabase
    .from('twitter_followings_cache')
    .select('followings, fetched_at')
    .or(`username.eq.${identifier},user_id.eq.${identifier}`)
    .single()

  return data
}

/**
 * Cache Twitter followings data
 */
export async function setCachedTwitterFollowings(username: string, userData: any, userId?: string) {
  const user_id = userId || userData.user_id || userData.id_str || userData.id
  if (!user_id) return // No user ID available
  
  await supabase
    .from('twitter_followings_cache')
    .upsert({ 
      username,
      user_id,
      followings: userData,
      fetched_at: DatabaseUtils.timestamp() 
    })
}

/**
 * Get cached Twitter followers by username or user ID
 */
export async function getCachedTwitterFollowers(identifier: string) {
  const { data } = await supabase
    .from('twitter_followers_cache')
    .select('followers, fetched_at')
    .or(`username.eq.${identifier},user_id.eq.${identifier}`)
    .single()

  return data
}

/**
 * Cache Twitter followers data
 */
export async function setCachedTwitterFollowers(username: string, followersData: any, userId?: string) {
  const user_id = userId || followersData.user_id || followersData.id_str || followersData.id
  if (!user_id) return // No user ID available
  
  await supabase
    .from('twitter_followers_cache')
    .upsert({
      username,
      user_id,
      followers: followersData,
      fetched_at: DatabaseUtils.timestamp()
    })
}

/**
 * Check if cached data is still valid based on cache duration
 */
function isCacheValid(fetchedAt: string): boolean {
  const fetchTime = new Date(fetchedAt).getTime();
  const now = Date.now();
  return (now - fetchTime) < CACHE_DURATIONS.TWITTER_PROFILE;
}
