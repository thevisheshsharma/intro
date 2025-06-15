// Quick test to check database schema
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function checkSchema() {
  try {
    console.log('Testing database connection...')
    
    // Test organizations table
    const { data: orgTest, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .limit(1)
    
    if (orgError) {
      console.log('Organizations table error:', orgError.message)
    } else {
      console.log('Organizations table: ✅ Accessible')
    }
    
    // Test organization_icp table
    const { data: icpTest, error: icpError } = await supabase
      .from('organization_icp')
      .select('*')
      .limit(1)
    
    if (icpError) {
      console.log('Organization ICP table error:', icpError.message)
    } else {
      console.log('Organization ICP table: ✅ Accessible')
    }
    
    console.log('Database schema test completed')
    
  } catch (error) {
    console.error('Database test failed:', error)
  }
}

checkSchema()
