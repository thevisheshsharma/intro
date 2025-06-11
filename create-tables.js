const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function createTables() {
  try {
    console.log('Creating Grok analysis tables...')
    
    // Create grok_analysis table
    const { error: tableError } = await supabase.rpc('exec_sql', { 
      sql: `
        CREATE TABLE IF NOT EXISTS grok_analysis (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          twitter_username VARCHAR(255) NOT NULL,
          twitter_user_id VARCHAR(255),
          profile_hash VARCHAR(64) NOT NULL,
          role VARCHAR(255),
          company VARCHAR(255),
          expertise TEXT,
          summary TEXT,
          confidence VARCHAR(20) CHECK (confidence IN ('high', 'medium', 'low')),
          raw_profile_data JSONB,
          raw_grok_response TEXT,
          model_used VARCHAR(50),
          analysis_type VARCHAR(50) DEFAULT 'profile',
          token_usage INTEGER,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(twitter_username, profile_hash)
        );
      `
    })
    
    if (tableError && !tableError.message.includes('already exists')) {
      throw tableError
    }
    
    console.log('✅ grok_analysis table created/verified')
    
    // Create cache table
    const { error: cacheError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS grok_analysis_cache (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          cache_key VARCHAR(255) UNIQUE NOT NULL,
          cache_data JSONB NOT NULL,
          expires_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
    })
    
    if (cacheError && !cacheError.message.includes('already exists')) {
      throw cacheError
    }
    
    console.log('✅ grok_analysis_cache table created/verified')
    
    // Test the connection by trying to insert and read
    console.log('Testing database connection...')
    
    const testResult = await supabase
      .from('grok_analysis')
      .select('count(*)')
      .limit(1)
    
    if (testResult.error) {
      console.error('Database test failed:', testResult.error)
    } else {
      console.log('✅ Database connection successful!')
    }
    
  } catch (error) {
    console.error('Failed to create tables:', error)
    console.log('You may need to run the migration manually in the Supabase SQL editor')
    console.log('Migration file: migrations/20250612_grok_analysis.sql')
  }
}

createTables()
