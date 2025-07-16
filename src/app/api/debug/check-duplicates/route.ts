import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const username = searchParams.get('username')
    
    if (!username) {
      return NextResponse.json({ error: 'Username required' }, { status: 400 })
    }
    
    console.log('🔍 Debug: Checking for duplicates of username:', username)
    
    // Get all organizations with this username
    const { data: orgs, error } = await supabase
      .from('organizations')
      .select('id, twitter_username, name, created_at, created_by_user_id')
      .eq('twitter_username', username)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Debug error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('🔍 Debug: Found organizations:', orgs)
    
    return NextResponse.json({
      username,
      count: orgs.length,
      organizations: orgs,
      hasDuplicates: orgs.length > 1
    })
  } catch (error: any) {
    console.error('❌ Debug API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
