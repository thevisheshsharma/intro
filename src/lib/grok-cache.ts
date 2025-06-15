import { supabase } from './supabase'

const ORG_ICP_CACHE_PREFIX = 'org_icp:'

export async function getOrgICPCache(twitterUsername: string): Promise<any | null> {
  const cacheKey = ORG_ICP_CACHE_PREFIX + twitterUsername.toLowerCase()
  const { data, error } = await supabase
    .from('grok_analysis_cache')
    .select('cache_data, expires_at')
    .eq('cache_key', cacheKey)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('Error fetching org ICP cache:', error)
    return null
  }
  if (!data) return null
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null
  return data.cache_data
}

export async function setOrgICPCache(twitterUsername: string, icpData: any, ttlHours = 24): Promise<boolean> {
  const cacheKey = ORG_ICP_CACHE_PREFIX + twitterUsername.toLowerCase()
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString()
  const { error } = await supabase
    .from('grok_analysis_cache')
    .upsert({
      cache_key: cacheKey,
      cache_data: icpData,
      expires_at: expiresAt
    }, { onConflict: 'cache_key', ignoreDuplicates: false })
  if (error) {
    console.error('Error saving org ICP cache:', error)
    return false
  }
  return true
}
