import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { logAPIError } from '@/lib/error-utils'
import { getOrganizationProperties, getOrganizationForUI, updateOrganizationProperties, getUserByScreenName } from '@/lib/neo4j/services/user-service'
import { 
  saveOrganization, 
  getOrganizationByTwitter,
  trackUserOrganizationAccess,
  cleanupDuplicateOrganizations,
  type Organization
} from '@/lib/organization'

// GET: Retrieve organization and ICP (global, not user-specific)
export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  
  try {
    const { searchParams } = new URL(request.url)
    let twitter_username = searchParams.get('twitter_username')
    
    console.log('🔍 GET request - twitter_username:', twitter_username, 'userId:', userId)
    
    if (!twitter_username) {
      console.log('❌ No twitter_username provided')
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }
    
    twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
    console.log('🔍 Normalized twitter_username:', twitter_username)
    
    // FIRST: Check Neo4j for existing user with this screenName
    console.log('🔍 Checking Neo4j for user with screenName:', twitter_username)
    const existingNeo4jUser = await getUserByScreenName(twitter_username)
    
    if (existingNeo4jUser) {
      console.log('✅ Found existing user in Neo4j:', existingNeo4jUser.userId)
      
      // Get ICP data from Neo4j
      const icp = await getOrganizationForUI(twitter_username)
      console.log('📊 ICP found in Neo4j:', icp ? 'YES' : 'NO')
      
      // For consistency, also check Supabase for organization record
      const organization = await getOrganizationByTwitter(twitter_username)
      
      // Track user access if authenticated and organization exists in Supabase
      if (userId && organization?.id) {
        console.log('👤 Tracking user access:', userId, 'to org:', organization.id)
        await trackUserOrganizationAccess(userId, organization.id)
      }
      
      return NextResponse.json({ 
        organization: organization || {
          id: existingNeo4jUser.userId,
          name: existingNeo4jUser.name || twitter_username,
          twitter_username: twitter_username
        }, 
        icp 
      })
    }
    
    // SECOND: Fallback to Supabase-only lookup (legacy behavior)
    console.log('🏢 Fallback: Fetching organization from Supabase only...')
    const organization = await getOrganizationByTwitter(twitter_username)
    console.log('📊 Organization found in Supabase:', organization)
    
    if (!organization) {
      console.log('ℹ️ No organization found in either Neo4j or Supabase, returning null')
      return NextResponse.json({ organization: null, icp: null })
    }
    
    // Track user access if authenticated
    if (userId && organization.id) {
      console.log('👤 Tracking user access:', userId, 'to org:', organization.id)
      await trackUserOrganizationAccess(userId, organization.id)
    }
    
    console.log('📊 Fetching ICP analysis from Neo4j for organization:', twitter_username)
    // Use the new centralized UI inflation function
    const icp = await getOrganizationForUI(twitter_username)
    console.log('📊 ICP found in Neo4j:', icp ? 'YES' : 'NO')
    
    const response = {
      organization,
      icp
    }
    console.log('✅ Returning response:', response)
    
    return NextResponse.json(response)
  } catch (error: any) {
    console.error('❌ GET error:', error)
    logAPIError(error, 'fetching organization', '/api/organization-icp-analysis/save', userId || undefined)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch organization' 
    }, { status: 500 })
  }
}

