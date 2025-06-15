import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { 
  saveOrganization, 
  getOrganizationByUserId,
  getOrganizationByUserIdAndTwitter,
  saveICPAnalysis,
  getICPAnalysis,
  type Organization,
  type OrganizationICP 
} from '@/lib/organization'

// GET: Retrieve user's organization and ICP
export async function GET(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    const { searchParams } = new URL(request.url)
    const twitter_username = searchParams.get('twitter_username')
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
    console.error('Error fetching organization:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch organization' 
    }, { status: 500 })
  }
}

// POST: Save organization
export async function POST(request: NextRequest) {
  try {
    const { userId } = getAuth(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = await request.json()
    const { twitter_username, business_info } = body
    if (!twitter_username) {
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }
    const organization = await saveOrganization({
      user_id: userId,
      twitter_username: twitter_username.replace('@', ''),
      business_info
    })
    if (!organization) {
      return NextResponse.json({ 
        error: 'Failed to save organization' 
      }, { status: 500 })
    }
    // Always return canonical org+icp after save
    const icp = await getICPAnalysis(organization.id!)
    return NextResponse.json({ organization, icp })
  } catch (error: any) {
    console.error('Error saving organization:', error)
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
    const { organizationId, icp, customNotes, twitter_username } = body
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
        isCustom: true,
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
    console.error('Error updating ICP:', error)
    return NextResponse.json({ 
      error: error.message || 'Failed to update ICP' 
    }, { status: 500 })
  }
}
