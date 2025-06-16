import { supabase } from './supabase';
import { CONFIDENCE_LEVELS, ANALYSIS_TYPES, type ConfidenceLevel, type AnalysisType } from './constants';
import crypto from 'crypto';

export interface StructuredAnalysis {
  role: string;
  company: string;
  expertise: string;
  summary: string;
  confidence: ConfidenceLevel;
}

export interface GrokAnalysisRecord {
  id?: string;
  twitter_username: string;
  twitter_user_id?: string;
  profile_hash: string;
  role?: string;
  company?: string;
  expertise?: string;
  summary?: string;
  confidence?: ConfidenceLevel;
  raw_profile_data?: any;
  raw_grok_response?: string;
  model_used?: string;
  analysis_type?: AnalysisType;
  token_usage?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TwitterProfile {
  name: string;
  screen_name: string;
  description: string;
  location?: string;
  url?: string;
  followers_count?: number;
  friends_count?: number;
  verified?: boolean;
}

/**
 * Generate a hash for profile data to use for cache invalidation
 */
export function generateProfileHash(profile: TwitterProfile): string {
  const profileString = JSON.stringify({
    name: profile.name,
    description: profile.description,
    location: profile.location,
    url: profile.url,
    verified: profile.verified
  });
  
  return crypto.createHash('sha256').update(profileString).digest('hex');
}

/**
 * Save Grok analysis results to the database
 */
export async function saveGrokAnalysis(
  profile: TwitterProfile,
  analysis: StructuredAnalysis,
  metadata: {
    rawResponse?: string;
    modelUsed?: string;
    analysisType?: string;
    tokenUsage?: number;
  }
): Promise<GrokAnalysisRecord | null> {
  try {
    const profileHash = generateProfileHash(profile);
    
    const record: Omit<GrokAnalysisRecord, 'id' | 'created_at' | 'updated_at'> = {
      twitter_username: profile.screen_name,
      profile_hash: profileHash,
      role: analysis.role,
      company: analysis.company,
      expertise: analysis.expertise,
      summary: analysis.summary,
      confidence: analysis.confidence,
      raw_profile_data: profile,
      raw_grok_response: metadata.rawResponse,
      model_used: metadata.modelUsed || 'grok-3-mini-fast',
      analysis_type: (metadata.analysisType as AnalysisType) || ANALYSIS_TYPES.PROFILE,
      token_usage: metadata.tokenUsage
    };

    const { data, error } = await supabase
      .from('grok_analysis')
      .upsert(record, {
        onConflict: 'twitter_username,profile_hash',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving Grok analysis:', error);
      return null;
    }

    return data as GrokAnalysisRecord;
  } catch (error) {
    console.error('Error in saveGrokAnalysis:', error);
    return null;
  }
}

/**
 * Get existing Grok analysis from database
 */
export async function getGrokAnalysis(
  profile: TwitterProfile
): Promise<StructuredAnalysis | null> {
  try {
    const profileHash = generateProfileHash(profile);
    
    const { data, error } = await supabase
      .from('grok_analysis')
      .select('*')
      .eq('twitter_username', profile.screen_name)
      .eq('profile_hash', profileHash)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching Grok analysis:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    // Convert database record to StructuredAnalysis
    return {
      role: data.role || 'Unknown',
      company: data.company || 'Not specified',
      expertise: data.expertise || 'Not specified',
      summary: data.summary || 'No summary available',
      confidence: data.confidence || 'low'
    };
  } catch (error) {
    console.error('Error in getGrokAnalysis:', error);
    return null;
  }
}

/**
 * Check if we have a recent analysis for this profile
 * Returns cached analysis if profile hasn't changed and analysis is recent
 */
export async function getCachedGrokAnalysis(
  profile: TwitterProfile,
  maxAgeHours: number = 24
): Promise<StructuredAnalysis | null> {
  try {
    const profileHash = generateProfileHash(profile);
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('grok_analysis')
      .select('*')
      .eq('twitter_username', profile.screen_name)
      .eq('profile_hash', profileHash)
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error fetching cached Grok analysis:', error);
      return null;
    }

    if (!data) {
      return null;
    }

    console.log(`Found cached analysis for @${profile.screen_name} (${data.created_at})`);

    return {
      role: data.role || 'Unknown',
      company: data.company || 'Not specified',
      expertise: data.expertise || 'Not specified',
      summary: data.summary || 'No summary available',
      confidence: data.confidence || 'low'
    };
  } catch (error) {
    console.error('Error in getCachedGrokAnalysis:', error);
    return null;
  }
}

/**
 * Get analysis statistics
 */
export async function getGrokAnalysisStats() {
  try {
    const { data, error } = await supabase
      .from('grok_analysis')
      .select('confidence, model_used, created_at', { count: 'exact' });

    if (error) {
      console.error('Error fetching analysis stats:', error);
      return null;
    }

    return {
      total: data.length,
      byConfidence: data.reduce((acc, item) => {
        acc[item.confidence] = (acc[item.confidence] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byModel: data.reduce((acc, item) => {
        acc[item.model_used] = (acc[item.model_used] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recent: data.filter(item => 
        new Date(item.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      ).length
    };
  } catch (error) {
    console.error('Error in getGrokAnalysisStats:', error);
    return null;
  }
}

/**
 * Clean old analysis records (optional cleanup function)
 */
export async function cleanOldAnalysis(daysOld: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();
    
    const { count, error } = await supabase
      .from('grok_analysis')
      .delete({ count: 'exact' })
      .lt('created_at', cutoffDate);

    if (error) {
      console.error('Error cleaning old analysis:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Error in cleanOldAnalysis:', error);
    return 0;
  }
}
