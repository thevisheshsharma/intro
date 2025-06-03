'use client'

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Get the site URL from environment or default to production URL
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL 
  || process.env.NEXT_PUBLIC_VERCEL_URL 
  || 'http://localhost:3000'

// Ensure the URL has https:// prefix in production
const url = siteUrl.includes('http') ? siteUrl : `https://${siteUrl}`

// Create Supabase client with auth configuration
export const supabase = createClient<Database>(
  supabaseUrl, 
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: 'auth-v3',
    },
    global: {
      headers: {
        'x-application-url': url
      }
    }
  }
)

// Helper function to get the site URL
export function getSiteUrl() {
  return url
}
