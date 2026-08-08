import { NextRequest, NextResponse } from 'next/server'
import { COST_BEARING_RATE_LIMITS, requireUserAccess } from '@/lib/security/api-access'
import { createStructuredICPAnalysis, ICPAnalysisConfig } from '@/lib/grok'
import { logAPIError, logExternalServiceError } from '@/lib/error-utils'
import { getOrganizationProperties, getOrganizationForUI, getUserByScreenName, updateOrganizationProperties, ensureUserExists, processICPRelationships } from '@/services'
import { 
  classifyOrganization, 
  fetchTwitterProfile,
  saveClassificationToNeo4j,
  type ClassificationResult 
} from '@/lib/classifier'
import { createSafeRouteLogger } from '@/lib/safe-logger'
import { z } from 'zod'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'

const logger = createSafeRouteLogger('grok-analyze-org')
const analyzeOrganizationSchema = z.object({
  twitterUsername: z.string().trim().min(1).max(50),
}).strict()

// Helper function to extract social insights
function extractSocialInsights(icpAnalysis: any) {
  if (!icpAnalysis.basic_identification) return {}
  
  return {
    website_url: icpAnalysis.basic_identification.website_url,
    industry_classification: icpAnalysis.basic_identification.industry_classification,
    estimated_company_size: icpAnalysis.governance_tokenomics?.organizational_structure?.team_structure,
    recent_developments: icpAnalysis.ecosystem_analysis?.recent_developments?.join('; '),
    key_partnerships: icpAnalysis.ecosystem_analysis?.notable_partnerships || [],
    funding_info: icpAnalysis.governance_tokenomics?.organizational_structure?.funding_info
  }
}

