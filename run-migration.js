const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function runMigration() {
  try {
    console.log('Running Grok analysis database migration...')
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '20250612_grok_analysis.sql')
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8')
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .filter(statement => statement.trim().length > 0)
      .map(statement => statement.trim() + ';')
    
    console.log(`Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error && !error.message.includes('already exists')) {
        console.error(`Error executing statement ${i + 1}:`, error)
        throw error
      }
    }
    
    console.log('✅ Migration completed successfully!')
    
    // Test the tables were created
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['grok_analysis', 'grok_analysis_cache'])
    
    if (tablesError) {
      console.error('Error checking tables:', tablesError)
    } else {
      console.log('Created tables:', tables.map(t => t.table_name))
    }
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
