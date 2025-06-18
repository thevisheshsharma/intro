#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function applyMigration() {
  try {
    console.log('🔄 Applying database migration...')
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '20250619_update_organization_icp_schema.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`)
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (statement.trim()) {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`)
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        })
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}:`, error)
          console.error(`Statement: ${statement}`)
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`)
        }
      }
    }
    
    console.log('✅ Migration application completed!')
    
  } catch (error) {
    console.error('❌ Error applying migration:', error)
    
    // If direct SQL execution isn't available, provide manual instructions  
    console.log('\n📋 Manual Migration Instructions:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to SQL Editor')
    console.log('3. Copy and paste the contents of migrations/20250619_update_organization_icp_schema.sql')
    console.log('4. Execute the SQL statements')
    console.log('\nAlternatively, the existing schema should still work with JSONB fields.')
  }
}

applyMigration()
