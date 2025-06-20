/**
 * Application constants and configuration values
 */

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  TWITTER_PROFILE: 1000 * 60 * 60 * 24, // 24 hours
  GROK_ANALYSIS: 1000 * 60 * 60 * 12, // 12 hours
  ORGANIZATION_DATA: 1000 * 60 * 60 * 6, // 6 hours
} as const;

// Analysis confidence levels
export const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

// Analysis types
export const ANALYSIS_TYPES = {
  GENERAL: 'general',
  TWITTER: 'twitter',
  PROFILE: 'profile',
  CONTENT: 'content',
  ORGANIZATION: 'organization',
} as const;

export type ConfidenceLevel = typeof CONFIDENCE_LEVELS[keyof typeof CONFIDENCE_LEVELS];
export type AnalysisType = typeof ANALYSIS_TYPES[keyof typeof ANALYSIS_TYPES];
