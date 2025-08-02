import { runQuery } from '@/lib/neo4j'
import OpenAI from 'openai';
import { getUserByScreenName, transformToNeo4jUser, createOrUpdateUser, processEmploymentData } from '@/lib/neo4j/services/user-service'
import { validateVibe, logValidationError, VibeType } from '@/lib/validation'
import { GROK_CONFIGS } from './grok'

/**
 * Grok API client configuration
 */
const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Type definitions for classification system
export interface ClassificationResult {
  vibe: 'individual' | 'organization' | 'spam' | string
  current_position?: {
    organizations: string[]
    department: 'engineering' | 'product' | 'marketing' | 'business' | 'operations' | 'research' | 'community' | 'leadership' | 'other'
  }
  employment_history?: Array<{
    organization: string
  }>
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

// Unified input type that handles both TwitterProfile and simple profile objects
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
  [key: string]: any; // Allow additional properties
};

// Unified output type matching ClassificationResult
export type UnifiedClassificationResult = {
  screen_name: string;
  entity_type: 'individual' | 'organization';
  
  // Individual fields (optional)
  current_position?: {
    organizations: string[];
    department: 'engineering' | 'product' | 'marketing' | 'business' | 'operations' | 'research' | 'community' | 'leadership' | 'other';
  };
  employment_history?: Array<{
    organization: string;
  }>;
  
  // Organization fields (optional)
  org_type?: 'protocol' | 'investment' | 'business' | 'community';
  org_subtype?: string;
  web3_focus?: 'native' | 'adjacent' | 'traditional';
};

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
 * Unified classification function that handles both single profiles and batches
 * Core function moved from grok.ts for better organization
 */
