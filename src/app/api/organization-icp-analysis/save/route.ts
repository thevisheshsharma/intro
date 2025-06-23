import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { logAPIError } from '@/lib/error-utils'
import { 
  saveOrganization, 
  getOrganizationByUserId,
  getOrganizationByUserIdAndTwitter,
  saveICPAnalysis,
  getICPAnalysis,
  mapNewOrgJsonToDbFields,
  type Organization,
  type OrganizationICP 
} from '@/lib/organization'

// GET: Retrieve user's organization and ICP
export async function GET(request: NextRequest) {
  const { userId } = getAuth(request)
  
  try {
    const { searchParams } = new URL(request.url)
    let twitter_username = searchParams.get('twitter_username')
    if (twitter_username) {
      twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let organization = null
    if (twitter_username) {
      organization = await getOrganizationByUserIdAndTwitter(userId, twitter_username)
    } else {
      organization = await getOrganizationByUserId(userId)
    }
    if (!organization) {
      return NextResponse.json({ organization: null, icp: null })
    }
    const icp = await getICPAnalysis(organization.id!)
    return NextResponse.json({
      organization,
      icp
    })
  } catch (error: any) {
    logAPIError(error, 'fetching organization', '/api/organization-icp-analysis/save', userId || undefined)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch organization' 
    }, { status: 500 })
  }
}

// POST: Save organization
export async function POST(request: NextRequest) {
  const { userId } = getAuth(request)
  
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    // If the body is in the new JSON format, map it
    let orgFields: Organization
    let icpFields: Partial<OrganizationICP> | undefined
    if (body.basic_identification && body.icp_synthesis) {
      const mapped = mapNewOrgJsonToDbFields(body)
      orgFields = { 
        ...mapped.org, 
        user_id: userId,
        // Ensure required fields are present
        name: mapped.org.name || body.twitter_username || 'Unknown',
        twitter_username: (mapped.org.twitter_username || body.twitter_username || '').replace(/^@/, '').toLowerCase()
      }
      icpFields = mapped.icp
    } else {
      // Fallback to legacy fields - only essential organization data
      let { twitter_username } = body
      if (!twitter_username) {
        return NextResponse.json({ 
          error: 'Twitter username is required' 
        }, { status: 400 })
      }
      twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
      orgFields = {
        user_id: userId,
        twitter_username
      }
    }
    const organization = await saveOrganization(orgFields)
    if (!organization) {
      return NextResponse.json({ 
        error: 'Failed to save organization' 
      }, { status: 500 })
    }
    // Save ICP if present in new format
    let icp = null
    if (icpFields) {
      icp = await saveICPAnalysis(organization.id!, icpFields as any, {})
    } else {
      icp = await getICPAnalysis(organization.id!)
    }
    return NextResponse.json({ organization, icp })
  } catch (error: any) {
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
    if (twitter_username) {
      twitter_username = twitter_username.replace(/^@/, '').toLowerCase()
    }
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    let organization = null
    if (twitter_username) {
      organization = await getOrganizationByUserIdAndTwitter(userId, twitter_username)
    } else if (organizationId) {
      organization = await getOrganizationByUserId(userId)
      if (organization?.id !== organizationId) organization = null
    }
    if (!organization || (!organizationId && !twitter_username)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const savedICP = await saveICPAnalysis(
      organization.id!,
      icp,
      {
        customNotes
      }
    )
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
