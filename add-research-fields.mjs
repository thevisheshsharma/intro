import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Get Supabase credentials from environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function addResearchFields() {
  try {
    console.log('Reading migration file...')
    const migration = fs.readFileSync('migrations/20250615_add_research_fields.sql', 'utf8')
    
    console.log('Executing migration...')
    
    // Since we can't execute raw SQL with the anon key, let's add columns one by one
    // This is a workaround for the limitations of the anon key
    
    console.log('Adding research_sources column...')
    // We'll catch the error if the column already exists
    try {
      const { error: error1 } = await supabase.rpc('exec_sql', { 
        sql: 'ALTER TABLE organizations ADD COLUMN IF NOT EXISTS research_sources JSONB;' 
      })
      if (error1) console.log('research_sources column might already exist or we need different permissions')
    } catch (e) {
      console.log('Could not add research_sources via RPC')
    }
    
    console.log('Migration commands prepared. You may need to run these manually in Supabase dashboard:')
    console.log(migration)
    
  } catch (error) {
    console.error('Error:', error)
  }
}

addResearchFields()
