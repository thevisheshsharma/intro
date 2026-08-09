import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { COST_BEARING_RATE_LIMITS, requireUserAccess } from '@/lib/security/api-access'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'
import { createStructuredICPAnalysis } from '@/lib/grok'
import { XaiIntegrationError } from '@/integrations/xai'
import {
  classifyOrganization,
  fetchTwitterProfile,
} from '@/lib/classifier'
import {
  ensureUserExists,
  getOrganizationProperties,
  processICPRelationships,
} from '@/services'
import { logAPIError } from '@/lib/error-utils'

const analyzeOrganizationSchema = z.object({
  twitterUsername: z.string().trim().regex(/^@?[A-Za-z0-9_]{1,15}$/),
}).strict()

export const maxDuration = 300

export async function POST(request: NextRequest) {
  try {
    const access = await requireUserAccess(request, {
      feature: 'companyIntel',
      rateLimit: COST_BEARING_RATE_LIMITS.companyIntel,
    })
    if (!access.ok) return access.response

    const { twitterUsername } = await parseJsonBody(request, analyzeOrganizationSchema)
    const screenName = twitterUsername.replace(/^@/, '').toLowerCase()
    const organization = await ensureUserExists(screenName, screenName)
    const profile = await fetchTwitterProfile(screenName)
    const classification = await classifyOrganization(screenName, profile, organization.userId)

    if (classification.vibe !== 'organization') {
      return NextResponse.json({
        error: classification.vibe === 'spam'
          ? 'This account appears to be spam.'
          : 'ICP analysis requires an organization account.',
        classification,
      }, { status: 400 })
    }

    if (classification.web3Focus === 'traditional') {
      return NextResponse.json({
        error: 'This organization does not appear to be Web3 focused.',
        classification,
      }, { status: 400 })
    }

    const before = await getOrganizationProperties(screenName)
    const icp = await createStructuredICPAnalysis(screenName, {
      orgType: classification.orgType,
      orgSubtype: classification.orgSubtype,
      web3Focus: classification.web3Focus,
    })

    await processICPRelationships(screenName, {
      competitors: icp.competitors ?? undefined,
      investors: icp.investors ?? undefined,
      partners: icp.partners ?? undefined,
      auditor: icp.auditor ?? undefined,
    })

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.userId,
        name: profile.name || screenName,
        twitter_username: screenName,
      },
      icp,
      fromCache: before?.timestamp_utc === icp.timestamp_utc,
    })
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    logAPIError(error, 'Organization ICP Analysis', '/api/grok-analyze-org', undefined)
    if (error instanceof XaiIntegrationError) {
      const status = error.code === 'not_configured' ? 500 : 503
      return NextResponse.json({ error: error.message }, { status })
    }

    return NextResponse.json({ error: 'Failed to analyze organization ICP' }, { status: 500 })
  }
}
