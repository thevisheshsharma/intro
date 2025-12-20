import { runQuery, getUserByScreenName, transformToNeo4jUser, createOrUpdateUserWithScreenNameMerge, processEmploymentData } from '@/services'
import { generateObject } from 'ai';
import { xai, GROK_MODELS } from './grok-client';
import { z } from 'zod';

// Type definitions for classification system
export interface ClassificationResult {
  screen_name: string;
  vibe: 'individual' | 'organization' | 'spam';
  current_organizations?: string[] | null;
  past_organizations?: string[];
  member_of?: string[];
  department?: 'engineering' | 'product' | 'marketing' | 'business' | 'operations' | 'research' | 'community' | 'leadership' | 'other';
  org_type?: 'defi' | 'gaming' | 'social' | 'protocol' | 'infrastructure' | 'exchange' | 'investment' | 'service' | 'community' | 'nft';
  org_subtype?: string[];
  web3_focus?: 'native' | 'adjacent' | 'traditional';
  last_updated: string;
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

export type UnifiedProfileInput = {
  screen_name: string;
  name: string;
  description?: string;
  id_str?: string;
  id?: string;
  url?: string;
  followers_count?: number;
  friends_count?: number;
  verified?: boolean;
  [key: string]: unknown;
};

// Zod schema for classification
const ClassificationSchema = z.object({
  results: z.array(z.object({
    screen_name: z.string(),
    vibe: z.enum(['individual', 'organization', 'spam']),
    current_organizations: z.array(z.string()).nullable().optional(),
    past_organizations: z.array(z.string()).nullable().optional(),
    member_of: z.array(z.string()).nullable().optional(),
    department: z.enum(['engineering', 'product', 'marketing', 'business', 'operations', 'research', 'community', 'leadership', 'other']).nullable().optional(),
    org_type: z.enum(['defi', 'gaming', 'social', 'protocol', 'infrastructure', 'exchange', 'investment', 'service', 'community', 'nft']).nullable().optional(),
    org_subtype: z.array(z.string()).nullable().optional(),
    web3_focus: z.enum(['native', 'adjacent', 'traditional']).nullable().optional()
  }))
});

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
 */
export function isSpamAccount(profile: TwitterProfile): boolean {
  const followers = profile.followers_count || 0
  const following = profile.friends_count || 0
  return followers < 10 && following < 10
}

/**
 * Check if a Twitter profile is a business verified account
 */
export function isBusinessVerified(profile: TwitterProfile): boolean {
  return profile.verification_info?.type === 'Business'
}

/**
 * Check if a Twitter profile is a regional or support account
 * Uses strict word boundary matching to avoid false positives
 */
export function isRegionalOrSupportAccount(profile: TwitterProfile): boolean {
  const name = (profile.name || '').toLowerCase()
  const screenName = (profile.screen_name || '').toLowerCase()

  // Regional indicators - require clear word boundaries
  const regionalIndicators = [
    'apac', 'emea', 'sea', 'latam', 'americas', 'europe', 'asia', 'africa', 'oceania',
    'northamerica', 'southamerica', 'middleeast', 'southeastasia', 'eastasia',
    'pacific', 'mena', 'dach', 'benelux', 'nordics', 'baltics'
  ]

  // Country names that need strict matching (common false positives)
  const strictCountryIndicators = [
    'india', 'china', 'japan', 'korea', 'america', 'france', 'germany', 'brazil'
  ]

  // Functional department indicators
  const functionalIndicators = [
    'support', 'help', 'care', 'service', 'customer', 'assistance',
    'news', 'updates', 'announcements',
    'status', 'careers', 'hiring', 'recruitment', 'hr', 'talent',
    'developer', 'docs', 'documentation',
    'security', 'compliance', 'legal', 'policy'
  ]

  // Check regional indicators with word boundaries
  const hasRegionalIndicator = regionalIndicators.some(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'i')
    return regex.test(name) || regex.test(screenName)
  })

  // Strict matching for country names - must have clear separator
  const hasStrictCountryIndicator = strictCountryIndicators.some(indicator => {
    // Must be preceded by separator (_, -, space, or start) and followed by separator or end
    const strictRegex = new RegExp(`(^|[_\\-\\s])${indicator}([_\\-\\s]|$)`, 'i')
    return strictRegex.test(name) || strictRegex.test(screenName)
  })

  // Check functional indicators
  const hasFunctionalIndicator = functionalIndicators.some(indicator => {
    const regex = new RegExp(`\\b${indicator}\\b`, 'i')
    return regex.test(name) || regex.test(screenName)
  })

  return hasRegionalIndicator || hasStrictCountryIndicator || hasFunctionalIndicator
}