// Helper function to create detailed response format - optimized to reduce redundant copying
function createDetailedResponse(icpAnalysis: any): any {
  return {
    twitter_username: icpAnalysis.twitter_username,
    timestamp_utc: icpAnalysis.timestamp_utc,
    // Pass structured objects directly - no need to reconstruct
    basic_identification: icpAnalysis.basic_identification,
    core_metrics: icpAnalysis.core_metrics,
    ecosystem_analysis: icpAnalysis.ecosystem_analysis,
    governance_tokenomics: {
      ...icpAnalysis.governance_tokenomics,
      // Only add default tokenomics if missing
      tokenomics: icpAnalysis.governance_tokenomics?.tokenomics || {
        native_token: '',
        utility: { governance: false, staking: false, fee_discount: false, collateral: false },
        description: ''
      }
    },
    user_behavior_insights: icpAnalysis.user_behavior_insights,
    icp_synthesis: icpAnalysis.icp_synthesis,
    messaging_strategy: icpAnalysis.messaging_strategy
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.GROK_API_KEY) {
      logger.log('❌ Grok API key not configured')
      return NextResponse.json({ 
        error: 'Grok API key not configured. Please set the GROK_API_KEY environment variable.' 
      }, { status: 500 })
    }

    const access = await requireUserAccess(request, {
      feature: 'companyIntel',
      rateLimit: COST_BEARING_RATE_LIMITS.companyIntel,
    })
    if (!access.ok) return access.response
    const userId = access.actor.userId

    const { twitterUsername } = await parseJsonBody(request, analyzeOrganizationSchema)

    logger.log('🤖 Grok analysis request - twitterUsername:', twitterUsername, 'userId:', userId)

    if (!twitterUsername) {
      logger.log('❌ No twitterUsername provided')
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }

    // Sanitize username once
    const sanitizedUsername = twitterUsername.replace('@', '').toLowerCase()
    logger.log('🤖 Sanitized username:', sanitizedUsername)

    // Step 1: Ensure organization user exists (prevents duplicates)
    logger.log('🔍 Step 1: Ensuring organization user exists...')
    const user = await ensureUserExists(sanitizedUsername, sanitizedUsername)
    logger.log('✅ Organization user ready:', user.userId)

    // Step 2: Classification Pipeline with existing user coordination
    logger.log('🔍 Step 2: Starting organization classification pipeline...')
    let classification: ClassificationResult | undefined; // Declare classification variable
    
    try {
      // Fetch Twitter profile data
      logger.log('  → Fetching Twitter profile...')
      const profileData = await fetchTwitterProfile(sanitizedUsername)
      logger.log('  → ✅ Twitter profile fetched')
      
      // Run classification with existing user ID to prevent duplicate creation
      logger.log('  → Running classification analysis...')
      classification = await classifyOrganization(sanitizedUsername, profileData, user.userId)
      logger.log('  → ✅ Classification complete:', classification)
      
      // Handle different classification results
      if (classification.vibe === 'individual') {
        logger.log('  → ❌ Account classified as individual')
        return NextResponse.json({
          error: 'This appears to be an individual account. ICP analysis is designed for organizations.',
          classification,
          suggestion: 'Try using our individual profile analysis tools instead.'
        }, { status: 400 })
      }
      
      if (classification.vibe === 'spam') {
        logger.log('  → ❌ Account classified as spam')
        return NextResponse.json({
          error: 'This account appears to be a spam account.',
          classification,
          suggestion: 'Please verify the account and try again.'
        }, { status: 400 })
      }
      
      if (classification.web3Focus === 'traditional') {
        logger.log('  → ❌ Organization is not Web3 focused')
        return NextResponse.json({
          error: 'This organization does not appear to be Web3/crypto focused.',
          classification,
          suggestion: 'ICP analysis is currently designed for Web3 organizations.'
        }, { status: 400 })
      }

      // Proceed with Web3 organization analysis
      logger.log('  → ✅ Valid Web3 organization detected, proceeding with ICP analysis')
      logger.log(`  → Organization type: ${classification.orgType || 'general'}`)
      logger.log(`  → Organization subtype: ${classification.orgSubtype || 'general'}`)
      
    } catch (classificationError: any) {
      logger.error('❌ Classification error:', classificationError)
      // For now, continue with analysis if classification fails
      logger.log('⚠️ Classification failed, continuing with traditional analysis...')
      classification = undefined; // Ensure undefined for fallback schema
    }

    // Step 3: Check for existing ICP analysis (using coordinated user)
    logger.log('🔍 Step 3: Checking for existing ICP analysis...')
    const existingProperties = await getOrganizationForUI(sanitizedUsername)
    
    if (existingProperties?.icp_synthesis) {
      logger.log('✅ Existing ICP found in Neo4j, returning from cache')
      
      // Return existing ICP analysis from Neo4j (already inflated for UI)
      return NextResponse.json({
        success: true,
        organization: {
          id: user.userId,
          name: user.name || sanitizedUsername,
          twitter_username: sanitizedUsername
        },
        icp: existingProperties, // Inflated structure ready for UI
        fromCache: true
      })
    } else {
      logger.log('ℹ️ User exists but no ICP found in Neo4j')
    }

    // Create comprehensive ICP analysis
    logger.log('🤖 Starting Grok ICP analysis...')
    logger.log('  → Using classification:', classification ? {
      orgType: classification.orgType,
      orgSubtype: classification.orgSubtype,
      web3Focus: classification.web3Focus
    } : 'No classification (fallback to general schema)')

    const icpAnalysis = await createStructuredICPAnalysis(
      sanitizedUsername,
      ICPAnalysisConfig.FULL,
      classification ? {
        orgType: classification.orgType,
        orgSubtype: classification.orgSubtype,
        web3Focus: classification.web3Focus
      } : undefined
    )
    logger.log('✅ Grok analysis completed')

    // Update user with social insights (store in Neo4j properties)
    if (user.userId) {
      logger.log('🔄 Updating user with social insights...')
      const socialInsights = extractSocialInsights(icpAnalysis)
      if (Object.keys(socialInsights).length > 0) {
        await updateOrganizationProperties(user.userId, socialInsights)
        logger.log('✅ Social insights updated')
      }
    }

    // Convert to expected format and save
    logger.log('💾 Saving ICP analysis...')
    const detailedResponse = createDetailedResponse(icpAnalysis)
    
    // ICP analysis is now saved to Neo4j by createStructuredICPAnalysis
    logger.log('✅ ICP analysis saved to Neo4j via createStructuredICPAnalysis')

    // Process ICP relationships (competitors, investors, partners, auditors)
    logger.log('🔗 Processing ICP relationships...')
    try {
      await processICPRelationships(sanitizedUsername, {
        competitors: icpAnalysis.competitors as string[] | undefined,
        investors: icpAnalysis.investors as string[] | undefined,
        partners: icpAnalysis.partners as string[] | undefined,
        auditor: icpAnalysis.auditor as string[] | undefined
      })
      logger.log('✅ ICP relationships processed')
    } catch (relError: any) {
      logger.error('⚠️ Failed to process ICP relationships (non-fatal):', relError.message)
      // Don't fail the request - relationships are supplementary
    }

    // Fetch canonical ICP from Neo4j to ensure consistency
    logger.log('📊 Fetching canonical ICP from Neo4j...')
    const canonicalICP = await getOrganizationForUI(sanitizedUsername)

    logger.log('✅ Grok analysis complete - returning response')
    return NextResponse.json({
      success: true,
      organization: {
        id: user.userId,
        name: user.name || sanitizedUsername,
        twitter_username: sanitizedUsername
      },
      icp: canonicalICP,
      usage: undefined,
      fromCache: false
    })

  } catch (error: any) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    logger.error('❌ Grok analysis error:', error)
    // Log the error for monitoring
    logAPIError(error, 'Organization ICP Analysis', '/api/grok-analyze-org', undefined)

    // Determine specific error message
    let errorMessage = 'Failed to analyze organization ICP'
    if (error.message?.includes('API key')) {
      errorMessage = 'Grok API configuration error'
    } else if (error.message?.includes('JSON')) {
      errorMessage = 'Failed to parse Grok API response'
    } else if (error?.response?.status) {
      errorMessage = `Grok API error (${error.response.status}): ${error.response.statusText}`
    } else if (error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to Grok API'
    }
    
    return NextResponse.json({ 
      error: errorMessage,
      details: 'The analysis provider could not complete the request',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
