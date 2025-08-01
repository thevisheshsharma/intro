import { runQuery } from '@/lib/neo4j'
import { createGrokChatCompletion, GROK_CONFIGS } from '@/lib/grok'
import { getUserByScreenName, transformToNeo4jUser, createOrUpdateUser } from '@/lib/neo4j/services/user-service'

// Type definitions for classification system
export interface ClassificationResult {
  vibe: 'individual' | 'organization' | 'spam' | string
  individual_role?: string
  org_type?: 'protocol' | 'investment' | 'business' | 'community'
  org_subtype?: string
  web3_focus?: 'native' | 'adjacent' | 'traditional'
  last_updated: string
}

export interface TwitterProfile {
  screen_name: string
  name: string
  description?: string
  location?: string
  url?: string
  followers_count?: number
  friends_count?: number
  verified?: boolean
  verification_info?: {
    type?: string
    reason?: string
  }
  profile_image_url_https?: string
  id_str: string
  id: string
}

/**
 * Fetch Twitter profile data from SocialAPI
 */
export async function fetchTwitterProfile(username: string): Promise<TwitterProfile> {
  if (!process.env.SOCIALAPI_BEARER_TOKEN) {
    throw new Error('SOCIALAPI_BEARER_TOKEN not configured')
  }

  const normalizedUsername = username.replace('@', '').toLowerCase()
  
  const response = await fetch(`https://api.socialapi.me/twitter/user/${normalizedUsername}`, {
    headers: {
      'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
      'Accept': 'application/json',
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Twitter profile: ${response.statusText}`)
  }

  const data = await response.json()
  
  if (!data.id) {
    throw new Error('Twitter user not found')
  }

  return {
    screen_name: data.screen_name,
    name: data.name,
    description: data.description,
    location: data.location,
    url: data.url,
    followers_count: data.followers_count,
    friends_count: data.friends_count,
    verified: data.verified,
    verification_info: data.verification_info,
    profile_image_url_https: data.profile_image_url_https,
    id_str: data.id_str || data.id,
    id: data.id
  }
}

/**
 * Check if a Twitter profile is a spam account
 * Reused from find-from-org feature
 */
export function isSpamAccount(profile: TwitterProfile): boolean {
  const followers = profile.followers_count || 0
  const following = profile.friends_count || 0
  return followers < 10 && following < 10
}

/**
 * Check if a Twitter profile is a business verified account
 * Reused from find-from-org feature
 */
export function isBusinessVerified(profile: TwitterProfile): boolean {
  return profile.verification_info?.type === 'Business'
}

/**
 * Check if a Twitter profile is a regional or support account
 * Reused from find-from-org feature
 */
export function isRegionalOrSupportAccount(profile: TwitterProfile): boolean {
  const name = (profile.name || '').toLowerCase()
  const screenName = (profile.screen_name || '').toLowerCase()
  
  // Regional indicators
  const regionalIndicators = [
    // Countries - with strict matching to avoid false positives
    'india', 'china', 'japan', 'korea', 'singapore', 'thailand', 'vietnam', 'indonesia', 'malaysia', 'philippines',
    'america', 'canada', 'mexico', 'brazil', 'argentina', 'chile', 'colombia', 'peru',
    'france', 'germany', 'italy', 'spain', 'netherlands', 'poland', 'russia', 'turkey', 'israel',
    'australia', 'newzealand', 'southafrica', 'nigeria', 'kenya', 'egypt',
    
    // Regions
    'apac', 'emea', 'sea', 'latam', 'americas', 'europe', 'asia', 'africa', 'oceania',
    'northamerica', 'southamerica', 'middleeast', 'southeastasia', 'eastasia',
    'pacific', 'mena', 'dach', 'benelux', 'nordics', 'baltics'
  ]
  
  // Functional department indicators
  const functionalIndicators = [
    'support', 'help', 'care', 'service', 'customer', 'assistance',
    'news', 'updates', 'announcements',
    'status', 'careers', 'hiring', 'recruitment', 'hr', 'talent',
    'developer', 'engineering', 'docs', 'documentation',
    'marketing', 'sales', 'business', 'partnerships', 'partner',
    'security', 'compliance', 'legal', 'policy',
    'community', 'social', 'events', 'meetup'
  ]

  // Check regional indicators with strict matching for sensitive terms
  const hasRegionalIndicator = regionalIndicators.some(indicator => {
    if (['india', 'china', 'japan', 'korea', 'america'].includes(indicator)) {
      // Must be a standalone word, or with clear organizational separators
      const strictRegex = new RegExp(`(^|[\\s\\-_]|\\b)${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|[\\s\\-_]|$)`, 'i')
      return strictRegex.test(name) || strictRegex.test(screenName)
    } else {
      // For other regional terms, use normal word boundary
      const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      return regex.test(name) || regex.test(screenName)
    }
  })
  
  // Check functional indicators with word boundaries
  const hasFunctionalIndicator = functionalIndicators.some(indicator => {
    const regex = new RegExp(`\\b${indicator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    return regex.test(name) || regex.test(screenName)
  })
  
  return hasRegionalIndicator || hasFunctionalIndicator
}

/**
 * Convert TwitterProfile to TwitterApiUser format for Neo4j storage
 */
function convertToTwitterApiUser(profile: TwitterProfile): any {
  return {
    id: profile.id,
    id_str: profile.id_str,
    screen_name: profile.screen_name,
    name: profile.name,
    description: profile.description,
    location: profile.location,
    url: profile.url,
    profile_image_url_https: profile.profile_image_url_https,
    followers_count: profile.followers_count || 0,
    friends_count: profile.friends_count || 0,
    verified: profile.verified || false,
    verification_info: profile.verification_info
  }
}

/**
 * Save classification result to Neo4j
 */
export async function saveClassificationToNeo4j(
  twitterUsername: string, 
  profileData: TwitterProfile,
  classification: ClassificationResult
): Promise<void> {
  try {
    const apiUser = convertToTwitterApiUser(profileData)
    const neo4jUser = transformToNeo4jUser(apiUser, classification.vibe)
    
    // Store the base classification type and individual role separately
    if (classification.vibe === 'individual') {
      neo4jUser.vibe = 'individual'  // Always store as 'individual' for consistency
      if (classification.individual_role) {
        neo4jUser.individual_role = classification.individual_role  // Store role as proper property
      }
    } else if (classification.vibe === 'spam') {
      neo4jUser.vibe = 'spam'
    } else {
      neo4jUser.vibe = 'organization'
    }
    
    // Add organization-specific properties as proper fields
    if (classification.org_type) {
      (neo4jUser as any).org_type = classification.org_type
    }
    if (classification.org_subtype) {
      (neo4jUser as any).org_subtype = classification.org_subtype
    }
    if (classification.web3_focus) {
      (neo4jUser as any).web3_focus = classification.web3_focus
    }
    
    // Ensure lastUpdated is set to current timestamp
    neo4jUser.lastUpdated = new Date().toISOString()
    
    await createOrUpdateUser(neo4jUser)
    console.log(`  → ✅ Neo4j updated for @${twitterUsername}: ${classification.vibe}`)
  } catch (error) {
    console.error(`  → ❌ Neo4j save failed for @${twitterUsername}:`, error)
    throw error
  }
}

/**
 * Get cached classification from Neo4j
 */
export async function getCachedClassification(twitterUsername: string): Promise<ClassificationResult | null> {
  try {
    const user = await getUserByScreenName(twitterUsername)
    
    if (!user) return null
    
    // Check if classification is recent (within 30 days)
    const lastUpdated = new Date(user.lastUpdated || '1970-01-01')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    if (lastUpdated < thirtyDaysAgo) return null
    
    // Extract classification data
    const userVibe = user.vibe || 'organization'
    
    // Check for explicit individual classification
    if (userVibe === 'individual') {
      const result: ClassificationResult = {
        vibe: 'individual',
        last_updated: user.lastUpdated || new Date().toISOString()
      }
      
      // Get the individual role from separate field
      if ((user as any).individual_role) {
        result.individual_role = (user as any).individual_role
      }
      
      return result
    }
    
    // Handle spam
    if (userVibe === 'spam') {
      return {
        vibe: 'spam',
        last_updated: user.lastUpdated || new Date().toISOString()
      }
    }
    
    // Handle organization
    const result: ClassificationResult = {
      vibe: 'organization',
      last_updated: user.lastUpdated || new Date().toISOString()
    }
    
    if ((user as any).org_type) {
      result.org_type = (user as any).org_type
    }
    if ((user as any).org_subtype) {
      result.org_subtype = (user as any).org_subtype
    }
    if ((user as any).web3_focus) {
      result.web3_focus = (user as any).web3_focus
    }
    
    return result
  } catch (error) {
    console.error('Error getting cached classification:', error)
    return null
  }
}

/**
 * Comprehensive organization and Web3 classification using Grok
 */
export async function classifyWithGrok(profile: TwitterProfile): Promise<ClassificationResult> {
  const prompt = `
TASK: Classify Twitter profile
Profile: @${profile.screen_name} | ${profile.name} | ${profile.description || 'No bio'} | ${profile.url || 'No URL'}

STEPS:
1. ENTITY: Individual or organization?
2. IF INDIVIDUAL: Role? (developer/product/marketing/founder/trader/investor/creator/KOL/other)
3. IF ORGANIZATION: 
   • WEB3 FOCUS: native/adjacent/traditional
   • TYPE: protocol/investment/business/community
   • SUBTYPE: defi,gaming,social,infrastructure,nft,dao_tools,RWA,DePin,identity,privacy,interoperability,storage,oracles,governance,security,AI,payments,developer_tooling,layer2,content,metaverse,ReFi,insurance | vc,fund,investment_dao,accelerator,incubator,grants,family_office | agency,enterprise,marketplace,media,events,legal,consulting,security,analytics,development | dao,education,advocacy,standards,regional,support

JSON ONLY:
{
  "entity_type": "individual" | "organization",
  "individual_role": string | null,
  "org_type": string | null,
  "org_subtype": string | null,
  "web3_focus": string | null
}
`

  try {
    const completion = await createGrokChatCompletion(
      [{ role: 'user', content: prompt }],
      GROK_CONFIGS.MINI_FAST,
      { enableLiveSearch: false }
    )

    const content = completion.choices[0]?.message?.content
    if (!content) {
      throw new Error('No content returned from Grok')
    }

    // Parse JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in Grok response')
    }

    const analysis = JSON.parse(jsonMatch[0])
    
    // Convert to our ClassificationResult format
    const result: ClassificationResult = {
      vibe: analysis.entity_type === 'individual' ? 'individual' : 'organization',
      last_updated: new Date().toISOString()
    }

    if (analysis.entity_type === 'individual') {
      result.individual_role = analysis.individual_role || 'other'
    } else {
      result.org_type = analysis.org_type
      result.org_subtype = analysis.org_subtype
      result.web3_focus = analysis.web3_focus
    }

    return result

  } catch (error) {
    console.error('Grok classification error:', error)
    // Fallback classification
    return {
      vibe: 'organization', // Conservative fallback
      web3_focus: 'traditional',
      last_updated: new Date().toISOString()
    }
  }
}

/**
 * Main classification function that implements the complete pipeline
 */
export async function classifyOrganization(
  twitterUsername: string,
  profileData: TwitterProfile
): Promise<ClassificationResult> {
  const normalizedUsername = twitterUsername.replace('@', '').toLowerCase()
  
  console.log(`🔍 Starting classification for @${normalizedUsername}`)
  
  // Step 1: Check Neo4j cache
  console.log('  → Step 1: Checking Neo4j cache...')
  const cached = await getCachedClassification(normalizedUsername)
  if (cached) {
    // Check if cached data is complete - if organization lacks detailed classification, re-classify
    const isIncompleteOrganization = (
      cached.vibe === 'organization' && 
      (!cached.org_type || !cached.org_subtype || !cached.web3_focus)
    )
    
    if (isIncompleteOrganization) {
      console.log(`  → ⚠️ Found incomplete cached classification: ${cached.vibe} (missing org details)`)
      console.log('  → 🔄 Re-running classification to get complete data...')
    } else {
      console.log(`  → ✅ Found complete cached classification: ${cached.vibe}`)
      return cached
    }
  }
  
  let finalClassification: ClassificationResult
  
  // Step 2: Spam detection
  console.log('  → Step 2: Checking for spam...')
  if (isSpamAccount(profileData)) {
    console.log('  → ❌ Detected as spam account')
    finalClassification = {
      vibe: 'spam',
      last_updated: new Date().toISOString()
    }
  } else {
    // Step 3: Organization vs Individual & Web3 Classification (Combined Grok Call)
    console.log('  → Step 3: Comprehensive Grok classification...')
    const classification = await classifyWithGrok(profileData)
    
    // Additional validation checks for organizations
    if (classification.vibe === 'organization') {
      // Apply business verification check
      if (isBusinessVerified(profileData)) {
        console.log('  → ✅ Business verification confirmed')
      }
      
      // Apply regional/support account check
      if (isRegionalOrSupportAccount(profileData)) {
        console.log('  → ✅ Regional/support account pattern detected')
      }
      
      // Early exit for traditional organizations
      if (classification.web3_focus === 'traditional') {
        console.log('  → ❌ Traditional organization - not Web3 focused')
      }
    }
    
    finalClassification = classification
  }
  
  // Always save the final classification to Neo4j
  console.log('  → Saving classification to Neo4j...')
  try {
    await saveClassificationToNeo4j(normalizedUsername, profileData, finalClassification)
    console.log('  → ✅ Classification saved to Neo4j')
  } catch (saveError) {
    console.error('  → ❌ Failed to save classification to Neo4j:', saveError)
    // Don't fail the entire process if save fails
  }
  
  console.log(`  → ✅ Classification complete: ${finalClassification.vibe}`)
  return finalClassification
}
