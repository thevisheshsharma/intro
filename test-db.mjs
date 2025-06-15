import { supabase } from './src/lib/supabase.js'

async function testConnection() {
  try {
    console.log('Testing Supabase connection...')
    
    // Try to query existing tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
    
    if (error) {
      console.error('Error querying tables:', error)
    } else {
      console.log('Existing tables:', tables?.map(t => t.table_name))
    }
    
    // Check if organizations table exists
    const { data: orgCheck, error: orgError } = await supabase
      .from('organizations')
      .select('count')
      .limit(1)
    
    if (orgError) {
      console.log('Organizations table does not exist:', orgError.message)
    } else {
      console.log('Organizations table exists!')
    }
    
  } catch (err) {
    console.error('Connection test failed:', err)
  }
}

testConnection()
