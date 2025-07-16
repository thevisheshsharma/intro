import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createStructuredICPAnalysis, GROK_CONFIGS } from '@/lib/grok'
import { logAPIError, logExternalServiceError } from '@/lib/error-utils'
import { 
  saveOrganization, 
  saveICPAnalysis,
  updateOrganizationSocialInsights,
  getICPAnalysis,
  getOrganizationByTwitter,
  trackUserOrganizationAccess,
  DatabaseUtils,
  type DetailedICPAnalysisResponse 
} from '@/lib/organization'

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
function createDetailedResponse(icpAnalysis: any): DetailedICPAnalysisResponse {
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
    messaging_strategy: icpAnalysis.messaging_strategy,
    confidence_score: icpAnalysis.confidence_score,
    research_sources: icpAnalysis.research_sources
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.GROK_API_KEY) {
      console.log('❌ Grok API key not configured')
      return NextResponse.json({ 
        error: 'Grok API key not configured. Please set the GROK_API_KEY environment variable.' 
      }, { status: 500 })
    }

    const { userId } = getAuth(request)
    
    if (!userId) {
      console.log('❌ Unauthorized grok-analyze-org request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { twitterUsername }: { twitterUsername: string } = body

    console.log('🤖 Grok analysis request - twitterUsername:', twitterUsername, 'userId:', userId)

    if (!twitterUsername) {
      console.log('❌ No twitterUsername provided')
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }

    // Sanitize username once
    const sanitizedUsername = twitterUsername.replace('@', '').toLowerCase()
    console.log('🤖 Sanitized username:', sanitizedUsername)

    // Check if organization already exists with ICP
    console.log('🔍 Checking for existing organization and ICP...')
    let organization = await getOrganizationByTwitter(sanitizedUsername)
    
    if (organization?.id) {
      console.log('✅ Organization found:', organization)
      const existingICP = await getICPAnalysis(organization.id)
      
      if (existingICP) {
        console.log('✅ Existing ICP found, returning from cache')
        // Track user access
        await trackUserOrganizationAccess(userId, organization.id)
        
        // Return existing ICP analysis
        return NextResponse.json({
          success: true,
          organization,
          icp: existingICP,
          fromCache: true
        })
      } else {
        console.log('ℹ️ Organization exists but no ICP found')
      }
    } else {
      console.log('ℹ️ No organization found')
    }

    // No existing ICP, create new analysis
    if (!organization) {
      console.log('🆕 Creating new organization...')
      // Save the organization with created_by tracking
      organization = await saveOrganization({
        created_by_user_id: userId,
        twitter_username: sanitizedUsername
      })

      if (!organization) {
        console.log('❌ Failed to save organization')
        return NextResponse.json({ 
          error: 'Failed to save organization' 
        }, { status: 500 })
      }
      console.log('✅ New organization created:', organization)
    }

    // Track user access
    if (organization.id) {
      console.log('👤 Tracking user access...')
      await trackUserOrganizationAccess(userId, organization.id)
    }

    // Create comprehensive ICP analysis
    console.log('🤖 Starting Grok ICP analysis...')
    const icpAnalysis = await createStructuredICPAnalysis(
      sanitizedUsername,
      GROK_CONFIGS.FULL
    )
    console.log('✅ Grok analysis completed')

    // Update organization with social insights
    if (organization.id) {
      console.log('🔄 Updating organization with social insights...')
      const socialInsights = extractSocialInsights(icpAnalysis)
      if (Object.keys(socialInsights).length > 0) {
        await updateOrganizationSocialInsights(organization.id, socialInsights)
        console.log('✅ Social insights updated')
      }
    }

    // Convert to expected format and save
    console.log('💾 Saving ICP analysis...')
    const detailedResponse = createDetailedResponse(icpAnalysis)
    
    const savedICP = await saveICPAnalysis(
      organization.id!,
      detailedResponse,
      {
        grokResponse: JSON.stringify(icpAnalysis),
        modelUsed: 'grok-3',
        tokenUsage: undefined
      }
    )

    if (!savedICP) {
      console.log('❌ Failed to save ICP analysis')
      return NextResponse.json({ 
        error: 'Failed to save ICP analysis - database operation returned null' 
      }, { status: 500 })
    }

    console.log('✅ ICP analysis saved')

    // Fetch canonical ICP from DB to ensure consistency
    console.log('📊 Fetching canonical ICP from database...')
    const canonicalICP = await getICPAnalysis(organization.id!)

    console.log('✅ Grok analysis complete - returning response')
    return NextResponse.json({
      success: true,
      organization,
      icp: canonicalICP,
      usage: undefined,
      fromCache: false
    })

  } catch (error: any) {
    const { userId } = getAuth(request)
    
    console.error('❌ Grok analysis error:', error)
    // Log the error for monitoring
    logAPIError(error, 'Organization ICP Analysis', '/api/grok-analyze-org', userId || undefined)

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
      details: error.message || 'Unknown error',
      timestamp: DatabaseUtils.timestamp()
    }, { status: 500 })
  }
}
