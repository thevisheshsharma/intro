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
      `   - Search: "${twitterUsername} Facebook Instagram social media"`,
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
      `4. 🔍 CURRENT CONTEXT:`,
      `   - Search: "${twitterUsername} recent news updates 2024 2025"`,
      `   - Search: "${twitterUsername} funding investment partnerships"`,
      `   - Search: "${twitterUsername} hiring jobs career opportunities"`,
      ``,
      `CRITICAL INSTRUCTIONS:`,
      `- You MUST actually search the web for each item above`,
      `- Only use information found through live search`,
      `- If search returns no results, clearly state "Not found in search"`,
      `- Include specific URLs and sources you found`,
      `- Focus on recent information (2024-2025)`,
      ``,
      `Based ONLY on your live search findings, create this exact JSON structure:`,
      ``,
      `{`,
      `  "target_industry": "Industry found through company research - include source URL",`,
      `  "target_role": "Job titles/roles based on current customer analysis from search",`,
      `  "company_size": "Company size based on actual customer evidence found",`,
      `  "geographic_location": "Location based on search of current presence/customers",`,
      `  "pain_points": ["specific pain points found in reviews/testimonials", "from actual search results"],`,
      `  "keywords": ["actual keywords from their content", "found through search"],`,
      `  "demographics": {`,
      `    "age_range": "Based on actual customer profiles found in search",`,
      `    "education_level": "From customer testimonials/job postings found",`,
      `    "income_level": "Based on pricing research and customer analysis",`,
      `    "job_seniority": "From actual customer examples found"`,
      `  },`,
      `  "psychographics": {`,
      `    "values": ["values from actual content/messaging found"],`,
      `    "interests": ["from social media analysis"],`,
      `    "motivations": ["from marketing content found"],`,
      `    "challenges": ["from customer reviews/testimonials found"]`,
      `  },`,
      `  "behavioral_traits": {`,
      `    "preferred_channels": ["channels they actually use - from search"],`,
      `    "decision_making_style": "Based on sales/marketing approach found",`,
      `    "buying_behavior": "From pricing/sales process research",`,
      `    "communication_style": "From actual content analysis"`,
      `  },`,
      `  "confidence_score": 0.85,`,
      `  "analysis_summary": "Summary ONLY based on live search results - include key sources found",`,
      `  "social_insights": {`,
      `    "website_url": "ACTUAL website URL found through search",`,
      `    "additional_social_links": ["actual social profiles discovered"],`,
      `    "industry_classification": "Based on actual company research",`,
      `    "estimated_company_size": "From job postings/team pages found",`,
      `    "recent_developments": "Recent news/updates found in search",`,
      `    "key_partnerships": "Partnerships found through search",`,
      `    "funding_info": "Funding information if found in search"`,
      `  },`,
      `  "research_sources": {`,
      `    "twitter_analysis": "Specific insights from their actual Twitter profile",`,
      `    "website_insights": "Key findings from their actual website",`,
      `    "news_mentions": "Recent news coverage found",`,
      `    "competitor_insights": "Competitor analysis from search results",`,
      `    "search_confidence": "High/Medium/Low based on amount of real data found"`,
      `  }`,
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
