import { NextRequest, NextResponse } from 'next/server'
import { requireUserAccess } from '@/lib/security/api-access'
import { getOrganizationForUI, getUserByScreenName } from '@/services'
import { logAPIError } from '@/lib/error-utils'

const X_HANDLE_PATTERN = /^[A-Za-z0-9_]{1,15}$/

export const dynamic = 'force-dynamic'

/** Read-only compatibility URL used by the ICP screen. Canonical writes happen in the analysis use case. */
export async function GET(request: NextRequest) {
  const access = await requireUserAccess(request, { feature: 'companyIntel' })
  if (!access.ok) return access.response

  try {
    const requested = new URL(request.url).searchParams.get('twitter_username')
    const screenName = requested?.trim().replace(/^@/, '').toLowerCase()
    if (!screenName || !X_HANDLE_PATTERN.test(screenName)) {
      return NextResponse.json({ error: 'A valid X username is required' }, { status: 400 })
    }

    const organization = await getUserByScreenName(screenName)
    if (!organization) {
      return NextResponse.json({ organization: null, icp: null })
    }

    const properties = await getOrganizationForUI(screenName)
    const hasCanonicalAnalysis = Boolean(properties?.last_icp_analysis && properties?.timestamp_utc)
    return NextResponse.json({
      organization: {
        id: organization.userId,
        name: organization.name || screenName,
        twitter_username: screenName,
      },
      icp: hasCanonicalAnalysis ? properties : null,
    })
  } catch (error) {
    logAPIError(error, 'fetching organization', '/api/organization-icp-analysis/save', access.actor.userId)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}