// POST: Save organization (check if exists globally first)
export async function POST(request: NextRequest) {
  const { userId } = getAuth(request)
  
  try {
    if (!userId) {
      console.log('❌ Unauthorized POST request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    let { twitter_username } = body
    
    console.log('📝 POST request - body:', body, 'userId:', userId)
    
    if (!twitter_username) {
      console.log('❌ No twitter_username in POST body')
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }
    
    twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
    console.log('📝 Normalized twitter_username for POST:', twitter_username)
    
    // FIRST: Check if user exists in Neo4j with this screenName
    console.log('🔍 Checking Neo4j for existing user with screenName:', twitter_username)
    const existingNeo4jUser = await getUserByScreenName(twitter_username)
    
    if (existingNeo4jUser) {
      console.log('✅ Found existing user in Neo4j:', existingNeo4jUser.userId)
      
      // Update the existing Neo4j user with ICP data
      if (body.basic_identification && body.icp_synthesis) {
        console.log('📊 Updating existing Neo4j user with Grok response')
        await updateOrganizationProperties(existingNeo4jUser.userId, body)
      }
      
      // Get the updated ICP data
      const icp = await getOrganizationForUI(twitter_username)
      console.log('📊 Updated ICP data retrieved:', icp ? 'YES' : 'NO')
      
      // For consistency, also check if organization exists in Supabase
      const organization = await getOrganizationByTwitter(twitter_username)
      
      return NextResponse.json({ 
        organization: organization || {
          id: existingNeo4jUser.userId,
          name: existingNeo4jUser.name || twitter_username,
          twitter_username: twitter_username
        }, 
        icp 
      })
    }
    
    // SECOND: Check if organization exists in Supabase (legacy behavior)
    console.log('🏢 Checking if organization exists in Supabase...')
    let organization = await getOrganizationByTwitter(twitter_username)
    console.log('📊 Existing organization found:', organization ? 'YES' : 'NO')
    
    if (organization) {
      // Organization exists, just track user access
      console.log('✅ Organization exists, tracking user access')
      if (organization.id) {
        await trackUserOrganizationAccess(userId, organization.id)
      }
      
      // ✅ Check Neo4j for ICP data instead of Supabase
      const icp = await getOrganizationForUI(twitter_username)
      console.log('📊 ICP found in Neo4j for existing org:', icp ? 'YES' : 'NO')
      return NextResponse.json({ organization, icp })
    }
    
    // Organization doesn't exist, create it
    console.log('🆕 Creating new organization...')
    let orgFields: Omit<Organization, 'user_id'> & { created_by_user_id: string }
    
    if (body.basic_identification && body.icp_synthesis) {
      console.log('📊 Creating from detailed Grok response')
      // ✅ Save comprehensive data to Neo4j instead of mapping to Supabase
      await updateOrganizationProperties(userId, body)
      
      orgFields = { 
        created_by_user_id: userId,
        name: body.basic_identification?.project_name || body.twitter_username || 'Unknown',
        twitter_username: (body.twitter_username || '').replace(/^@/, '').toLowerCase(),
        website_url: body.basic_identification?.website_url
      }
    } else {
      console.log('📝 Creating from basic fields')
      // Fallback to legacy fields - only essential organization data
      orgFields = {
        created_by_user_id: userId,
        twitter_username,
        name: body.name || twitter_username
      }
    }
    
    console.log('💾 Saving organization with fields:', orgFields)
    organization = await saveOrganization(orgFields)
    
    if (!organization) {
      console.log('❌ Failed to save organization')
      return NextResponse.json({ 
        error: 'Failed to save organization' 
      }, { status: 500 })
    }
    
    console.log('✅ Organization saved:', organization)
    
    // Track user access
    if (organization.id) {
      console.log('👤 Tracking user access for new org')
      await trackUserOrganizationAccess(userId, organization.id)
    }
    
    // ✅ Get ICP data from Neo4j
    const icp = await getOrganizationForUI(twitter_username)
    
    console.log('✅ Final response - org:', organization, 'icp:', icp ? 'YES' : 'NO')
    return NextResponse.json({ organization, icp })
  } catch (error: any) {
    console.error('❌ POST error:', error)
    logAPIError(error, 'saving organization', '/api/organization-icp-analysis/save', userId || undefined)
    return NextResponse.json({ 
      error: error.message || 'Failed to save organization' 
    }, { status: 500 })
  }
}

// PUT: Update ICP (custom edits)
export async function PUT(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    const body = await request.json()
    const { organizationId, icp, customNotes } = body
    let { twitter_username } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!twitter_username && !organizationId) {
      return NextResponse.json({ 
        error: 'Twitter username or organization ID is required' 
      }, { status: 400 })
    }
    
    let organization = null
    
    if (twitter_username) {
      twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
      organization = await getOrganizationByTwitter(twitter_username)
    } else if (organizationId) {
      // You'd need to implement getOrganizationById for this case
      return NextResponse.json({ 
        error: 'Please provide twitter_username' 
      }, { status: 400 })
    }
    
    if (!organization) {
      return NextResponse.json({ 
        error: 'Organization not found' 
      }, { status: 404 })
    }
    
    // ✅ Update ICP data in Neo4j instead of Supabase
    const updatedData = { ...icp, custom_notes: customNotes }
    await updateOrganizationProperties(userId, updatedData)
    
    // Get updated data from Neo4j
    const savedICP = await getOrganizationForUI(twitter_username)
    
    if (!savedICP) {
      return NextResponse.json({ 
        error: 'Failed to save ICP' 
      }, { status: 500 })
    }
    
    return NextResponse.json({ icp: savedICP })
  } catch (error: any) {
    const { userId } = getAuth(request)
    logAPIError(error, 'updating ICP', '/api/organization-icp-analysis/save', userId || undefined)
    return NextResponse.json({ 
      error: error.message || 'Failed to update ICP' 
    }, { status: 500 })
  }
}
