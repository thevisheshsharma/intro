import { runQuery, getUserByScreenName, transformToNeo4jUser, createOrUpdateUserWithScreenNameMerge, processEmploymentData } from '@/services'
import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { validateVibe, logValidationError, VibeType } from '@/lib/validation'
import { GROK_CONFIGS } from './grok'

/**
 * Grok API client configuration
 */
const grokClient = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: 'https://api.x.ai/v1',
});

// Type definitions for classification system - Unified single structure
export interface ClassificationResult {
  screen_name: string;
  vibe: 'individual' | 'organization' | 'spam';
  
  // Individual fields (flattened)
  current_organizations?: string[] | null;
  department?: 'engineering' | 'product' | 'marketing' | 'business' | 'operations' | 'research' | 'community' | 'leadership' | 'other';
  past_organizations?: string[];
  
  // Organization fields
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

/**
 * Zod schema for classification results with proper validation
 * Note: OpenAI structured outputs require nullable() for optional fields
 */
const ClassificationSchema = z.object({
  results: z.array(z.object({
    screen_name: z.string(),
    vibe: z.enum(['individual', 'organization', 'spam']),
    
    // Individual fields (flattened)
    current_organizations: z.array(z.string()).nullable().optional(),
    department: z.enum(['engineering', 'product', 'marketing', 'business', 'operations', 'research', 'community', 'leadership', 'other']).nullable().optional(),
    past_organizations: z.array(z.string()).nullable().optional(),
    
    // Organization fields
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
): Promise<ClassificationResult | ClassificationResult[]> {
  const isArray = Array.isArray(input);
  const profiles = isArray ? input : [input];
  
  // Retry logic for API failures
  const maxRetries = 2;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔍 Unified Classification: Processing ${profiles.length} profile${profiles.length === 1 ? '' : 's'} with Zod schema validation${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ''}`);
      
      // Skip if we've seen too many JSON parsing errors
      if (attempt > 1 && lastError?.message?.includes('JSON')) {
        console.log('   → Skipping retry due to repeated JSON parsing errors, using fallback');
        break;
      }
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `You are an expert profile classifier with live search capabilities. You understand web3 degen and technical language. Analyze each profile to classify it accurately.

CLASSIFICATION RULES:
- Classify each profile as "individual" or "organization"
- For individuals: identify current organizations, past organizations and department
- For organizations: identify the type (protocol/infrastructure/social/defi/gaming/exchange/investment/service/community/nft), subtype, and web3 focus
- If you cannot determine a value with confidence, set it to null
- Organizations in current_organizations and past_organizations should be prefixed with @

PROFILES TO CLASSIFY:
${profiles.map(p => `@${p.screen_name}: ${p.description || 'No bio'}`).join('\n')}`
        }
      ];

      // Use Zod response format for guaranteed schema compliance
      const response = await grokClient.chat.completions.create({
        ...GROK_CONFIGS.MINI_FAST,
        messages,
        response_format: zodResponseFormat(ClassificationSchema, "classification_results"),
        temperature: 0.1,
        max_tokens: 4000,  // Increased from 2000 to prevent truncation
        // Enable live search with comprehensive data sources for better classification
        search_parameters: {
          mode: "on", // Force live search to be enabled
          max_search_results: 20, // Reasonable limit for classification
          sources: [
            {
              "type": "x",
              "included_x_handles": profiles.map(p => p.screen_name) // Search specific Twitter handles
            }
          ]
        }
      } as any);

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content received from Grok - empty response');
      }

      if (content.trim() === '') {
        throw new Error('No content received from Grok - empty string');
      }

      // Debug: Log the raw response to understand parsing issues
      console.log('   → Raw Grok response (first 500 chars):', content.substring(0, 500));
      console.log('   → Response length:', content.length);
      
      // Early detection of truncation issues
      if (content.length >= 3900 && !content.trim().endsWith('}')) {
        console.log('   → Response appears truncated (near max_tokens and no proper ending), using fallback');
        throw new Error('Response truncated - using fallback classification');
      }

      let parsedResults: any;

      try {
        // First attempt: Direct JSON parsing
        parsedResults = JSON.parse(content);
        console.log('   → Direct JSON parsing succeeded');
      } catch (parseError) {
        console.log('   → Direct JSON parsing failed:', (parseError as Error).message);
        
        // Clean up common JSON issues
        let cleanedContent = content
          .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .replace(/\\n/g, '\\\\n') // Escape escaped newlines
          .replace(/\\r/g, '\\\\r') // Escape escaped carriage returns
          .replace(/\\t/g, '\\\\t') // Escape escaped tabs
          .replace(/"/g, '"') // Replace smart quotes
          .replace(/"/g, '"') // Replace smart quotes
          .replace(/'/g, "'") // Replace smart quotes
          .replace(/[\r\n]+/g, ' ') // Replace actual line breaks with spaces
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // Fix truncated strings - if content ends with an incomplete string, try to close it
        if (cleanedContent.match(/[^\\]"[^"]*$/)) {
          console.log('   → Detected truncated string, attempting to fix...');
          cleanedContent = cleanedContent.replace(/[^\\]"[^"]*$/, '"');
        }
        
        // Fix truncated arrays - if content ends with incomplete array, try to close it
        if (cleanedContent.match(/,\s*$/)) {
          console.log('   → Detected trailing comma, removing...');
          cleanedContent = cleanedContent.replace(/,\s*$/, '');
        }
        
        // If content ends abruptly, try to close JSON structure
        const openBraces = (cleanedContent.match(/\{/g) || []).length;
        const closeBraces = (cleanedContent.match(/\}/g) || []).length;
        const openBrackets = (cleanedContent.match(/\[/g) || []).length;
        const closeBrackets = (cleanedContent.match(/\]/g) || []).length;
        
        if (openBraces > closeBraces) {
          console.log(`   → Adding ${openBraces - closeBraces} closing braces to fix truncated JSON`);
          cleanedContent += '}'.repeat(openBraces - closeBraces);
        }
        
        if (openBrackets > closeBrackets) {
          console.log(`   → Adding ${openBrackets - closeBrackets} closing brackets to fix truncated arrays`);
          cleanedContent += ']'.repeat(openBrackets - closeBrackets);
        }

        console.log('   → Cleaned content (first 300 chars):', cleanedContent.substring(0, 300));

        try {
          // Try parsing cleaned content
          parsedResults = JSON.parse(cleanedContent);
          console.log('   → Cleaned JSON parsing succeeded');
        } catch (cleanError) {
          console.log('   → Cleaned parsing failed:', (cleanError as Error).message);
          
          // Extract JSON using more sophisticated patterns
          console.log('   → Attempting JSON extraction...');
          
          // Method 1: Find JSON between ```json markers
          const jsonCodeBlockMatch = cleanedContent.match(/```json\s*(\{[\s\S]*?\})\s*```/);
          if (jsonCodeBlockMatch) {
            try {
              parsedResults = JSON.parse(jsonCodeBlockMatch[1]);
              console.log('   → JSON code block extraction succeeded');
            } catch (codeBlockError) {
              console.log('   → JSON code block extraction failed');
            }
          }
          
          // Method 1.5: Look for results array even if outer structure is broken
          if (!parsedResults) {
            try {
              // Try multiple patterns for results array extraction
              let resultsMatch = cleanedContent.match(/"results"\s*:\s*\[([\s\S]*)\]/);
              
              if (!resultsMatch) {
                // Try finding incomplete results array and complete it
                resultsMatch = cleanedContent.match(/"results"\s*:\s*\[([\s\S]*)/);
                if (resultsMatch) {
                  let resultsContent = resultsMatch[1];
                  
                  // Count objects in the incomplete array
                  let openObjects = (resultsContent.match(/\{/g) || []).length;
                  let closeObjects = (resultsContent.match(/\}/g) || []).length;
                  
                  // Close incomplete objects
                  if (openObjects > closeObjects) {
                    resultsContent += '}'.repeat(openObjects - closeObjects);
                  }
                  
                  // Ensure the array ends properly
                  if (!resultsContent.trim().endsWith('}')) {
                    resultsContent = resultsContent.replace(/,$/, '') + '}';
                  }
                  
                  const resultsArrayJson = `{"results":[${resultsContent}]}`;
                  parsedResults = JSON.parse(resultsArrayJson);
                  console.log('   → Results array extraction with completion succeeded');
                }
              } else {
                const resultsArrayJson = `{"results":[${resultsMatch[1]}]}`;
                parsedResults = JSON.parse(resultsArrayJson);
                console.log('   → Results array extraction succeeded');
              }
            } catch (resultsError) {
              console.log('   → Results array extraction failed:', (resultsError as Error).message);
            }
          }
          
          // Method 2: Look for complete JSON object with proper brace matching
          if (!parsedResults) {
            try {
              const jsonStart = cleanedContent.indexOf('{');
              if (jsonStart !== -1) {
                let braceCount = 0;
                let jsonEnd = -1;
                let inString = false;
                let escapeNext = false;
                
                for (let i = jsonStart; i < cleanedContent.length; i++) {
                  const char = cleanedContent[i];
                  
                  if (escapeNext) {
                    escapeNext = false;
                    continue;
                  }
                  
                  if (char === '\\') {
                    escapeNext = true;
                    continue;
                  }
                  
                  if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                  }
                  
                  if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') braceCount--;
                    if (braceCount === 0) {
                      jsonEnd = i;
                      break;
                    }
                  }
                }
                
                if (jsonEnd !== -1) {
                  const extractedJson = cleanedContent.substring(jsonStart, jsonEnd + 1);
                  console.log('   → Extracted JSON (first 200 chars):', extractedJson.substring(0, 200));
                  try {
                    parsedResults = JSON.parse(extractedJson);
                    console.log('   → Brace matching extraction succeeded');
                  } catch (extractError) {
                    console.log('   → Brace matching extraction failed:', (extractError as Error).message);
                  }
                }
              }
            } catch (braceMatchingError) {
              console.log('   → Brace matching process failed:', (braceMatchingError as Error).message);
            }
          }
          
          // Final fallback: Generate structure from response analysis
          if (!parsedResults) {
            console.log('   → All JSON parsing failed, analyzing response for classification hints...');
            console.log('   → Full response for analysis:', content);
            
            parsedResults = {
              results: profiles.map(profile => {
                // Analyze the response text for this profile
                const description = (profile.description || '').toLowerCase();
                const responseText = content.toLowerCase();
                const profileMention = profile.screen_name.toLowerCase();
                
                // Look for explicit classification in response
                const profileSection = responseText.includes(profileMention) 
                  ? responseText.substring(
                      Math.max(0, responseText.indexOf(profileMention) - 100),
                      responseText.indexOf(profileMention) + 200
                    )
                  : responseText;
                
                // Check for organization indicators
                const hasOrgIndicators = 
                  profileSection.includes('organization') || 
                  profileSection.includes('company') || 
                  profileSection.includes('protocol') || 
                  profileSection.includes('platform') ||
                  profileSection.includes('business') ||
                  profileSection.includes('org_type') ||
                  description.includes('protocol') || 
                  description.includes('platform') || 
                  description.includes('ecosystem') ||
                  description.includes('foundation') ||
                  description.includes('dao') ||
                  description.includes('fund') ||
                  description.includes('vc') ||
                  description.includes('company') ||
                  description.includes('corp');
                
                // Check for individual indicators
                const hasIndividualIndicators = 
                  profileSection.includes('individual') ||
                  profileSection.includes('engineer') ||
                  profileSection.includes('developer') ||
                  profileSection.includes('ceo') ||
                  profileSection.includes('founder') ||
                  profileSection.includes('current_position') ||
                  description.includes('engineer') ||
                  description.includes('developer') ||
                  description.includes('founder') ||
                  description.includes('ceo') ||
                  description.includes('working at') ||
                  description.includes('works at');
                
                if (hasOrgIndicators && !hasIndividualIndicators) {
                  // Determine org details from description
                  let orgType = 'service';
                  let web3Focus = 'traditional';
                  
                  if (description.includes('protocol') || description.includes('defi') || description.includes('blockchain')) {
                    orgType = 'protocol';
                    web3Focus = 'native';
                  } else if (description.includes('infrastructure') || description.includes('layer') || description.includes('l1') || description.includes('l2')) {
                    orgType = 'infrastructure';
                    web3Focus = 'native';
                  } else if (description.includes('exchange') || description.includes('dex') || description.includes('cex') || description.includes('trading')) {
                    orgType = 'exchange';
                    web3Focus = 'native';
                  } else if (description.includes('fund') || description.includes('vc') || description.includes('invest')) {
                    orgType = 'investment';
                    web3Focus = description.includes('crypto') || description.includes('web3') ? 'native' : 'adjacent';
                  } else if (description.includes('dao') || description.includes('community')) {
                    orgType = 'community';
                    web3Focus = 'native';
                  }
                  
                  return {
                    screen_name: profile.screen_name,
                    vibe: 'organization',
                    org_type: orgType,
                    org_subtype: ['other'],
                    web3_focus: web3Focus
                  };
                } else {
                  // Check for spam indicators first
                  const followers = profile.followers_count || 0;
                  const following = profile.friends_count || 0;
                  if (followers < 10 && following < 10) {
                    return {
                      screen_name: profile.screen_name,
                      vibe: 'spam'
                    };
                  }
                  
                  // Default to individual
                  let department = 'other';
                  let currentOrganizations = null;
                  
                  if (description.includes('engineer') || description.includes('developer')) {
                    department = 'engineering';
                  } else if (description.includes('product') || description.includes('pm')) {
                    department = 'product';
                  } else if (description.includes('marketing') || description.includes('growth')) {
                    department = 'marketing';
                  } else if (description.includes('business') || description.includes('bd')) {
                    department = 'business';
                  } else if (description.includes('ceo') || description.includes('founder') || description.includes('lead')) {
                    department = 'leadership';
                  }
                  
                  // Try to extract organization from description
                  const orgMatch = description.match(/(?:at|@|working at|works at)\s+([a-zA-Z0-9_]+)/);
                  if (orgMatch) {
                    currentOrganizations = [orgMatch[1]];
                  }
                  
                  return {
                    screen_name: profile.screen_name,
                    vibe: 'individual',
                    current_organizations: currentOrganizations,
                    department: department,
                    past_organizations: []
                  };
                }
              })
            };
            console.log('   → Generated fallback classification for', parsedResults.results.length, 'profiles');
          }
        }
      }

      // Validate with Zod schema
      let validatedResults: any;
      try {
        validatedResults = ClassificationSchema.parse(parsedResults);
      } catch (zodError) {
        console.log('   → Zod validation failed, using normalized fallback...');
        // Ensure the structure matches our schema with flattened structure
        const results = parsedResults.results || parsedResults.profiles || [parsedResults];
        validatedResults = {
          results: results.map((result: any) => ({
            screen_name: result.screen_name || 'unknown',
            vibe: ['individual', 'organization', 'spam'].includes(result.vibe) ? result.vibe : 'individual',
            // Individual fields (flattened)
            current_organizations: result.vibe === 'individual' ? (result.current_organizations || null) : null,
            department: result.vibe === 'individual' ? (result.department || 'other') : null,
            past_organizations: result.vibe === 'individual' ? (result.past_organizations || []) : null,
            // Organization fields
            org_type: result.vibe === 'organization' ? (result.org_type || null) : null,
            org_subtype: result.vibe === 'organization' ? (result.org_subtype || null) : null,
            web3_focus: result.vibe === 'organization' ? (result.web3_focus || null) : null
          }))
        };
      }
      
      // Convert to ClassificationResult format
      const normalizedResults: ClassificationResult[] = validatedResults.results.map((result: any) => {
        const normalized: ClassificationResult = {
          screen_name: result.screen_name,
          vibe: result.vibe,
          last_updated: new Date().toISOString()
        };
        
        if (result.vibe === 'individual') {
          // Handle nullable optional fields with flattened structure
          normalized.current_organizations = result.current_organizations || null;
          normalized.department = result.department || 'other';
          normalized.past_organizations = result.past_organizations || [];
        } else if (result.vibe === 'organization') {
          // Handle nullable optional fields for organizations
          // Use fallbacks for null, undefined, or empty values
          normalized.org_type = result.org_type || 'service';
          normalized.org_subtype = result.org_subtype || ['other'];
          normalized.web3_focus = result.web3_focus || 'traditional';
        }
        
        return normalized;
      });

      console.log(`✅ Zod Classification: Successfully processed ${normalizedResults.length} profiles`);
      
      // Return format matching input - successful processing
      return isArray ? normalizedResults : normalizedResults[0];

    } catch (error: any) {
      lastError = error;
      console.error(`❌ Zod Classification attempt ${attempt} failed:`, error.message);
      
      // If this is the last attempt, break out to use fallback
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // If all retries failed, use enhanced fallback
  console.error('❌ All Zod Classification attempts failed, using enhanced fallback');
  console.error('❌ Last error:', lastError?.message);
  
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
  
  if (vibe === 'individual') {
    // Remove organization fields for individuals
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.org_type, u.org_subtype, u.web3_focus
      RETURN u.userId as userId
    `
  } else if (vibe === 'organization') {
    // Remove individual fields for organizations
    cleanupQuery = `
      MATCH (u:User {userId: $userId})
      REMOVE u.current_organizations, u.past_organizations, u.department
      RETURN u.userId as userId
    `
  } else if (vibe === 'spam') {
    // Remove all classification fields for spam
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
 * Save classification result to Neo4j - prevents duplicate creation
 */
export async function saveClassificationToNeo4j(
  twitterUsername: string, 
  profileData: TwitterProfile,
  classification: ClassificationResult,
  existingUserId?: string // NEW: Accept existing user ID
): Promise<string> { // NEW: Return user ID
  try {
    const apiUser = convertToTwitterApiUser(profileData)
    const neo4jUser = transformToNeo4jUser(apiUser, classification.vibe)
    
    // NEW: Use existing user ID or find existing user
    if (existingUserId) {
      neo4jUser.userId = existingUserId
      console.log(`  → Updating existing user: ${existingUserId}`)
    } else {
      // Check if user already exists before creating
      const existingUser = await getUserByScreenName(twitterUsername)
      if (existingUser) {
        neo4jUser.userId = existingUser.userId
        console.log(`  → Found existing user: ${existingUser.userId}`)
      } else {
        console.log(`  → Will create new user for @${twitterUsername}`)
      }
    }
    
    // Clean conflicting fields first (use userId if available, fallback to apiUser.id)
    const userIdForCleanup = neo4jUser.userId || apiUser.id
    await cleanConflictingFields(userIdForCleanup, classification.vibe)
    
    // Store fields based on vibe
    if (classification.vibe === 'individual') {
      // Set individual-specific fields - organizations are used for relationship creation, not storage
      if (classification.current_organizations) {
        (neo4jUser as any).current_organizations = classification.current_organizations
      }
      if (classification.department) {
        neo4jUser.department = classification.department
      }
      if (classification.past_organizations) {
        (neo4jUser as any).past_organizations = classification.past_organizations
      }
      
    } else if (classification.vibe === 'organization') {
      // Set organization-specific fields - always assign with fallbacks for organizations
      neo4jUser.org_type = classification.org_type || 'service';
      neo4jUser.org_subtype = JSON.stringify(classification.org_subtype || ['other']);
      neo4jUser.web3_focus = classification.web3_focus || 'traditional';
    }
    // Note: spam accounts get no additional fields stored
    
    // Ensure lastUpdated is set to current timestamp
    neo4jUser.lastUpdated = new Date().toISOString()
    
    await createOrUpdateUserWithScreenNameMerge(neo4jUser)
    console.log(`  → ✅ Neo4j updated for @${twitterUsername}: ${classification.vibe}`)
    
    // NEW: Return the user ID for coordination
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
    
    // Check if classification is recent (within 30 days)
    const lastUpdated = new Date(user.lastUpdated || '1970-01-01')
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    if (lastUpdated < thirtyDaysAgo) return null
    
    // Extract classification data from user
    const userVibe = user.vibe || 'organization'
    
    // Build classification result with new unified structure
    const result: ClassificationResult = {
      screen_name: user.screenName || twitterUsername,
      vibe: userVibe as 'individual' | 'organization' | 'spam',
      last_updated: user.lastUpdated || new Date().toISOString()
    }
    
    if (userVibe === 'individual') {
      // Get the organizational data - these are used for relationships, not stored as JSON
      if ((user as any).current_organizations) {
        result.current_organizations = (user as any).current_organizations;
      }
      if ((user as any).department) {
        result.department = (user as any).department
      }
      if ((user as any).past_organizations) {
        result.past_organizations = (user as any).past_organizations;
      }
    } else if (userVibe === 'organization') {
      // Handle organization fields
      if ((user as any).org_type) {
        result.org_type = (user as any).org_type
      }
      if ((user as any).org_subtype) {
        // Parse JSON string back to array if it's a string, otherwise use as-is
        const orgSubtype = (user as any).org_subtype;
        result.org_subtype = typeof orgSubtype === 'string' ? JSON.parse(orgSubtype) : orgSubtype;
      }
      if ((user as any).web3_focus) {
        result.web3_focus = (user as any).web3_focus
      }
    }
    // Note: spam accounts get no additional fields

    return result
  } catch (error) {
    console.error('Error getting cached classification:', error)
    return null
  }
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
    const result = await classifyProfilesWithGrok(unifiedProfile) as ClassificationResult;
    
    console.log(`  → ✅ Unified classification completed: ${result.vibe}`);
    return result;
    
  } catch (error: any) {
    console.error(`  → ❌ Unified classification failed:`, error);
    
    // Fallback classification
    const fallback: ClassificationResult = {
      screen_name: profile.screen_name,
      vibe: 'organization',
      org_type: 'service' as const,
      org_subtype: ['other'],
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
  profileData: TwitterProfile,
  existingUserId?: string // NEW: Accept existing user ID
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
      screen_name: normalizedUsername,
      vibe: 'spam',
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
  
  // Always save the final classification to Neo4j with coordination
  console.log('  → Saving classification to Neo4j...')
  try {
    const updatedUserId = await saveClassificationToNeo4j(
      normalizedUsername, 
      profileData, 
      finalClassification,
      existingUserId // Pass existing user ID if provided
    )
    console.log('  → ✅ Classification saved to user:', updatedUserId)
    
    // Process employment relationships if individual with employment data
    if (finalClassification.vibe === 'individual' && 
        (finalClassification.current_organizations?.length || 
         finalClassification.past_organizations?.length)) {
      
      console.log('  → Processing employment relationships with flattened structure...')
      
      // Create a profile object with flattened employment data
      const profileWithEmploymentData = {
        ...convertToTwitterApiUser(profileData),
        _employment_data: {
          current_organizations: finalClassification.current_organizations || [],
          department: finalClassification.department || 'other',
          past_organizations: finalClassification.past_organizations || []
        }
      }
      
      await processEmploymentData([profileWithEmploymentData])
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
