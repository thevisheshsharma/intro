/**
 * Application constants and configuration values
 */

// Cache durations (in milliseconds)
export const CACHE_DURATIONS = {
  TWITTER_PROFILE: 1000 * 60 * 60 * 24 * 90, // 3 months
  GROK_ANALYSIS: 1000 * 60 * 60 * 24 * 90, // 3 months
  ORGANIZATION_DATA: 1000 * 60 * 60 * 24 * 90, // 3 months
} as const;

// Analysis confidence levels
export const CONFIDENCE_LEVELS = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const;

export type ConfidenceLevel = typeof CONFIDENCE_LEVELS[keyof typeof CONFIDENCE_LEVELS];
