import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { logAPIError } from '@/lib/error-utils'
import { getOrganizationProperties, getOrganizationForUI, updateOrganizationProperties, getUserByScreenName, createOrganizationUser } from '@/services'

export const dynamic = 'force-dynamic'

// Organization type definition (moved from deleted organization.ts)
interface Organization {
  id: string
  name: string
  twitter_username: string
  created_at?: string
  updated_at?: string
}

// GET: Retrieve organization and ICP (global, not user-specific)
export async function GET(request: NextRequest) {
  const { userId } = await verifyPrivyToken(request)

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

    // Check Neo4j for existing user with this screenName
    console.log('🔍 Checking Neo4j for user with screenName:', twitter_username)
    const existingNeo4jUser = await getUserByScreenName(twitter_username)

    if (existingNeo4jUser) {
      console.log('✅ Found existing user in Neo4j:', existingNeo4jUser.userId)

      // Get ICP data from Neo4j
      const icp = await getOrganizationForUI(twitter_username)
      console.log('📊 ICP found in Neo4j:', icp ? 'YES' : 'NO')

      return NextResponse.json({
        organization: {
          id: existingNeo4jUser.userId,
          name: existingNeo4jUser.name || twitter_username,
          twitter_username: twitter_username
        },
        icp
      })
    }

    console.log('ℹ️ No organization found in Neo4j, returning null')
    return NextResponse.json({ organization: null, icp: null })

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
  const { userId, error: authError } = await verifyPrivyToken(request)

  try {
    if (authError || !userId) {
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

    // Check if user exists in Neo4j with this screenName
    console.log('🔍 Checking Neo4j for existing user with screenName:', twitter_username)
    let existingNeo4jUser = await getUserByScreenName(twitter_username)

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

      return NextResponse.json({
        organization: {
          id: existingNeo4jUser.userId,
          name: existingNeo4jUser.name || twitter_username,
          twitter_username: twitter_username
        },
        icp
      })
    }

    // User doesn't exist, create it
    console.log('🆕 Creating new organization user...')

    if (body.basic_identification && body.icp_synthesis) {
      console.log('📊 Creating from detailed Grok response')
      // Create organization user and update with comprehensive data
      existingNeo4jUser = await createOrganizationUser(
        twitter_username,
        body.basic_identification?.project_name || body.twitter_username || 'Unknown'
      )
      await updateOrganizationProperties(existingNeo4jUser.userId, body)
    } else {
      console.log('📝 Creating from basic fields')
      // Create basic organization user
      existingNeo4jUser = await createOrganizationUser(
        twitter_username,
        body.name || twitter_username
      )
    }

    if (!existingNeo4jUser) {
      console.log('❌ Failed to create organization user')
      return NextResponse.json({
        error: 'Failed to create organization'
      }, { status: 500 })
    }

    console.log('✅ Organization user created:', existingNeo4jUser.userId)

    // Get ICP data from Neo4j
    const icp = await getOrganizationForUI(twitter_username)

    console.log('✅ Final response - org created, icp:', icp ? 'YES' : 'NO')
    return NextResponse.json({
      organization: {
        id: existingNeo4jUser.userId,
        name: existingNeo4jUser.name || twitter_username,
        twitter_username: twitter_username
      },
      icp
    })
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
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { icp, customNotes } = body
    let { twitter_username } = body

    if (!twitter_username) {
      return NextResponse.json({
        error: 'Twitter username is required'
      }, { status: 400 })
    }

    twitter_username = twitter_username.replace(/^@/, '').toLowerCase()

    // Check if user exists in Neo4j
    const existingUser = await getUserByScreenName(twitter_username)

    if (!existingUser) {
      return NextResponse.json({
        error: 'Organization not found'
      }, { status: 404 })
    }

    // Update ICP data in Neo4j
    const updatedData = { ...icp, custom_notes: customNotes }
    await updateOrganizationProperties(existingUser.userId, updatedData)

    // Get updated data from Neo4j
    const savedICP = await getOrganizationForUI(twitter_username)

    if (!savedICP) {
      return NextResponse.json({
        error: 'Failed to save ICP'
      }, { status: 500 })
    }

    return NextResponse.json({ icp: savedICP })
  } catch (error: any) {
    logAPIError(error, 'updating ICP', '/api/organization-icp-analysis/save', userId || undefined)
    return NextResponse.json({
      error: error.message || 'Failed to update ICP'
    }, { status: 500 })
  }
}