/**
 * Classify profiles using Grok with xAI SDK
 */
export async function classifyProfilesWithGrok(
  input: UnifiedProfileInput | UnifiedProfileInput[]
): Promise<ClassificationResult | ClassificationResult[]> {
  const isArray = Array.isArray(input);
  const profiles = isArray ? input : [input];

  console.log(`🔍 Classifying ${profiles.length} profile${profiles.length === 1 ? '' : 's'} with xAI SDK`);

  const systemPrompt = `Classify Web3/crypto Twitter profiles.

STEP 1 - EXTRACT ALL @MENTIONS:
Scan the ENTIRE bio and list every @handle. Include ALL of them regardless of context.
Examples: "@org1 @org2" = [@org1, @org2], "Role @X | Title @Y" = [@X, @Y]

STEP 2 - CATEGORIZE EACH @MENTION:

current_organizations (DEFAULT for all @mentions):
• Any @mention WITHOUT explicit past indicators
• Consecutive @mentions: "@org1 @org2" = both current
• With roles: "CEO @org", "Head of X @org", "Ambassador @org"
• With verbs: building/cooking/working/vibing/yapping/shipping @org
• After sentence breaks: "past @old. @new" = @new is current

past_organizations (ONLY with explicit markers):
• "ex-@org", "ex @org", "formerly @org", "prev @org", "fka @org"
• "@org alum", "@org alumni", "was at @org", "left @org"
• "Past:" section, date ranges like "@org '19-'22"
• NOTE: "ex-baby @org" = past (the "ex-" marker applies)

member_of (non-work affiliations):
• Universities/schools: @USC, @UCSB, @NUSingapore, @stanford, etc.
• "cs @univ", "studied @univ", education context
• Investment: "invested in @org", "backed @org", "LP @org"
• NFT/community: "holder", "staker", "#1234 @collection"
• Explicit: "member of @org", "part of @org"

RULES:
1. Process EVERY @mention - do not skip any
2. Default = current (unless explicit past marker exists)
3. Universities/education → member_of
4. Case-insensitive matching, preserve original casing in output
5. Self-mentions (profile's own handle) → skip

vibe: individual | organization | spam
department: leadership|engineering|product|marketing|business|research|community|operations|other
org_type: defi|gaming|social|protocol|infrastructure|exchange|investment|service|community|nft
web3_focus: native|adjacent|traditional`;

  const userPrompt = `Classify these profiles:

${profiles.map(p => `@${p.screen_name}: ${p.description || 'No bio'}`).join('\n')}`;

  try {
    const result = await generateObject({
      model: xai(GROK_MODELS.CLASSIFICATION),
      schema: ClassificationSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
    });

    // Debug: Log raw Grok output
    console.log(`📤 Grok raw output:`, JSON.stringify(result.object, null, 2));

    const normalizedResults: ClassificationResult[] = result.object.results.map((r) => {
      const normalized: ClassificationResult = {
        screen_name: r.screen_name,
        vibe: r.vibe,
        last_updated: new Date().toISOString()
      };

      if (r.vibe === 'individual') {
        normalized.current_organizations = r.current_organizations || null;
        normalized.past_organizations = r.past_organizations || [];
        normalized.member_of = r.member_of || [];
        normalized.department = r.department || 'other';

        // Detailed per-profile logging for individuals
        console.log(`👤 @${r.screen_name} (${r.vibe}):`);
        console.log(`   └─ current: ${normalized.current_organizations?.length ? normalized.current_organizations.join(', ') : 'none'}`);
        console.log(`   └─ past: ${normalized.past_organizations?.length ? normalized.past_organizations.join(', ') : 'none'}`);
        console.log(`   └─ member_of: ${normalized.member_of?.length ? normalized.member_of.join(', ') : 'none'}`);
        console.log(`   └─ department: ${normalized.department}`);
      } else if (r.vibe === 'organization') {
        normalized.org_type = r.org_type || 'service';
        normalized.org_subtype = r.org_subtype || ['other'];
        normalized.web3_focus = r.web3_focus || 'traditional';

        // Detailed per-profile logging for organizations
        console.log(`🏢 @${r.screen_name} (${r.vibe}):`);
        console.log(`   └─ org_type: ${normalized.org_type}`);
        console.log(`   └─ web3_focus: ${normalized.web3_focus}`);
      } else {
        console.log(`🚫 @${r.screen_name} (${r.vibe})`);
      }

      return normalized;
    });

    console.log(`✅ Successfully classified ${normalizedResults.length} profiles`);
    return isArray ? normalizedResults : normalizedResults[0];

  } catch (error) {
    console.error(`❌ Classification failed:`, error);

    // Fallback classification based on bio analysis
    const fallbackResults: ClassificationResult[] = profiles.map(profile => {
      const description = (profile.description || '').toLowerCase();
      const isLikelyOrg = description.includes('protocol') ||
                         description.includes('platform') ||
                         description.includes('ecosystem') ||
                         description.includes('foundation') ||
                         description.includes('dao') ||
                         description.includes('fund') ||
                         description.includes('vc');

      if (isLikelyOrg) {
        return {
          screen_name: profile.screen_name,
          vibe: 'organization' as const,
          last_updated: new Date().toISOString(),
          org_type: 'service' as const,
          org_subtype: ['other'],
          web3_focus: 'traditional' as const
        };
      } else {
        return {
          screen_name: profile.screen_name,
          vibe: 'individual' as const,
          last_updated: new Date().toISOString(),
          current_organizations: null,
          department: 'other' as const,
          past_organizations: []
        };
      }
    });

    return isArray ? fallbackResults : fallbackResults[0];
  }
}

