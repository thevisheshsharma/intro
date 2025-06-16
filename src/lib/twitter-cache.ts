import { supabase } from '@/lib/supabase';
import { CACHE_DURATIONS } from '@/lib/constants';

export interface TwitterUserData {
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

export interface CachedTwitterUser {
  user_data: TwitterUserData;
  fetched_at: string;
}

/**
 * Check if cached data is still valid based on cache duration
 */
function isCacheValid(fetchedAt: string): boolean {
  const fetchTime = new Date(fetchedAt).getTime();
  const now = Date.now();
  return (now - fetchTime) < CACHE_DURATIONS.TWITTER_PROFILE;
}

/**
 * Get cached Twitter user data by username or user ID
 * @param identifier - Username or user ID to search for
 * @returns Cached user data if valid, null otherwise
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
 * @param username - Twitter username (without @)
 * @param userData - User data from Twitter API
 */
export async function setCachedTwitterUser(username: string, userData: TwitterUserData): Promise<void> {
  const user_id = userData.id_str || userData.id;
  
  const { error } = await supabase
    .from('twitter_user_cache')
    .upsert({ 
      username: username.toLowerCase(), 
      user_id,
      user_data: userData, 
      fetched_at: new Date().toISOString()
    }, {
      onConflict: 'username'
    });

  if (error) {
    console.error('Error caching Twitter user:', error);
    throw new Error('Failed to cache Twitter user data');
  }
}

/**
 * Get cached Twitter followings by username or user ID
 */
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
