const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const migrationSQL = fs.readFileSync('migrations/20250615_organizations_icp.sql', 'utf8')
    
    console.log('Running migration...')
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration failed:', error)
    } else {
      console.log('Migration completed successfully!')
    }
  } catch (err) {
    console.error('Error running migration:', err)
  }
}

runMigration()