export async function classifyProfilesWithGrok(
  input: UnifiedProfileInput | UnifiedProfileInput[]
): Promise<UnifiedClassificationResult | UnifiedClassificationResult[]> {
  const isArray = Array.isArray(input);
  const profiles = isArray ? input : [input];
  
  try {
    console.log(`🔍 Unified Classification: Processing ${profiles.length} profile${profiles.length === 1 ? '' : 's'} with ${GROK_CONFIGS.MINI_FAST.model}`);
    
    // Streamlined prompt for faster processing
    const prompt = `Classify Twitter profiles as individual or organization. Extract relevant data based on bio.

RULES:
- Individual: current orgs + department (engineering/product/marketing/business/operations/research/community/leadership/other) + prev orgs
- Organization: type (protocol/investment/business/community) + subtype + web3_focus (native/adjacent/traditional)

Profiles:
${profiles.map(p => `@${p.screen_name}: ${p.description || 'No bio'}`).join('\n')}

JSON format:
{
  "results": [
    {
      "screen_name": "username",
      "entity_type": "individual|organization",
      "current_position": {"organizations": ["@company"], "department": "engineering"},
      "employment_history": [{"organization": "@prev_co"}],
      "org_type": "protocol|investment|business|community",
      "org_subtype": "defi|gaming|vc|agency|dao|etc",
      "web3_focus": "native|adjacent|traditional"
    }
  ]
}`;

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: prompt
      }
    ];

    // Use GROK_MINI_FAST for optimal speed with good accuracy
    const response = await grokClient.chat.completions.create({
      ...GROK_CONFIGS.MINI_FAST,
      messages,
      max_tokens: 2000, // Reduced from 4000 for faster responses
      temperature: 0.1, // Lower temperature for faster, more deterministic responses
      disableReasoning: true // Get clean JSON responses
    } as any);

    const content = response.choices[0]?.message?.content;
    const reasoningContent = (response.choices[0]?.message as any)?.reasoning_content;
    
    // Use sophisticated content extraction
    let textToAnalyze = content;
    if (!content && reasoningContent) {
      textToAnalyze = reasoningContent;
      console.log('   → Using reasoning_content as fallback');
    }
    
    if (!textToAnalyze) {
      throw new Error('No content received from Grok');
    }

    let parsedResults: any;

    try {
      // Try direct JSON parsing first
      parsedResults = JSON.parse(textToAnalyze);
    } catch (parseError) {
      // Enhanced JSON extraction combining both approaches
      console.log('   → Direct parsing failed, attempting extraction...');
      
      // Method 1: Look for complete JSON object
      const jsonMatch = textToAnalyze.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsedResults = JSON.parse(jsonMatch[0]);
        } catch (extractError) {
          console.log('   → JSON extraction method 1 failed');
        }
      }
      
      // Method 2: Sophisticated brace matching
      if (!parsedResults) {
        const jsonStart = textToAnalyze.indexOf('{');
        if (jsonStart !== -1) {
          let braceCount = 0;
          let jsonEnd = -1;
          
          for (let i = jsonStart; i < textToAnalyze.length; i++) {
            if (textToAnalyze[i] === '{') braceCount++;
            if (textToAnalyze[i] === '}') braceCount--;
            if (braceCount === 0) {
              jsonEnd = i;
              break;
            }
          }
          
          if (jsonEnd !== -1) {
            const jsonText = textToAnalyze.substring(jsonStart, jsonEnd + 1);
            try {
              parsedResults = JSON.parse(jsonText);
            } catch (extractError2) {
              console.log('   → JSON extraction method 2 failed');
            }
          }
        }
      }
      
      // Fallback: Create basic structure
      if (!parsedResults) {
        console.log('   → All parsing failed, using fallback classification');
        parsedResults = {
          results: profiles.map(profile => {
            // Simple heuristic classification
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
                entity_type: 'organization',
                org_type: 'business',
                org_subtype: 'other',
                web3_focus: 'traditional'
              };
            } else {
              return {
                screen_name: profile.screen_name,
                entity_type: 'individual',
                current_position: {
                  organizations: ['Unknown'],
                  department: 'other'
                },
                employment_history: []
              };
            }
          })
        };
      }
    }

    // Validate and normalize results
    const results = parsedResults.results || parsedResults.profiles || [parsedResults];
    
    const normalizedResults: UnifiedClassificationResult[] = results.map((result: any) => {
      // Normalize field names (handle both entity_type and type)
      const entityType = result.entity_type || result.type || 'individual';
      
      const normalized: UnifiedClassificationResult = {
        screen_name: result.screen_name,
        entity_type: entityType as 'individual' | 'organization'
      };
      
      if (entityType === 'individual') {
        // Add individual fields, ensure they exist
        normalized.current_position = result.current_position || {
          organizations: ['Unknown'],
          department: 'other' as const
        };
        normalized.employment_history = result.employment_history || [];
      } else {
        // Add organization fields with defaults
        normalized.org_type = result.org_type || 'business';
        normalized.org_subtype = result.org_subtype || 'other';
        normalized.web3_focus = result.web3_focus || 'traditional';
      }
      
      return normalized;
    });

    console.log(`✅ Unified Classification: Successfully processed ${normalizedResults.length} profiles`);
    
    // Return format matching input
    return isArray ? normalizedResults : normalizedResults[0];

  } catch (error: any) {
    console.error('❌ Unified Classification failed:', error);
    
    // Enhanced fallback with proper typing
    const fallbackResults: UnifiedClassificationResult[] = profiles.map(profile => {
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
          entity_type: 'organization' as const,
          org_type: 'business' as const,
          org_subtype: 'other',
          web3_focus: 'traditional' as const
        };
      } else {
        return {
          screen_name: profile.screen_name,
          entity_type: 'individual' as const,
          current_position: {
            organizations: ['Unknown'],
            department: 'other' as const
          },
          employment_history: []
        };
      }
    });
    
    return isArray ? fallbackResults : fallbackResults[0];
  }
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
 * Helper function to clean conflicting classification fields in Neo4j
 */
