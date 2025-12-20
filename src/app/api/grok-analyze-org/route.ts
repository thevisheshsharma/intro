import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createStructuredICPAnalysis, ICPAnalysisConfig } from '@/lib/grok'
import { logAPIError, logExternalServiceError } from '@/lib/error-utils'
import { getOrganizationProperties, getOrganizationForUI, getUserByScreenName, updateOrganizationProperties, ensureUserExists, processICPRelationships } from '@/services'
import { 
  classifyOrganization, 
  fetchTwitterProfile,
  saveClassificationToNeo4j,
  type ClassificationResult 
} from '@/lib/classifier'

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

    // Step 1: Ensure organization user exists (prevents duplicates)
    console.log('🔍 Step 1: Ensuring organization user exists...')
    const user = await ensureUserExists(sanitizedUsername, sanitizedUsername)
    console.log('✅ Organization user ready:', user.userId)

    // Step 2: Classification Pipeline with existing user coordination
    console.log('🔍 Step 2: Starting organization classification pipeline...')
    let classification: ClassificationResult | undefined; // Declare classification variable
    
    try {
      // Fetch Twitter profile data
      console.log('  → Fetching Twitter profile...')
      const profileData = await fetchTwitterProfile(sanitizedUsername)
      console.log('  → ✅ Twitter profile fetched')
      
      // Run classification with existing user ID to prevent duplicate creation
      console.log('  → Running classification analysis...')
      classification = await classifyOrganization(sanitizedUsername, profileData, user.userId)
      console.log('  → ✅ Classification complete:', classification)
      
      // Handle different classification results
      if (classification.vibe === 'individual') {
        console.log('  → ❌ Account classified as individual')
        return NextResponse.json({
          error: 'This appears to be an individual account. ICP analysis is designed for organizations.',
          classification,
          suggestion: 'Try using our individual profile analysis tools instead.'
        }, { status: 400 })
      }
      
      if (classification.vibe === 'spam') {
        console.log('  → ❌ Account classified as spam')
        return NextResponse.json({
          error: 'This account appears to be a spam account.',
          classification,
          suggestion: 'Please verify the account and try again.'
        }, { status: 400 })
      }
      
      if (classification.web3_focus === 'traditional') {
        console.log('  → ❌ Organization is not Web3 focused')
        return NextResponse.json({
          error: 'This organization does not appear to be Web3/crypto focused.',
          classification,
          suggestion: 'ICP analysis is currently designed for Web3 organizations.'
        }, { status: 400 })
      }
      
      // Proceed with Web3 organization analysis
      console.log('  → ✅ Valid Web3 organization detected, proceeding with ICP analysis')
      console.log(`  → Organization type: ${classification.org_type || 'general'}`)
      console.log(`  → Organization subtype: ${classification.org_subtype || 'general'}`)
      
    } catch (classificationError: any) {
      console.error('❌ Classification error:', classificationError)
      // For now, continue with analysis if classification fails
      console.log('⚠️ Classification failed, continuing with traditional analysis...')
      classification = undefined; // Ensure undefined for fallback schema
    }

    // Step 3: Check for existing ICP analysis (using coordinated user)
    console.log('🔍 Step 3: Checking for existing ICP analysis...')
    const existingProperties = await getOrganizationForUI(sanitizedUsername)
    
    if (existingProperties?.icp_synthesis) {
      console.log('✅ Existing ICP found in Neo4j, returning from cache')
      
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
      console.log('ℹ️ User exists but no ICP found in Neo4j')
    }

    // Create comprehensive ICP analysis
    console.log('🤖 Starting Grok ICP analysis...')
    console.log('  → Using classification:', classification ? {
      org_type: classification.org_type,
      org_subtype: classification.org_subtype,
      web3_focus: classification.web3_focus
    } : 'No classification (fallback to general schema)')
    
    const icpAnalysis = await createStructuredICPAnalysis(
      sanitizedUsername,
      ICPAnalysisConfig.FULL,
      classification ? {
        org_type: classification.org_type,
        org_subtype: classification.org_subtype,
        web3_focus: classification.web3_focus
      } : undefined
    )
    console.log('✅ Grok analysis completed')

    // Update user with social insights (store in Neo4j properties)
    if (user.userId) {
      console.log('🔄 Updating user with social insights...')
      const socialInsights = extractSocialInsights(icpAnalysis)
      if (Object.keys(socialInsights).length > 0) {
        await updateOrganizationProperties(user.userId, socialInsights)
        console.log('✅ Social insights updated')
      }
    }

    // Convert to expected format and save
    console.log('💾 Saving ICP analysis...')
    const detailedResponse = createDetailedResponse(icpAnalysis)
    
    // ICP analysis is now saved to Neo4j by createStructuredICPAnalysis
    console.log('✅ ICP analysis saved to Neo4j via createStructuredICPAnalysis')

    // Process ICP relationships (competitors, investors, partners, auditors)
    console.log('🔗 Processing ICP relationships...')
    try {
      await processICPRelationships(sanitizedUsername, {
        competitors: icpAnalysis.competitors as string[] | undefined,
        investors: icpAnalysis.investors as string[] | undefined,
        partners: icpAnalysis.partners as string[] | undefined,
        auditor: icpAnalysis.auditor as string[] | undefined
      })
      console.log('✅ ICP relationships processed')
    } catch (relError: any) {
      console.error('⚠️ Failed to process ICP relationships (non-fatal):', relError.message)
      // Don't fail the request - relationships are supplementary
    }

    // Fetch canonical ICP from Neo4j to ensure consistency
    console.log('📊 Fetching canonical ICP from Neo4j...')
    const canonicalICP = await getOrganizationForUI(sanitizedUsername)

    console.log('✅ Grok analysis complete - returning response')
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
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
