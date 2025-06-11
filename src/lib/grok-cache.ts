import { supabase } from './supabase'

export interface GrokAnalysisData {
  id?: number
  twitter_username: string
  twitter_user_id?: string
  name?: string
  role: string
  company: string
  expertise: string
  summary: string
  confidence: 'high' | 'medium' | 'low'
  raw_profile_data?: any
  created_at?: string
  updated_at?: string
}

export interface ProfileData {
  name: string
  screen_name: string
  description: string
  location?: string
  url?: string
  id_str?: string
  [key: string]: any
}

/**
 * Get cached Grok analysis for a Twitter username
 */
export async function getCachedGrokAnalysis(username: string): Promise<GrokAnalysisData | null> {
  try {
    const { data, error } = await supabase
      .from('grok_analysis')
      .select('*')
      .eq('twitter_username', username.toLowerCase())
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null
      }
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching cached Grok analysis:', error)
    return null
  }
}

/**
 * Save Grok analysis to database
 */
export async function saveCachedGrokAnalysis(
  username: string,
  analysisData: Omit<GrokAnalysisData, 'id' | 'created_at' | 'updated_at'>,
  profileData?: ProfileData
): Promise<GrokAnalysisData | null> {
  try {
    const dataToSave = {
      twitter_username: username.toLowerCase(),
      twitter_user_id: profileData?.id_str || analysisData.twitter_user_id,
      name: profileData?.name || analysisData.name,
      role: analysisData.role,
      company: analysisData.company,
      expertise: analysisData.expertise,
      summary: analysisData.summary,
      confidence: analysisData.confidence,
      raw_profile_data: profileData || analysisData.raw_profile_data
    }

    const { data, error } = await supabase
      .from('grok_analysis')
      .upsert(dataToSave, {
        onConflict: 'twitter_username'
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error saving Grok analysis:', error)
    return null
  }
}

/**
 * Delete cached Grok analysis for a username
 */
export async function deleteCachedGrokAnalysis(username: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('grok_analysis')
      .delete()
      .eq('twitter_username', username.toLowerCase())

    if (error) {
      throw error
    }

    return true
  } catch (error) {
    console.error('Error deleting cached Grok analysis:', error)
    return false
  }
}

/**
 * Get all cached analyses (for admin/debugging purposes)
 */
export async function getAllCachedAnalyses(limit = 50): Promise<GrokAnalysisData[]> {
  try {
    const { data, error } = await supabase
      .from('grok_analysis')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error fetching all cached analyses:', error)
    return []
  }
}

/**
 * Check if analysis is stale (older than specified days)
 */
export function isAnalysisStale(analysis: GrokAnalysisData, daysThreshold = 30): boolean {
  if (!analysis.created_at) return true
  
  const analysisDate = new Date(analysis.created_at)
  const now = new Date()
  const daysDiff = (now.getTime() - analysisDate.getTime()) / (1000 * 60 * 60 * 24)
  
  return daysDiff > daysThreshold
}

/**
 * Get analysis statistics
 */
export async function getAnalysisStats(): Promise<{
  total: number
  byConfidence: Record<string, number>
  recent: number
}> {
  try {
    // Get total count
    const { count: total } = await supabase
      .from('grok_analysis')
      .select('*', { count: 'exact', head: true })

    // Get count by confidence
    const { data: confidenceData } = await supabase
      .from('grok_analysis')
      .select('confidence')

    const byConfidence = confidenceData?.reduce((acc, item) => {
      acc[item.confidence] = (acc[item.confidence] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    // Get recent count (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { count: recent } = await supabase
      .from('grok_analysis')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    return {
      total: total || 0,
      byConfidence,
      recent: recent || 0
    }
  } catch (error) {
    console.error('Error fetching analysis stats:', error)
    return {
      total: 0,
      byConfidence: {},
      recent: 0
    }
  }
}