/**
 * Convert TwitterProfile to Neo4j user format
 */
function convertToTwitterApiUser(profile: TwitterProfile) {
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
 * Clean conflicting classification fields in Neo4j
 */
async function cleanConflictingFields(userId: string, vibe: string): Promise<void> {
  let cleanupQuery = ''

  if (vibe === 'individual') {
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.org_type, u.org_subtype, u.web3_focus
      RETURN u.userId as userId
    `
  } else if (vibe === 'organization') {
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.current_organizations, u.past_organizations, u.department
      RETURN u.userId as userId
    `
  } else if (vibe === 'spam') {
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.current_organizations, u.past_organizations, u.department,
             u.org_type, u.org_subtype, u.web3_focus
      RETURN u.userId as userId
    `
  }

  if (cleanupQuery) {
    await runQuery(cleanupQuery, { userId })
  }
}

/**
 * Save classification result to Neo4j
 */
export async function saveClassificationToNeo4j(
  twitterUsername: string,
  profileData: TwitterProfile,
  classification: ClassificationResult,
  existingUserId?: string
): Promise<string> {
  try {
    const apiUser = convertToTwitterApiUser(profileData)
    const neo4jUser = transformToNeo4jUser(apiUser, classification.vibe)

    if (existingUserId) {
      neo4jUser.userId = existingUserId
    } else {
      const existingUser = await getUserByScreenName(twitterUsername)
      if (existingUser) {
        neo4jUser.userId = existingUser.userId
      }
    }

    const userIdForCleanup = neo4jUser.userId || apiUser.id
    await cleanConflictingFields(userIdForCleanup, classification.vibe)

    if (classification.vibe === 'individual') {
      if (classification.current_organizations) {
        (neo4jUser as unknown as Record<string, unknown>).current_organizations = classification.current_organizations
      }
      if (classification.past_organizations) {
        (neo4jUser as unknown as Record<string, unknown>).past_organizations = classification.past_organizations
      }
      if (classification.member_of?.length) {
        (neo4jUser as unknown as Record<string, unknown>).member_of = classification.member_of
      }
      if (classification.department) {
        neo4jUser.department = classification.department
      }
    } else if (classification.vibe === 'organization') {
      neo4jUser.org_type = classification.org_type || 'service';
      neo4jUser.org_subtype = JSON.stringify(classification.org_subtype || ['other']);
      neo4jUser.web3_focus = classification.web3_focus || 'traditional';
    }

    neo4jUser.lastUpdated = new Date().toISOString()

    await createOrUpdateUserWithScreenNameMerge(neo4jUser)
    console.log(`  → ✅ Neo4j updated for @${twitterUsername}: ${classification.vibe}`)

    return neo4jUser.userId
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

    const lastUpdated = new Date(user.lastUpdated || '1970-01-01')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    if (lastUpdated < thirtyDaysAgo) return null

    const userVibe = user.vibe || 'organization'

    const result: ClassificationResult = {
      screen_name: user.screenName || twitterUsername,
      vibe: userVibe as 'individual' | 'organization' | 'spam',
      last_updated: user.lastUpdated || new Date().toISOString()
    }

    // Cast user to access dynamic properties
    const userData = user as unknown as Record<string, unknown>;

    if (userVibe === 'individual') {
      if (userData.current_organizations) {
        result.current_organizations = userData.current_organizations as string[];
      }
      if (userData.past_organizations) {
        result.past_organizations = userData.past_organizations as string[];
      }
      if (userData.member_of) {
        result.member_of = userData.member_of as string[];
      }
      if (userData.department) {
        result.department = userData.department as ClassificationResult['department']
      }
    } else if (userVibe === 'organization') {
      if (userData.org_type) {
        result.org_type = userData.org_type as ClassificationResult['org_type']
      }
      if (userData.org_subtype) {
        const orgSubtype = userData.org_subtype;
        result.org_subtype = typeof orgSubtype === 'string' ? JSON.parse(orgSubtype) : orgSubtype as string[];
      }
      if (userData.web3_focus) {
        result.web3_focus = userData.web3_focus as ClassificationResult['web3_focus']
      }
    }

    return result
  } catch (error) {
    console.error('Error getting cached classification:', error)
    return null
  }
}

/**
 * Classify a single profile
 */
export async function classifyProfile(profile: TwitterProfile): Promise<ClassificationResult> {
  const unifiedProfile: UnifiedProfileInput = {
    screen_name: profile.screen_name,
    name: profile.name,
    description: profile.description || undefined,
    id_str: profile.id_str,
    id: profile.id,
    url: profile.url || undefined,
    followers_count: profile.followers_count || undefined,
    friends_count: profile.friends_count || undefined,
    verified: profile.verified || undefined
  };

  const result = await classifyProfilesWithGrok(unifiedProfile) as ClassificationResult;
  return result;
}

/**
 * Complete profile classification with Neo4j storage
 */
export async function classifyProfileComplete(
  twitterUsername: string,
  profileData: TwitterProfile,
  existingUserId?: string
): Promise<ClassificationResult> {
  const normalizedUsername = twitterUsername.replace('@', '').toLowerCase()

  console.log(`🔍 Starting classification for @${normalizedUsername}`)

  // Check cache first
  const cached = await getCachedClassification(normalizedUsername)
  if (cached) {
    const isIncompleteOrganization = (
      cached.vibe === 'organization' &&
      (!cached.org_type || !cached.org_subtype || !cached.web3_focus)
    )

    if (!isIncompleteOrganization) {
      console.log(`  → ✅ Using cached classification: ${cached.vibe}`)
      return cached
    }
    console.log(`  → ⚠️ Found incomplete cached classification, re-classifying...`)
  }

  let finalClassification: ClassificationResult

  // Spam detection
  if (isSpamAccount(profileData)) {
    console.log('  → ❌ Detected as spam account')
    finalClassification = {
      screen_name: normalizedUsername,
      vibe: 'spam',
      last_updated: new Date().toISOString()
    }
  } else {
    // Grok classification
    const classification = await classifyProfile(profileData)
    finalClassification = classification
  }

  // Save to Neo4j
  try {
    const updatedUserId = await saveClassificationToNeo4j(
      normalizedUsername,
      profileData,
      finalClassification,
      existingUserId
    )

    // Process employment relationships if individual
    if (finalClassification.vibe === 'individual' &&
        (finalClassification.current_organizations?.length ||
         finalClassification.past_organizations?.length ||
         finalClassification.member_of?.length)) {

      console.log('  → Processing employment relationships...')

      const profileWithEmploymentData = {
        ...convertToTwitterApiUser(profileData),
        _employment_data: {
          current_organizations: finalClassification.current_organizations || [],
          past_organizations: finalClassification.past_organizations || [],
          member_of: finalClassification.member_of || [],
          department: finalClassification.department || 'other'
        }
      }

      await processEmploymentData([profileWithEmploymentData])
      console.log('  → ✅ Employment relationships processed')
    }

    console.log(`  → User ID: ${updatedUserId}`)
  } catch (saveError) {
    console.error('  → ❌ Failed to save classification:', saveError)
  }

  console.log(`  → ✅ Classification complete: ${finalClassification.vibe}`)
  return finalClassification
}

// Backward compatibility export
export const classifyOrganization = classifyProfileComplete;
