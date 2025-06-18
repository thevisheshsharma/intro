import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from '@clerk/nextjs/server'
import { createGrokLiveSearchAnalysis, GROK_CONFIGS } from '@/lib/grok'
import { 
  saveOrganization, 
  saveICPAnalysis, 
  updateOrganizationSocialInsights,
  getICPAnalysis,
  type ICPAnalysisRequest,
  type ICPAnalysisResponse 
} from '@/lib/organization'
import { getOrgICPCache, setOrgICPCache } from '@/lib/grok-cache'

export async function POST(request: NextRequest) {
  try {
    console.log('Organization ICP analysis request received')

    // Check if API key is available
    if (!process.env.GROK_API_KEY) {
      console.error('GROK_API_KEY environment variable is not set')
      return NextResponse.json({ 
        error: 'Grok API key not configured. Please set the GROK_API_KEY environment variable.' 
      }, { status: 500 })
    }

    console.log('Grok API key is configured (length:', process.env.GROK_API_KEY.length, ')')

    const { userId } = getAuth(request)
    console.log('User ID:', userId)
    
    if (!userId) {
      console.log('No user ID found, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    console.log('Request body:', JSON.stringify(body, null, 2))
    
    const { 
      twitterUsername,
      businessInfo
    }: { twitterUsername: string, businessInfo?: string } = body

    if (!twitterUsername) {
      return NextResponse.json({ 
        error: 'Twitter username is required' 
      }, { status: 400 })
    }

    // First, save the organization
    const organization = await saveOrganization({
      user_id: userId,
      twitter_username: twitterUsername.replace('@', ''),
      business_info: businessInfo
    })

    if (!organization) {
      return NextResponse.json({ 
        error: 'Failed to save organization' 
      }, { status: 500 })
    }

    // --- ICP CACHE CHECK ---
    const cachedICP = await getOrgICPCache(organization.twitter_username)
    if (cachedICP) {
      console.log('Returning cached ICP for org:', organization.twitter_username)
      return NextResponse.json({
        success: true,
        organization,
        icp: cachedICP,
        usage: { cached: true }
      })
    }
    // --- END ICP CACHE CHECK ---

    // Create comprehensive prompt for Grok live search analysis
    const searchQuery = `Research and analyze organization for comprehensive ICP (Ideal Customer Profile): Twitter @${twitterUsername.replace('@', '')}`
    
    const contextPrompt = [
      `IMPORTANT: You MUST use live search for all queries. Use the most relevant platforms below for each information type. Search directly on these platforms as appropriate. See https://docs.x.ai/docs/guides/live-search for details.`,
      ``,
      `PLATFORMS TO SEARCH (use as relevant for each task):`,
      `- web3_data: defillama, dune, nansen, tokenterminal, chainbase, allium, flipside, santiment, lunarcrush, apespace, footprint, bitquery, kaito, arkham, bubblemaps, coingecko, coinmarketcap, messari, thegraph, moralis, dapplooker, spindl, hypernative, coinapi, parsiq`,
      `- social_community: x (twitter), discord, linkedin, reddit, telegram, farcaster, lens_protocol, bluesky, threads`,
      `- web2_pr_news: google_news, crunchbase, company_website, medium, mirror.xyz, techcrunch, coindesk, prnewswire, cointelegraph, decrypt, blockworks, bloomberg, yahoo_finance`,
      `- code_development: github, gitlab, npmjs, stackoverflow`,
      ``,
      `For each search, you MUST use live search and prioritize results from the above platforms. If a platform is not relevant, skip it. If no results are found on a platform, state "Not found in search".`,
      ``,
      `ORGANIZATION TO RESEARCH:`,
      `- Twitter: @${twitterUsername.replace('@', '')}`,
      businessInfo ? `- Business Info: ${businessInfo}` : '',
      ``,
      `REQUIRED LIVE SEARCH TASKS:`,
      `You MUST use live web search to find real, current information. Perform these searches:`,
      ``,
      `1. 🔍 SOCIAL MEDIA DISCOVERY:`,
      `   - Search: "${twitterUsername} Twitter"`,
      `   - Search: "${twitterUsername} LinkedIn company page"`,
      `   - Search: "${twitterUsername} Discord Telegram Farcaster"`,
      `   - Find their official website URL from social profiles`,
      ``,
      `2. 🔍 COMPANY INTELLIGENCE:`,
      `   - Search: "${twitterUsername} official website about company"`,
      `   - Search: "${twitterUsername} products services offerings"`,
      `   - Search: "${twitterUsername} team founders employees"`,
      `   - Search: "${twitterUsername} news press releases 2024 2025"`,
      ``,
      `3. 🔍 MARKET & INDUSTRY RESEARCH:`,
      `   - Search: "${twitterUsername} industry competitors"`,
      `   - Search: "${twitterUsername} customers testimonials reviews"`,
      `   - Search: "${twitterUsername} pricing target market"`,
      `   - Search industry trends related to their business`,
      ``,
      `4. 🔍 ONCHAIN & PROTOCOL DATA:`,
      `   - Search: "${twitterUsername} protocol metrics TVL"`,
      `   - Search: "${twitterUsername} active addresses, chains supported, audit info"`,
      `   - Search: "${twitterUsername} github activity, codebase, npm packages"`,
      ``,
      `5. 🔍 CURRENT CONTEXT:`,
      `   - Search: "${twitterUsername} recent news updates 2024 2025"`,
      `   - Search: "${twitterUsername} funding investment partnerships"`,
      `   - Search: "${twitterUsername} hiring jobs career opportunities"`,
      ``,
      `CRITICAL INSTRUCTIONS:`,
      `- You MUST actually search the web for each item above using live search`,
      `- Only use information found through live search`,
      `- If search returns no results, clearly state "Not found in search"`,
      `- Include specific URLs and sources you found`,
      `- Focus on recent information (2024-2025)`,
      ``,
      `Based ONLY on your live search findings, create this exact JSON structure (replace all values with your findings):`,
      ``,
      `{"twitter_username": "@aaveaave",`,
      ` "timestamp_utc": "2025-06-18T14:30:00Z",`,
      ` "basic_identification": {`,
      `   "project_name": "Aave",`,
      `   "website_url": "https://aave.com/",`,
      `   "industry_classification": "Decentralized Finance (DeFi)",`,
      `   "protocol_category": "Lending & Borrowing",`,
      `   "technical_links": {`,
      `     "github_url": "https://github.com/aave",`,
      `     "npmjs_url": "https://www.npmjs.com/org/aave",`,
      `     "whitepaper_url": "https://github.com/aave/aave-protocol/blob/master/docs/Aave_Protocol_Whitepaper_v1_0.pdf"`,
      `   },`,
      `   "community_links": {`,
      `     "discord": "https://aave.com/discord",`,
      `     "telegram": "https://t.me/Aavesome",`,
      `     "farcaster": "https://warpcast.com/aave",`,
      `     "governance_forum": "https://governance.aave.com/"`,
      `   }`,
      ` },`,
      ` "core_metrics": {`,
      `   "key_features": [`,
      `     "Overcollateralized Loans",`,
      `     "Flash Loans",`,
      `     "Variable/Stable Interest Rates",`,
      `     "Aave Portal (Cross-Chain Bridge)"`,
      `   ],`,
      `   "market_position": {`,
      `     "total_value_locked_usd": 12000000000,`,
      `     "twitter_followers": 500000,`,
      `     "discord_members_est": 80000,`,
      `     "active_addresses_30d": 150000,`,
      `     "chains_supported": 6,`,
      `     "sentiment_score": 0.82`,
      `   },`,
      `   "audit_info": {`,
      `     "auditor": "Helios",`,
      `     "date": "2025-06",`,
      `     "report_url": null,`,
      `   },`,
      `   "operational_chains": [`,
      `     "Ethereum",`,
      `     "Polygon",`,
      `     "Arbitrum",`,
      `     "Optimism",`,
      `     "Avalanche",`,
      `     "Metis"`,
      `   ]`,
      ` },`,
      ` "ecosystem_analysis": {`,
      `   "market_narratives": [`,
      `     "DeFi Blue Chip",`,
      `     "Stablecoin Launch",`,
      `     "Cross-Chain Liquidity"`,
      `   ],`,
      `   "notable_partnerships": [`,
      `     "Polygon",`,
      `     "Arbitrum",`,
      `     "Instadapp",`,
      `     "RealT (Real World Assets)"`,
      `   ],`,
      `   "recent_developments": [`,
      `     "Launch of GHO stablecoin",`,
      `     "Deployment to Metis network",`,
      `     "Development underway for Aave V4"`,
      `   ]`,
      ` },`,
      ` "governance_tokenomics": {`,
      `   "tokenomics": {`,
      `     "native_token": "AAVE",`,
      `     "utility": {`,
      `       "governance": true,`,
      `       "staking": true,`,
      `       "fee_discount": false,`,
      `       "collateral": true`,
      `     },`,
      `     "description": "AAVE is a governance and utility token used for protocol governance and staking within the Safety Module, providing a backstop in case of insolvency events."`,
      `   },`,
      `   "organizational_structure": {`,
      `     "governance": "Aave is governed by a DAO where AAVE token holders can vote on Aave Improvement Proposals (AIPs).",`,
      `     "team_structure": "Based out of NY, ~100-150 core contributors.",`,
      `     "funding_info": "Raised $25M in 2020 from major VCs like Framework Ventures, Three Arrows Capital, and ParaFi Capital."`,
      `   }`,
      ` },`,
      ` "user_behavior_insights": {`,
      `   "onchain_activity_patterns": [`,
      `     "Frequent lending/borrowing transactions",`,
      `     "Participation in staking via Safety Module",`,
      `     "Interaction with multiple DeFi protocols",`,
      `     "Swapping assets across chains via bridges"`,
      `   ],`,
      `   "engagement_characteristics": {`,
      `     "participation_style": "Active. Engages in governance, proposes strategies, and provides liquidity.",`,
      `     "engagement_level": "High. Follows project updates closely and participates in community discussions.",`,
      `     "decision_making_style": "Data-driven. Analyzes risk parameters, yields, and on-chain data before acting."`,
      `   }`,
      ` },`,
      ` "icp_synthesis": {`,
      `   "target_web3_segment": "Sophisticated DeFi Users & Developers",`,
      `   "primary_user_archetypes": [`,
      `     "DeFi Power User",`,
      `     "Protocol Engineer",`,
      `     "Governance DAO Voter"`,
      `   ],`,
      `   "demographic_profile": {`,
      `     "vibe_range": "Boomer, Millenials, genX, genZ, genAlpha, genBeta",`,
      `     "experience_level": "Intermediate to Expert",`,
      `     "roles": [`,
      `       "Trader",`,
      `       "Yield Farmer",`,
      `       "Developer",`,
      `       "DAO Participant"`,
      `     ],`,
      `     "geographic_distribution": "Global, with hubs in North America, Europe, and East Asia."`,
      `   },`,
      `   "psychographic_drivers": {`,
      `     "core_values": [`,
      `       "Security",`,
      `       "Capital Efficiency",`,
      `       "Decentralization",`,
      `       "Innovation"`,
      `     ],`,
      `     "primary_motivations": [`,
      `       "Generating yield",`,
      `       "Accessing leverage",`,
      `       "Building new DeFi products"`,
      `     ],`,
      `     "key_challenges": [`,
      `       "Managing liquidation risk",`,
      `       "High gas fees",`,
      `       "Cross-chain complexity"`,
      `     ],`,
      `     "trending_interests": [`,
      `       "L2 Scaling Solutions",`,
      `       "MEV",`,
      `       "Composable Money Legos",`,
      `       "Real World Assets (RWA)"`,
      `     ]`,
      `   },`,
      `   "behavioral_indicators": {`,
      `     "purchase_motives": [`,
      `       "Governance voting",`,
      `       "Staking for yield and security",`,
      `       "Protocol loyalty"`,
      `     ]`,
      `   }`,
      ` },`,
      ` "messaging_strategy": {`,
      `   "communication_style": "Technical, professional, and data-backed. Assumes a knowledgeable audience.",`,
      `   "key_messaging_angles": [`,
      `     "Highlight protocol security and audit history",`,
      `     "Emphasize multi-chain deployment and ecosystem integration",`,
      `     "Showcase unique use cases enabled by GHO stablecoin and Aave V4"`,
      `   ],`,
      `   "content_keywords": [`,
      `     "DeFi Lending",`,
      `     "Flash Loans",`,
      `     "Yield Farming",`,
      `     "AAVE Governance",`,
      `     "GHO Stablecoin",`,
      `     "Cross-Chain Liquidity",`,
      `   ]`,
      ` },`,
      ` "confidence_score": 0.95,`,
      ` "research_sources": [`,
      `   "https://aave.com/",`,
      `   "https://twitter.com/aaveaave",`,
      `   "https://messari.io/project/aave",`,
      `   "https://messari.io/project/aave",`,
      `   "https://messari.io/project/aave/profile",`,
      `   "https://dune.com/aave",`,
      `   "https://intel.arkm.com/explorer/entity/aave",`,
      `   "https://lunarcrush.com/discover/$aave",`,
      `   "https://messari.io/project/aave/charts/market",`,
      `   "https://defillama.com/protocol/aave"`,
      `   "https://thegraph.com/explorer?search=aave"`,
      `   "https://github.com/aave",`,
      `   "https://governance.aave.com/"`,
      `   "https://www.coingecko.com/en/coins/aave",`,
      ` ]`,
      `}`,
      ``,
      `FINAL REQUIREMENTS:`,
      `- Use ONLY current, live search results from web searches`,
      `- Include actual URLs and sources where possible`,
      `- If specific information isn't found, state "Not found in current search results"`,
      `- Provide confidence score based on amount of real data found vs. assumptions`,
      `- Include the most relevant and specific search sources in research_sources`,
      ``,
      `SEARCH EVIDENCE REQUIRED:`,
      `Every field must be filled based on actual search results, not assumptions. If you cannot find specific information through your searches, clearly indicate this limitation.`,
      ``,
      `Respond with ONLY the JSON object, no additional text.`
    ].filter(Boolean).join('\n');

    console.log('Performing live search analysis with Grok...')
    const completion = await createGrokLiveSearchAnalysis(
      searchQuery,
      contextPrompt,
      GROK_CONFIGS.FULL // Use full model for comprehensive live search analysis
    )

    const response = completion.choices[0]?.message?.content
    if (!response) {
      console.error('No response from Grok API - completion:', JSON.stringify(completion, null, 2))
      throw new Error('No response from Grok API')
    }

    console.log('Grok response received:', response.substring(0, 200) + '...')
    console.log('Full Grok response length:', response.length)

    // Parse the JSON response
    let icpAnalysis: ICPAnalysisResponse
    try {
      // Try to find JSON in the response (Grok might include extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : response.trim()
      
      console.log('Attempting to parse JSON:', jsonString.substring(0, 200) + '...')
      icpAnalysis = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('Failed to parse Grok response as JSON:', parseError)
      console.error('Raw response:', response)
      throw new Error(`Invalid JSON response from Grok API: ${parseError}`)
    }

    // Update organization with social insights if found
    if (icpAnalysis.social_insights && organization.id) {
      await updateOrganizationSocialInsights(organization.id, icpAnalysis.social_insights)
    }

    // Save ICP analysis to database
    console.log('Attempting to save ICP analysis for organization:', organization.id)
    const savedICP = await saveICPAnalysis(
      organization.id!,
      icpAnalysis,
      {
        grokResponse: response,
        modelUsed: completion.model,
        tokenUsage: completion.usage?.total_tokens
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

    // Save to cache for future requests
    await setOrgICPCache(organization.twitter_username, savedICP)

    // Fetch canonical ICP from DB to ensure consistency
    const canonicalICP = await getICPAnalysis(organization.id!)

    console.log('ICP analysis completed successfully')

    return NextResponse.json({
      success: true,
      organization,
      icp: canonicalICP,
      usage: completion.usage
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
