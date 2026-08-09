import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
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
  Neo4jAnalysisMapper,
  processICPRelationships,
} from '@/services'
import { logAPIError } from '@/lib/error-utils'

const analyzeOrganizationSchema = z.object({
  twitterUsername: z.string().trim().regex(/^@?[A-Za-z0-9_]{1,15}$/),
}).strict()

function readStoredStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const values = value.filter((item): item is string => typeof item === 'string')
    return values.length ? values : undefined
  }
  if (typeof value !== 'string') return undefined

  try {
    return readStoredStringArray(JSON.parse(value))
  } catch {
    return undefined
  }
}

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
    const [organization, profile, before] = await Promise.all([
      ensureUserExists(screenName, screenName),
      fetchTwitterProfile(screenName),
      getOrganizationProperties(screenName),
    ])
    const storedClassification = before ? {
      orgType: typeof before.orgType === 'string' ? before.orgType : undefined,
      orgSubtype: readStoredStringArray(before.orgSubtype),
      web3Focus: typeof before.web3Focus === 'string' ? before.web3Focus : undefined,
    } : undefined
    const descriptionUnchanged = (
      typeof before?.description === 'string' &&
      typeof profile.description === 'string' &&
      before.description.trim() === profile.description.trim()
    )
    const canReuseStoredClassification = Boolean(
      descriptionUnchanged &&
      storedClassification?.orgType &&
      storedClassification.web3Focus
    )

    const classificationPromise = classifyOrganization(screenName, profile, organization.userId)
    const concurrentIcpPromise = canReuseStoredClassification
      ? createStructuredICPAnalysis(screenName, storedClassification, { persist: false })
      : null
    const [classification, concurrentIcp] = concurrentIcpPromise
      ? await Promise.all([classificationPromise, concurrentIcpPromise])
      : [await classificationPromise, null]

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

    // A current stored classification can overlap research with cache validation;
    // otherwise the fresh classification selects the smaller type-specific schema.
    const resolvedIcp = concurrentIcp ?? await createStructuredICPAnalysis(screenName, {
      orgType: classification.orgType,
      orgSubtype: classification.orgSubtype,
      web3Focus: classification.web3Focus,
    }, { persist: false })

    await Neo4jAnalysisMapper.storeAnalysisToNeo4j(organization.userId, resolvedIcp, {
      orgType: classification.orgType,
      orgSubtype: classification.orgSubtype,
      web3Focus: classification.web3Focus,
    })

    waitUntil(
      processICPRelationships(screenName, {
        competitors: resolvedIcp.competitors ?? undefined,
        investors: resolvedIcp.investors ?? undefined,
        partners: resolvedIcp.partners ?? undefined,
        auditor: resolvedIcp.auditor ?? undefined,
      }).catch(error => {
        logAPIError(error, 'Organization ICP Relationship Enrichment', '/api/grok-analyze-org', undefined)
      })
    )

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.userId,
        name: profile.name || screenName,
        twitter_username: screenName,
      },
      icp: resolvedIcp,
      fromCache: before?.timestamp_utc === resolvedIcp.timestamp_utc,
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
