import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createStructuredICPAnalysis, GROK_CONFIGS } from '@/lib/grok'
import { 
  saveOrganization, 
  saveICPAnalysis,
  saveEnhancedICPAnalysis,
  updateOrganizationSocialInsights,
  getICPAnalysis,
  type DetailedICPAnalysisResponse 
} from '@/lib/organization'

export async function POST(request: NextRequest) {
  try {
    // Check if API key is available
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set')
      return NextResponse.json({ 
        error: 'Grok API key not configured. Please set the GROK_API_KEY environment variable.' 
      }, { status: 500 })
    }

    const { userId } = getAuth(request)
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { 
      twitterUsername
    }: { twitterUsername: string } = body

    if (!twitterUsername) {
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }

    // First, save the organization
    const organization = await saveOrganization({
      user_id: userId,
      twitter_username: twitterUsername.replace('@', '')
    })

    if (!organization) {
      return NextResponse.json({ 
        error: 'Failed to save organization' 
      }, { status: 500 })
    }

    // Create comprehensive prompt for Grok live search analysis
    const icpAnalysis = await createStructuredICPAnalysis(
      twitterUsername.replace('@', ''),
      GROK_CONFIGS.FULL // Use full model for comprehensive analysis
    )

    // Update organization with social insights if found
    if (organization.id) {
      // Extract social insights from the structured response
      let socialInsights: any = {}
      
      if (icpAnalysis.basic_identification) {
        socialInsights = {
          website_url: icpAnalysis.basic_identification.website_url,
          industry_classification: icpAnalysis.basic_identification.industry_classification,
          estimated_company_size: icpAnalysis.governance_tokenomics?.organizational_structure?.team_structure,
          recent_developments: icpAnalysis.ecosystem_analysis?.recent_developments?.join('; '),
          key_partnerships: icpAnalysis.ecosystem_analysis?.notable_partnerships || [],
          funding_info: icpAnalysis.governance_tokenomics?.organizational_structure?.funding_info
        }
      }
      
      if (Object.keys(socialInsights).length > 0) {
        await updateOrganizationSocialInsights(organization.id, socialInsights)
      }
    }

    // Save ICP analysis to database
    console.log('Attempting to save enhanced ICP analysis for organization:', organization.id)
    
    // Convert structured output to expected format
    const detailedResponse: DetailedICPAnalysisResponse = {
      twitter_username: icpAnalysis.twitter_username,
      timestamp_utc: icpAnalysis.timestamp_utc,
      basic_identification: {
        project_name: icpAnalysis.basic_identification.project_name,
        website_url: icpAnalysis.basic_identification.website_url || '',
        industry_classification: icpAnalysis.basic_identification.industry_classification,
        protocol_category: icpAnalysis.basic_identification.protocol_category || '',
        technical_links: {
          github_url: icpAnalysis.basic_identification.technical_links.github_url || undefined,
          npmjs_url: icpAnalysis.basic_identification.technical_links.npmjs_url || undefined,
          whitepaper_url: icpAnalysis.basic_identification.technical_links.whitepaper_url || undefined
        },
        community_links: {
          discord: icpAnalysis.basic_identification.community_links.discord || undefined,
          telegram: icpAnalysis.basic_identification.community_links.telegram || undefined,
          farcaster: icpAnalysis.basic_identification.community_links.farcaster || undefined,
          governance_forum: icpAnalysis.basic_identification.community_links.governance_forum || undefined
        }
      },
      core_metrics: {
        key_features: icpAnalysis.core_metrics.key_features,
        market_position: {
          total_value_locked_usd: icpAnalysis.core_metrics.market_position.total_value_locked_usd || undefined,
          twitter_followers: icpAnalysis.core_metrics.market_position.twitter_followers || undefined,
          discord_members_est: icpAnalysis.core_metrics.market_position.discord_members_est || undefined,
          active_addresses_30d: icpAnalysis.core_metrics.market_position.active_addresses_30d || undefined,
          chains_supported: icpAnalysis.core_metrics.market_position.chains_supported || undefined,
          sentiment_score: icpAnalysis.core_metrics.market_position.sentiment_score || undefined
        },
        audit_info: {
          auditor: icpAnalysis.core_metrics.audit_info.auditor || undefined,
          date: icpAnalysis.core_metrics.audit_info.date || undefined,
          report_url: icpAnalysis.core_metrics.audit_info.report_url || undefined
        },
        operational_chains: icpAnalysis.core_metrics.operational_chains
      },
      ecosystem_analysis: icpAnalysis.ecosystem_analysis,
      governance_tokenomics: {
        tokenomics: icpAnalysis.governance_tokenomics.tokenomics ? {
          native_token: icpAnalysis.governance_tokenomics.tokenomics.native_token || '',
          utility: icpAnalysis.governance_tokenomics.tokenomics.utility,
          description: icpAnalysis.governance_tokenomics.tokenomics.description
        } : {
          native_token: '',
          utility: { governance: false, staking: false, fee_discount: false, collateral: false },
          description: ''
        },
        organizational_structure: {
          governance: icpAnalysis.governance_tokenomics.organizational_structure.governance,
          team_structure: icpAnalysis.governance_tokenomics.organizational_structure.team_structure,
          funding_info: icpAnalysis.governance_tokenomics.organizational_structure.funding_info || ''
        }
      },
      user_behavior_insights: icpAnalysis.user_behavior_insights,
      icp_synthesis: icpAnalysis.icp_synthesis,
      messaging_strategy: icpAnalysis.messaging_strategy,
      confidence_score: icpAnalysis.confidence_score,
      research_sources: icpAnalysis.research_sources
    }
    
    const savedICP = await saveEnhancedICPAnalysis(
      organization.id!,
      detailedResponse,
      {
        grokResponse: JSON.stringify(icpAnalysis),
        modelUsed: 'grok-3', // Default model used for structured outputs
        tokenUsage: undefined // Token usage not available in structured format
      }
    )

    if (!savedICP) {
      console.error('Failed to save ICP analysis - savedICP is null')
      console.error('Organization ID:', organization.id)
      console.error('ICP Analysis keys:', Object.keys(icpAnalysis))
      return NextResponse.json({ 
        error: 'Failed to save ICP analysis - database operation returned null' 
      }, { status: 500 })
    }

    // Fetch canonical ICP from DB to ensure consistency
    const canonicalICP = await getICPAnalysis(organization.id!)

    console.log('ICP analysis completed successfully')

    return NextResponse.json({
      success: true,
      organization,
      icp: canonicalICP,
      usage: undefined // Token usage not available in structured output
    })

  } catch (error: any) {
    console.error('Error in organization ICP analysis:', error)
    console.error('Error stack:', error.stack)
    
    // Provide more specific error messages
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
