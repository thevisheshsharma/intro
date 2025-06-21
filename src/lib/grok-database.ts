import { supabase } from './supabase';
import { type ConfidenceLevel } from './constants';
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
  analysis_type?: 'general' | 'profile';
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
    analysisType?: 'general' | 'profile';
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
      analysis_type: metadata.analysisType || 'profile',
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

    // Using cached analysis for profile

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


