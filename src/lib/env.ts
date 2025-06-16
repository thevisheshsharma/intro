/**
 * Environment variable validation and configuration
 */

export interface EnvConfig {
  // Database
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  
  // Authentication  
  CLERK_SECRET_KEY: string;
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: string;
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: string;
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: string;
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: string;
  
  // AI Services
  GROK_API_KEY: string;
  OPENAI_API_KEY?: string;
  
  // External APIs
  TWITTER_BEARER_TOKEN?: string;
  TWITTER_API_KEY?: string;
  TWITTER_API_SECRET?: string;
  
  // App Configuration
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_APP_URL: string;
}

/**
 * Required environment variables
 */
const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'CLERK_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'GROK_API_KEY',
] as const;

/**
 * Optional environment variables with defaults
 */
const ENV_DEFAULTS = {
  NODE_ENV: 'development' as const,
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: '/sign-in',
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: '/sign-up',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: '/',
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
};

/**
 * Validate environment variables
 */
export function validateEnv(): EnvConfig {
  const missing: string[] = [];
  
  // Check required variables
  for (const key of REQUIRED_ENV_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
  
  // Build config object with validation
  const env = process.env as Record<string, string>;
  
  return {
    // Required variables
    SUPABASE_URL: env.SUPABASE_URL,
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
    CLERK_SECRET_KEY: env.CLERK_SECRET_KEY,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    GROK_API_KEY: env.GROK_API_KEY,
    
    // Optional variables with defaults
    NODE_ENV: (env.NODE_ENV as EnvConfig['NODE_ENV']) || ENV_DEFAULTS.NODE_ENV,
    NEXT_PUBLIC_CLERK_SIGN_IN_URL: env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || ENV_DEFAULTS.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_SIGN_UP_URL: env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || ENV_DEFAULTS.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || ENV_DEFAULTS.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL,
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || ENV_DEFAULTS.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL,
    NEXT_PUBLIC_APP_URL: env.NEXT_PUBLIC_APP_URL || ENV_DEFAULTS.NEXT_PUBLIC_APP_URL,
    
    // Optional external API keys
    OPENAI_API_KEY: env.OPENAI_API_KEY,
    TWITTER_BEARER_TOKEN: env.TWITTER_BEARER_TOKEN,
    TWITTER_API_KEY: env.TWITTER_API_KEY,
    TWITTER_API_SECRET: env.TWITTER_API_SECRET,
  };
}

/**
 * Get validated environment configuration
 * This will throw an error if required variables are missing
 */
export const env = validateEnv();

/**
 * Check if we're in development mode
 */
export const isDevelopment = env.NODE_ENV === 'development';

/**
 * Check if we're in production mode
 */
export const isProduction = env.NODE_ENV === 'production';

/**
 * Check if we're in test mode
 */
export const isTest = env.NODE_ENV === 'test';