async function cleanConflictingFields(userId: string, vibe: string): Promise<void> {
  let cleanupQuery = ''
  
  if (vibe === VibeType.INDIVIDUAL) {
    // Remove organization fields for individuals
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.org_type, u.org_subtype, u.web3_focus
      RETURN u.userId as userId
    `
  } else if (vibe === VibeType.ORGANIZATION) {
    // Remove individual fields for organizations
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.current_position, u.employment_history, u.department
      RETURN u.userId as userId
    `
  } else if (vibe === VibeType.SPAM) {
    // Remove all classification fields for spam
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.current_position, u.employment_history, u.department,
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
  classification: ClassificationResult
): Promise<void> {
  try {
    // Validate vibe value before processing
    const vibeValidation = validateVibe(classification.vibe)
    if (!vibeValidation.isValid) {
      logValidationError('vibe', classification.vibe, vibeValidation.error!, `saveClassificationToNeo4j for user ${twitterUsername}`)
    }
    
    const apiUser = convertToTwitterApiUser(profileData)
    const neo4jUser = transformToNeo4jUser(apiUser, vibeValidation.sanitizedValue)
    
    // Clean conflicting fields first to ensure data integrity
    await cleanConflictingFields(apiUser.id, vibeValidation.sanitizedValue)
    
    // Store ONLY the appropriate fields based on vibe
    if (vibeValidation.sanitizedValue === VibeType.INDIVIDUAL) {
      neo4jUser.vibe = VibeType.INDIVIDUAL
      
      // Set individual-specific fields only
      if (classification.current_position) {
        (neo4jUser as any).current_position = classification.current_position
        // Extract department as a separate property for easier querying
        if (classification.current_position.department) {
          (neo4jUser as any).department = classification.current_position.department
        }
      }
      if (classification.employment_history) {
        (neo4jUser as any).employment_history = classification.employment_history
      }
      
    } else if (vibeValidation.sanitizedValue === VibeType.SPAM) {
      neo4jUser.vibe = VibeType.SPAM
      // No additional fields for spam accounts
      
    } else {
      neo4jUser.vibe = VibeType.ORGANIZATION
      
      // Set organization-specific fields only
      if (classification.org_type) {
        (neo4jUser as any).org_type = classification.org_type
      }
      if (classification.org_subtype) {
        (neo4jUser as any).org_subtype = classification.org_subtype
      }
      if (classification.web3_focus) {
        (neo4jUser as any).web3_focus = classification.web3_focus
      }
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
      
      // Get the organizational data from separate fields
      if ((user as any).current_position) {
        result.current_position = (user as any).current_position
      }
      if ((user as any).employment_history) {
        result.employment_history = (user as any).employment_history
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
 * Convert unified classification result to our standard format
 */
function convertToClassificationResult(result: UnifiedClassificationResult): ClassificationResult {
  const classificationResult: ClassificationResult = {
    vibe: result.entity_type === 'individual' ? VibeType.INDIVIDUAL : VibeType.ORGANIZATION,
    last_updated: new Date().toISOString()
  };
  
  // Add individual fields if applicable
  if (result.entity_type === 'individual') {
    if (result.current_position) {
      classificationResult.current_position = result.current_position;
    }
    if (result.employment_history) {
      classificationResult.employment_history = result.employment_history;
    }
  }
  
  // Add organization fields if applicable
  if (result.entity_type === 'organization') {
    if (result.org_type) {
      classificationResult.org_type = result.org_type;
    }
    if (result.org_subtype) {
      classificationResult.org_subtype = result.org_subtype;
    }
    if (result.web3_focus) {
      classificationResult.web3_focus = result.web3_focus;
    }
  }
  
  return classificationResult;
}

/**
 * Classify a single profile using the unified system
 * Main entry point for single profile classification
 */
export async function classifyProfile(profile: TwitterProfile): Promise<ClassificationResult> {
  try {
    console.log(`  → Using unified classification system for @${profile.screen_name}...`)
    
    // Convert TwitterProfile to UnifiedProfileInput
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
    
    // Call unified function (single profile)
    const result = await classifyProfilesWithGrok(unifiedProfile) as UnifiedClassificationResult;
    
    // Convert to ClassificationResult
    const classificationResult = convertToClassificationResult(result);
    
    console.log(`  → ✅ Unified classification completed: ${classificationResult.vibe}`);
    return classificationResult;
    
  } catch (error: any) {
    console.error(`  → ❌ Unified classification failed:`, error);
    
    // Fallback classification
    const fallback: ClassificationResult = {
      vibe: VibeType.ORGANIZATION, // Conservative fallback
      web3_focus: 'traditional' as const,
      last_updated: new Date().toISOString()
    }
    console.log('  → Using fallback classification:', fallback)
    return fallback;
  }
}

/**
 * Comprehensive profile classification with full pipeline
 * Main entry point for complete classification process
 */
export async function classifyProfileComplete(
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
      vibe: VibeType.SPAM,
      last_updated: new Date().toISOString()
    }
  } else {
    // Step 3: Organization vs Individual & Web3 Classification (Combined Grok Call)
    console.log('  → Step 3: Comprehensive Grok classification...')
    const classification = await classifyProfile(profileData)
    
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
    
    // Process employment relationships if individual with employment data
    if (finalClassification.vibe === 'individual' && 
        (finalClassification.current_position?.organizations?.length || 
         finalClassification.employment_history?.length)) {
      
      console.log('  → Processing employment relationships...')
      
      // Create a profile object that matches the expected format for processEmploymentData
      const profileWithGrok = {
        ...convertToTwitterApiUser(profileData),
        _grok_analysis: {
          current_position: finalClassification.current_position,
          employment_history: finalClassification.employment_history
        }
      }
      
      await processEmploymentData([profileWithGrok])
      console.log('  → ✅ Employment relationships processed')
    }
  } catch (saveError) {
    console.error('  → ❌ Failed to save classification to Neo4j:', saveError)
    // Don't fail the entire process if save fails
  }
  
  console.log(`  → ✅ Classification complete: ${finalClassification.vibe}`)
  return finalClassification
}

// Backward compatibility export
export const classifyOrganization = classifyProfileComplete;
