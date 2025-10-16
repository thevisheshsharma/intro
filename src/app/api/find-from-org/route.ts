import { NextRequest, NextResponse } from 'next/server'
import { findOrgAffiliatesWithGrok } from '@/lib/grok'
import { classifyProfilesWithGrok } from '@/lib/classifier'
import { validateVibe, logValidationError, VibeType } from '@/lib/validation'
import { 
  createOrUpdateUsersOptimized,
  createOrUpdateUserWithScreenNameMerge,
  getUserByScreenName,
  getUsersByScreenNames,
  getUserFollowingCount,
  transformToNeo4jUser,
  hasFollowingData,
  getOrganizationFollowingUsers,
  addAffiliateRelationships,
  addFollowsRelationships,
  checkUsersExist,
  checkExistingAffiliateRelationships,
  checkExistingFollowsRelationships,
  filterOutExistingRelationships,
  getUsersWithExistingEmploymentRelationships,
  getOrganizationEmployees,
  getOrganizationEmployeesByScreenName,
  updateOrganizationClassification,
  consolidatedUserExistenceCheck,
  batchCheckUserEmploymentData
} from '@/services'

export async function POST(request: NextRequest) {
  try {
    const { orgUsername } = await request.json()

    if (!orgUsername) {
      return NextResponse.json(
        { error: 'Organization username is required' },
        { status: 400 }
      )
    }

    // Check for required environment variables
    if (!process.env.SOCIALAPI_BEARER_TOKEN) {
      console.error('[Config] SOCIALAPI_BEARER_TOKEN not configured')
      return NextResponse.json(
        { error: 'API configuration error: Missing SocialAPI token' },
        { status: 500 }
      )
    }

    if (!process.env.GROK_API_KEY) {
      console.error('[Config] GROK_API_KEY not configured')
      return NextResponse.json(
        { error: 'API configuration error: Missing Grok API key' },
        { status: 500 }
      )
    }

    console.log(`Starting search for organization: @${orgUsername}`)

    const results: {
      orgProfile: any;
      affiliatedUsers: any[];
      searchedUsers: any[];
      grokUsers: string[];
      followingUsers: any[];
      allProfiles: any[];
      existingEmployees: any[];
      errors: string[];
      meta?: {
        grokOrganizationsUpdated?: number;
        [key: string]: any;
      };
    } = {
      orgProfile: null,
      affiliatedUsers: [],
      searchedUsers: [],
      grokUsers: [],
      followingUsers: [],
      allProfiles: [],
      existingEmployees: [],
      errors: [],
      meta: {}
    }

    // Step 1: Massively Parallel Data Fetching Optimization
    console.log('Step 1: Parallel data source execution (optimized)...')
    
    let existingOrgUser: any = null
    let freshOrgProfile: any = null
    let shouldFetchFollowingsFromAPI = true
    
    // Execute initial operations in parallel (org profile sources + independent operations)
    console.log('→ Starting org profile sources and independent operations in parallel...')
    const [
      neo4jOrgResult,
      socialApiOrgResult,
      grokResult,
      searchResult,
      existingEmployeesResult
    ] = await Promise.allSettled([
      // 1a: Neo4j org lookup
      (async () => {
        console.log('   → Starting Neo4j org lookup...')
        const result = await getUserByScreenName(orgUsername)
        console.log(`   → ✅ Neo4j org: ${result ? 'Found' : 'Not found'}`)
        return result
      })(),
      
      // 1b: SocialAPI org profile lookup
      (async () => {
        console.log('   → Starting SocialAPI org lookup...')
        const response = await fetch(`https://api.socialapi.me/twitter/user/${orgUsername}`, {
          headers: {
            'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
            'Accept': 'application/json',
          }
        })
        if (response.ok) {
          const data = await response.json()
          console.log(`   → ✅ SocialAPI org: Found @${data.screen_name}`)
          return data
        } else {
          throw new Error(`SocialAPI returned ${response.status}: ${await response.text()}`)
        }
      })(),
      
      // 1c: Grok AI analysis
      (async () => {
        console.log('   → Starting Grok analysis...')
        const grokUsernames = await findOrgAffiliatesWithGrok(orgUsername)
        console.log(`   → ✅ Grok: Found ${grokUsernames.length} usernames`)
        return grokUsernames
      })(),
      
      // 1d: User search
      (async () => {
        console.log('   → Starting user search...')
        const searchResponse = await fetch(`https://api.socialapi.me/twitter/search-users?query=${encodeURIComponent(orgUsername)}`, {
          headers: {
            'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
            'Accept': 'application/json'
          }
        })
        if (searchResponse.ok) {
          const searchData = await searchResponse.json()
          const searchUsers = searchData.users || searchData || []
          console.log(`   → ✅ Search: Found ${searchUsers.length} users`)
          return searchUsers
        } else {
          console.warn(`   → ⚠️  Search: API returned ${searchResponse.status}`)
          return []
        }
      })(),
      
      // 1e: Existing employees lookup (conditional)
      (async () => {
        console.log('   → Starting existing employees lookup...')
        try {
          // Use screenName directly instead of looking up userId first
          const employees = await getOrganizationEmployeesByScreenName(orgUsername)
          console.log(`   → ✅ Existing employees: Found ${employees.length} with WORKS_AT relationships`)
          return employees
        } catch (error: any) {
          console.warn(`   → ⚠️  Existing employees: ${error.message}`)
          return null
        }
      })()
    ])
    
    // Process all parallel results
    try {
      // Process Neo4j result
      if (neo4jOrgResult.status === 'fulfilled' && neo4jOrgResult.value) {
        existingOrgUser = neo4jOrgResult.value
        console.log(`   → Found org in Neo4j: @${existingOrgUser.screenName}`)
      } else {
        console.log('   → Org not found in Neo4j')
        if (neo4jOrgResult.status === 'rejected') {
          console.debug('   → Neo4j lookup error:', neo4jOrgResult.reason?.message)
        }
      }
      
      // Process SocialAPI result
      if (socialApiOrgResult.status === 'fulfilled' && socialApiOrgResult.value) {
        freshOrgProfile = socialApiOrgResult.value
        console.log(`   → Fetched org profile from SocialAPI: @${freshOrgProfile.screen_name}`)
      } else {
        console.warn('   → Failed to fetch org profile from SocialAPI')
        if (socialApiOrgResult.status === 'rejected') {
          console.debug('   → SocialAPI lookup error:', socialApiOrgResult.reason?.message)
          results.errors.push(`Failed to fetch org profile: ${socialApiOrgResult.reason?.message}`)
        }
      }

      // Process Grok result
      if (grokResult.status === 'fulfilled') {
        results.grokUsers = grokResult.value
        console.log(`   → ✅ Grok: Found ${results.grokUsers.length} usernames`)
      } else {
        console.error(`   → ❌ Grok error: ${grokResult.reason?.message}`)
        results.errors.push(`Grok analysis error: ${grokResult.reason?.message}`)
        results.grokUsers = []
      }

      // Process Search result
      if (searchResult.status === 'fulfilled') {
        results.searchedUsers = searchResult.value
        console.log(`   → ✅ Search: Found ${results.searchedUsers.length} users`)
      } else {
        console.error(`   → ❌ Search error: ${searchResult.reason?.message}`)
        results.errors.push(`Search error: ${searchResult.reason?.message}`)
        results.searchedUsers = []
      }

      // Process Existing Employees result
      if (existingEmployeesResult.status === 'fulfilled' && existingEmployeesResult.value) {
        results.existingEmployees = existingEmployeesResult.value
        console.log(`   → ✅ Existing employees: Found ${results.existingEmployees.length} with WORKS_AT relationships`)
      } else {
        console.log('   → ✅ Existing employees: None found or will check later when org profile is available')
        if (existingEmployeesResult.status === 'rejected') {
          console.debug('   → Existing employees lookup error:', existingEmployeesResult.reason?.message)
        }
        results.existingEmployees = []
      }

      // Affiliates will be fetched after org profile is determined
      
      // Decision logic: Use Neo4j data or fetch fresh data
      if (existingOrgUser && freshOrgProfile) {
        console.log('   → Both Neo4j and SocialAPI data available, comparing freshness...')
        const cachedFollowingCount = await getUserFollowingCount(existingOrgUser.userId)
        const freshFollowingCount = freshOrgProfile.friends_count || 0
        const differencePercentage = cachedFollowingCount === 0 ? 100 : Math.abs(cachedFollowingCount - freshFollowingCount) / cachedFollowingCount * 100
        const hasSignificantDifference = cachedFollowingCount === 0 ? true : Math.abs(cachedFollowingCount - freshFollowingCount) / cachedFollowingCount > 0.1
        console.log(`     → Following count: Neo4j=${cachedFollowingCount}, SocialAPI=${freshFollowingCount}, Δ=${differencePercentage.toFixed(1)}%`)
        if (hasSignificantDifference) {
          console.log('     → Significant difference detected (>10%), using fresh SocialAPI data')
          results.orgProfile = freshOrgProfile
          shouldFetchFollowingsFromAPI = true
          try {
            await createOrUpdateUserWithScreenNameMerge(transformToNeo4jUser(freshOrgProfile))
            console.log('     → Updated org in Neo4j with fresh data')
          } catch (updateError: any) {
            console.warn('     → Failed to update org in Neo4j:', updateError.message)
          }
        } else {
          console.log('     → Data is fresh enough (<10% difference), using cached Neo4j data')
          results.orgProfile = {
            id: existingOrgUser.userId,
            id_str: existingOrgUser.userId,
            screen_name: existingOrgUser.screenName,
            name: existingOrgUser.name,
            description: existingOrgUser.description,
            location: existingOrgUser.location,
            url: existingOrgUser.url,
            profile_image_url_https: existingOrgUser.profileImageUrl,
            followers_count: existingOrgUser.followersCount,
            friends_count: existingOrgUser.followingCount,
            verified: existingOrgUser.verified,
            created_at: existingOrgUser.createdAt,
            listed_count: existingOrgUser.listedCount,
            statuses_count: existingOrgUser.statusesCount,
            favourites_count: existingOrgUser.favouritesCount,
            protected: existingOrgUser.protected,
            can_dm: existingOrgUser.canDm,
            profile_banner_url: existingOrgUser.profileBannerUrl,
            verification_info: {
              type: existingOrgUser.verificationType,
              reason: existingOrgUser.verificationReason
            }
          }
          try {
            const hasFollowings = await hasFollowingData(existingOrgUser.userId)
            if (hasFollowings) {
              shouldFetchFollowingsFromAPI = false
              console.log('     → Using existing following data from Neo4j')
            }
          } catch (dataCheckError: any) {
            console.warn('     → Error checking existing following data:', dataCheckError.message)
          }
        }
      } else if (freshOrgProfile) {
        console.log('   → Using fresh SocialAPI data (Neo4j data not available)')
        results.orgProfile = freshOrgProfile
        shouldFetchFollowingsFromAPI = true
        try {
          await createOrUpdateUserWithScreenNameMerge(transformToNeo4jUser(freshOrgProfile))
          console.log('     → Stored new org in Neo4j')
        } catch (storeError: any) {
          console.warn('     → Failed to store org in Neo4j:', storeError.message)
        }
      } else if (existingOrgUser) {
        console.log('   → Using cached Neo4j data (SocialAPI failed)')
        results.orgProfile = {
          id: existingOrgUser.userId,
          id_str: existingOrgUser.userId,
          screen_name: existingOrgUser.screenName,
          name: existingOrgUser.name,
          description: existingOrgUser.description,
          location: existingOrgUser.location,
          url: existingOrgUser.url,
          profile_image_url_https: existingOrgUser.profileImageUrl,
          followers_count: existingOrgUser.followersCount,
          friends_count: existingOrgUser.followingCount,
          verified: existingOrgUser.verified,
          created_at: existingOrgUser.createdAt,
          listed_count: existingOrgUser.listedCount,
          statuses_count: existingOrgUser.statusesCount,
          favourites_count: existingOrgUser.favouritesCount,
          protected: existingOrgUser.protected,
          can_dm: existingOrgUser.canDm,
          profile_banner_url: existingOrgUser.profileBannerUrl,
          verification_info: {
            type: existingOrgUser.verificationType,
            reason: existingOrgUser.verificationReason
          }
        }
        try {
          const hasFollowings = await hasFollowingData(existingOrgUser.userId)
          if (hasFollowings) {
            shouldFetchFollowingsFromAPI = false
            console.log('     → Using existing following data from Neo4j')
          }
        } catch (dataCheckError: any) {
          console.warn('     → Error checking existing following data:', dataCheckError.message)
        }
      } else {
        console.error('   → No organization data available from either source')
        results.errors.push('Organization not found in Neo4j or SocialAPI')
      }

      // Fetch affiliates with user ID now that we have org profile
      if (results.orgProfile?.id_str) {
        try {
          console.log('   → Fetching affiliates with user ID...')
          console.log(`   → Affiliates URL: https://api.socialapi.me/twitter/user/${results.orgProfile.id_str}/affiliates`)
          const affiliatesResponse = await fetch(`https://api.socialapi.me/twitter/user/${results.orgProfile.id_str}/affiliates`, {
            headers: {
              'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
              'Accept': 'application/json'
            }
          })
          
          if (affiliatesResponse.ok) {
            const affiliatesData = await affiliatesResponse.json()
            results.affiliatedUsers = affiliatesData.users || affiliatesData.data || []
            console.log(`   → ✅ Affiliates: Found ${results.affiliatedUsers.length} official affiliates`)
          } else if (affiliatesResponse.status === 404) {
            console.log('   → ✅ Affiliates: No official affiliates available for this organization (404)')
            results.affiliatedUsers = []
          } else if (affiliatesResponse.status === 401) {
            console.error('   → ❌ Affiliates: Authentication failed (401)')
            results.errors.push('Affiliates authentication error')
            results.affiliatedUsers = []
          } else if (affiliatesResponse.status === 403) {
            console.warn('   → ⚠️  Affiliates: Access forbidden (403)')
            results.errors.push('Affiliates access forbidden')
            results.affiliatedUsers = []
          } else {
            console.warn(`   → ⚠️  Affiliates failed: ${affiliatesResponse.status}`)
            const responseText = await affiliatesResponse.text().catch(() => 'Unknown error')
            results.errors.push(`Affiliates failed: ${affiliatesResponse.status} - ${responseText}`)
            results.affiliatedUsers = []
          }
        } catch (affiliatesError: any) {
          console.error(`   → ❌ Affiliates error: ${affiliatesError.message}`)
          results.errors.push(`Affiliates error: ${affiliatesError.message}`)
          results.affiliatedUsers = []
        }
      } else {
        console.log('   → ⚠️  No user ID available for affiliates fetch')
        results.affiliatedUsers = []
      }
      
      // Fetch existing employees if not already fetched and we now have org profile
      if (results.orgProfile?.screen_name && results.existingEmployees.length === 0) {
        try {
          console.log('   → Fetching existing employees now that org profile is available...')
          const employees = await getOrganizationEmployeesByScreenName(results.orgProfile.screen_name)
          results.existingEmployees = employees
          console.log(`   → ✅ Found ${employees.length} existing employees with WORKS_AT relationships`)
        } catch (employeesError: any) {
          console.warn(`   → ⚠️  Error fetching existing employees: ${employeesError.message}`)
          results.existingEmployees = []
        }
      }
      
    } catch (error: any) {
      console.error('   → Error during parallel data source processing:', error.message)
      results.errors.push(`Data source processing error: ${error.message}`)
    }

    // Create organization name variations once for reuse throughout the process
    let globalOrgVariations: string[] = []
    if (results.orgProfile) {
      const variations = new Set<string>()
      variations.add(orgUsername.toLowerCase())
      variations.add(orgUsername.toLowerCase().replace(/[^a-z0-9]/g, ''))
      
      if (results.orgProfile?.name) {
        const orgName = results.orgProfile.name.toLowerCase()
        variations.add(orgName)
        const cleanName = orgName.replace(/[^\w\s]/g, '').trim()
        if (cleanName) variations.add(cleanName)
        const noSpaceName = orgName.replace(/\s+/g, '')
        if (noSpaceName !== orgName) variations.add(noSpaceName)
        const withoutSuffixes = orgName.replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\b/g, '').trim()
        if (withoutSuffixes !== orgName) variations.add(withoutSuffixes)
        const firstName = orgName.split(/[\s\-_]+/)[0]
        if (firstName && firstName.length >= 3) variations.add(firstName)
        const words = orgName.split(/[\s\-_]+/).filter((word: string) => word.length > 2)
        words.forEach((word: string) => variations.add(word))
        if (words.length > 1) {
          const abbreviation = words.map((word: string) => word[0]).join('')
          if (abbreviation.length >= 2) variations.add(abbreviation)
        }
      }
      
      if (results.orgProfile?.url) {
        try {
          const url = new URL(results.orgProfile.url)
          const domain = url.hostname.toLowerCase()
          variations.add(domain)
          const domainWithoutWww = domain.replace(/^www\./, '')
          if (domainWithoutWww !== domain) {
            variations.add(domainWithoutWww)
          }
          const domainName = domainWithoutWww.split('.')[0]
          if (domainName && domainName.length > 2) {
            variations.add(domainName)
          }
        } catch {}
      }
      
      globalOrgVariations = Array.from(variations).filter(v => v.length >= 3)
    }

    // Step 1.5: Load existing following data from Neo4j if using cached data
    let allFollowingsFromNeo4j: any[] = []
    if (!shouldFetchFollowingsFromAPI && existingOrgUser) {
      try {
        const neo4jFollowings = await getOrganizationFollowingUsers(existingOrgUser.userId)
        allFollowingsFromNeo4j = neo4jFollowings.map(neo4jUser => ({
          id: neo4jUser.userId,
          id_str: neo4jUser.userId,
          screen_name: neo4jUser.screenName,
          name: neo4jUser.name,
          description: neo4jUser.description,
          location: neo4jUser.location,
          url: neo4jUser.url,
          profile_image_url_https: neo4jUser.profileImageUrl,
          followers_count: neo4jUser.followersCount,
          friends_count: neo4jUser.followingCount,
          verified: neo4jUser.verified,
          created_at: neo4jUser.createdAt,
          listed_count: neo4jUser.listedCount,
          statuses_count: neo4jUser.statusesCount,
          favourites_count: neo4jUser.favouritesCount,
          protected: neo4jUser.protected,
          can_dm: neo4jUser.canDm,
          profile_banner_url: neo4jUser.profileBannerUrl,
          verification_info: {
            type: neo4jUser.verificationType,
            reason: neo4jUser.verificationReason
          }
        }))
        console.log(`   → Loaded ${allFollowingsFromNeo4j.length} following users from Neo4j`)
        
        // Run org-mention-in-bio analysis on Neo4j followings using global variations
        
        const followingUsers: any[] = []
        allFollowingsFromNeo4j.forEach((user: any) => {
          if (user.description) {
            const bioLower = user.description.toLowerCase()
            const matchedVariations = globalOrgVariations.filter(variation => {
              // Create word boundary regex for proper matching
              const wordBoundaryRegex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
              // Also check for exact matches with common separators
              const separatorRegex = new RegExp(`(^|[\\s\\-_@\\.])${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-_@\\.])`,'i')
              return wordBoundaryRegex.test(bioLower) || separatorRegex.test(bioLower)
            })
            if (matchedVariations.length > 0) {
              followingUsers.push(user)
            }
          }
        })
        results.followingUsers = followingUsers
        console.log(`   → Found ${followingUsers.length} users with org mentions in bio (from Neo4j data)`)
      } catch (error: any) {
        console.warn('   → Error loading following users from Neo4j:', error.message)
        shouldFetchFollowingsFromAPI = true
      }
    }

    console.log(`   → ✅ All data sources complete: ${results.affiliatedUsers.length} affiliates, ${results.searchedUsers.length} search results, ${results.grokUsers.length} Grok suggestions`)

    // Global variable to store batch existence check results
    let globalExistingUserIds: Set<string> = new Set()

    // Step 2: Check organization's following list for potential affiliates (if needed)
    if (shouldFetchFollowingsFromAPI) {
      try {
        if (results.orgProfile && results.orgProfile.id_str) {
          const userId = results.orgProfile.id_str
          let allFollowings: any[] = []
          let nextCursor: string | undefined = undefined
          let firstPage = true
          do {
            let url = `https://api.socialapi.me/twitter/friends/list?user_id=${userId}&count=200`
            if (!firstPage && nextCursor) {
              url += `&cursor=${nextCursor}`
            }
            const response = await fetch(url, {
              headers: {
                'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
                'Accept': 'application/json',
              },
            })
            if (!response.ok) {
              results.errors.push(`Failed to fetch following list: ${response.status}`)
              break
            }
            const data = await response.json()
            if (Array.isArray(data.users)) {
              allFollowings.push(...data.users)
            }
            nextCursor = data.next_cursor_str || data.next_cursor
            firstPage = false
          } while (nextCursor && nextCursor !== '0')
          
          // Filter for potential affiliates using global organization name variations
          const followingUsers: any[] = []
          allFollowings.forEach((user: any) => {
            if (user.description) {
              const bioLower = user.description.toLowerCase()
              const matchedVariations = globalOrgVariations.filter(variation => {
                // Create word boundary regex for proper matching
                const wordBoundaryRegex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
                // Also check for exact matches with common separators
                const separatorRegex = new RegExp(`(^|[\\s\\-_@\\.])${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-_@\\.])`,'i')
                return wordBoundaryRegex.test(bioLower) || separatorRegex.test(bioLower)
              })
              if (matchedVariations.length > 0) {
                followingUsers.push(user)
              }
            }
          })
          results.followingUsers = followingUsers
          // Store ALL followings for FOLLOWS relationships in Neo4j (only when fetching from API)
          if (allFollowings.length > 0) {
            try {
              // Filter out users with missing IDs before transformation
              const validFollowings = allFollowings.filter(user => user.id_str || user.id)
              const invalidFollowingsCount = allFollowings.length - validFollowings.length
              
              if (invalidFollowingsCount > 0) {
                console.warn(`   → Filtered out ${invalidFollowingsCount} following users with missing IDs`)
              }
              
              if (validFollowings.length > 0) {
                // For API-fetched following users, we need to check existence since they weren't part of global batch
                const followingUserIds = validFollowings.map(user => user.id_str || user.id)
                let existingFollowingIds: Set<string>
                
                // Use consolidated existence check instead of individual check
                if (globalExistingUserIds.size === 0) {
                  console.log(`   → Running consolidated existence check for following users...`)
                  try {
                    globalExistingUserIds = await consolidatedUserExistenceCheck({
                      followingProfiles: validFollowings
                    })
                    existingFollowingIds = globalExistingUserIds
                  } catch (error: any) {
                    console.warn(`   → Error in consolidated existence check:`, error.message)
                    existingFollowingIds = new Set()
                  }
                } else {
                  // Use global existence check results
                  existingFollowingIds = globalExistingUserIds
                }
                
                const newFollowingUsers = validFollowings
                  .filter(user => !existingFollowingIds.has(user.id_str || user.id))
                  .map(user => transformToNeo4jUser(user))
                
                const existingCount = followingUserIds.length - newFollowingUsers.length
                console.log(`   → Found ${existingCount} existing following users, ${newFollowingUsers.length} new users to upsert`)
                
                if (newFollowingUsers.length > 0) {
                  const result = await createOrUpdateUsersOptimized(newFollowingUsers, 1080) // 45 day staleness
                  console.log(`   → Following users: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`)
                }
                
                // Check and create FOLLOWS relationships
                const allFollowsRelationships: Array<{followerUserId: string, followingUserId: string}> = []
                validFollowings.forEach((user: any) => {
                  if (user.id_str && user.id_str !== userId) {
                    allFollowsRelationships.push({
                      followerUserId: userId,
                      followingUserId: user.id_str
                    })
                  }
                })
                
                if (allFollowsRelationships.length > 0) {
                  // Check which relationships already exist
                  const existingFollowsRelationships = await checkExistingFollowsRelationships(allFollowsRelationships)
                  const newFollowsRelationships = filterOutExistingRelationships(
                    allFollowsRelationships,
                    existingFollowsRelationships,
                    ['followerUserId', 'followingUserId']
                  )
                  
                  console.log(`   → Found ${existingFollowsRelationships.length} existing, ${newFollowsRelationships.length} new FOLLOWS relationships`)
                  
                  if (newFollowsRelationships.length > 0) {
                    await addFollowsRelationships(newFollowsRelationships)
                    console.log(`   → Created ${newFollowsRelationships.length} new FOLLOWS relationships in Neo4j`)
                  } else {
                    console.log('   → All FOLLOWS relationships already exist')
                  }
                }
              }
            } catch (followingStorageError: any) {
              console.warn('   → Error storing following relationships to Neo4j:', followingStorageError.message)
              results.errors.push(`Following storage error: ${followingStorageError.message}`)
            }
          }
        } else {
          console.warn('   → Could not get user ID for following list analysis - skipping')
          results.errors.push('Could not obtain user ID for following list analysis')
        }
      } catch (error: any) {
        console.error('   → Error analyzing following list:', error.message)
        results.errors.push(`Error analyzing following list: ${error.message}`)
      }
    } else {
      console.log('   → Using cached following data from Neo4j - skipping API fetch and Neo4j upsert')
    }

    // Step 3: Batch Profile Existence Check and Collection
    // OPTIMIZATION: This step consolidates all profile existence checks into a single batch operation
    // instead of multiple separate checks throughout the code. This significantly reduces Neo4j queries.
    console.log('🔍 Step 3: Collecting profiles and batch checking existence in Neo4j...')
    
    // Create a set of existing employee usernames to exclude from processing
    const existingEmployeeUsernames = new Set<string>()
    if (results.existingEmployees.length > 0) {
      results.existingEmployees.forEach(employee => {
        existingEmployeeUsernames.add(employee.screenName.toLowerCase())
      })
      console.log(`   → Excluding ${existingEmployeeUsernames.size} existing employees from profile collection pipeline`)
    }
    
    const allUsernames = new Set<string>()
    const allProfiles: any[] = []
    
    // Collect all profiles and user IDs for batch processing
    const profileSources = {
      affiliates: results.affiliatedUsers,
      search: results.searchedUsers,
      following: results.followingUsers,
      grok: []  // Will be populated after checking existing Grok users
    }
    
    // Add FULL PROFILES from affiliates (already have complete data) - exclude existing employees
    results.affiliatedUsers.forEach((user: any) => {
      if (user.screen_name && !existingEmployeeUsernames.has(user.screen_name.toLowerCase())) {
        allUsernames.add(user.screen_name.toLowerCase())
        allProfiles.push(user)
      }
    })
    
    // Add FULL PROFILES from search (already have complete data) - exclude existing employees
    results.searchedUsers.forEach((user: any) => {
      if (user.screen_name) {
        const username = user.screen_name.toLowerCase()
        if (!allUsernames.has(username) && !existingEmployeeUsernames.has(username)) { // Avoid duplicates and existing employees
          allUsernames.add(username)
          allProfiles.push(user)
        }
      }
    })
    
    // Add FULL PROFILES from following list analysis (already have complete data) - exclude existing employees
    results.followingUsers.forEach((user: any) => {
      if (user.screen_name) {
        const username = user.screen_name.toLowerCase()
        if (!allUsernames.has(username) && !existingEmployeeUsernames.has(username)) { // Avoid duplicates and existing employees
          allUsernames.add(username)
          allProfiles.push(user)
        }
      }
    })
    
    // Handle Grok usernames - check which exist in Neo4j and which need fetching
    const grokUsernamesNeedingProfiles: string[] = []
    
    if (results.grokUsers.length > 0) {
      console.log(`   → Processing ${results.grokUsers.length} Grok usernames...`)
      
      // Filter out Grok usernames already found in other sources or existing employees
      const grokUsernamesNotYetAdded = results.grokUsers.filter((username: string) => {
        if (username) {
          const cleanUsername = username.toLowerCase()
          return !allUsernames.has(cleanUsername) && !existingEmployeeUsernames.has(cleanUsername)
        }
        return false
      })
      
      if (grokUsernamesNotYetAdded.length > 0) {
        console.log(`   → Checking ${grokUsernamesNotYetAdded.length} new Grok usernames in Neo4j...`)
        
        try {
          const existingGrokUsers = await getUsersByScreenNames(grokUsernamesNotYetAdded)
          const existingUsernamesSet = new Set(existingGrokUsers.map(user => user.screenName.toLowerCase()))
          
          // Add existing Grok users to profiles (exclude existing employees)
          existingGrokUsers.forEach(existingUser => {
            if (!existingEmployeeUsernames.has(existingUser.screenName.toLowerCase())) {
              const apiFormatUser = {
                id: existingUser.userId,
                id_str: existingUser.userId,
                screen_name: existingUser.screenName,
                name: existingUser.name,
                description: existingUser.description,
                location: existingUser.location,
                url: existingUser.url,
                profile_image_url_https: existingUser.profileImageUrl,
                followers_count: existingUser.followersCount,
                friends_count: existingUser.followingCount,
                verified: existingUser.verified,
                created_at: existingUser.createdAt,
                listed_count: existingUser.listedCount,
                statuses_count: existingUser.statusesCount,
                favourites_count: existingUser.favouritesCount,
                protected: existingUser.protected,
                can_dm: existingUser.canDm,
                profile_banner_url: existingUser.profileBannerUrl,
                verification_info: {
                  type: existingUser.verificationType,
                  reason: existingUser.verificationReason
                }
              }
              allProfiles.push(apiFormatUser)
              allUsernames.add(existingUser.screenName.toLowerCase())
            }
          })
          
          // Identify usernames that need fetching from API
          grokUsernamesNotYetAdded.forEach(username => {
            if (!existingUsernamesSet.has(username.toLowerCase())) {
              grokUsernamesNeedingProfiles.push(username.toLowerCase())
            }
          })
          
          console.log(`   → Found ${existingGrokUsers.length} existing Grok users in Neo4j`)
          console.log(`   → Need to fetch ${grokUsernamesNeedingProfiles.length} new Grok users from API`)
        } catch (error: any) {
          console.warn(`   → Error checking Grok users in Neo4j:`, error.message)
          grokUsernamesNeedingProfiles.push(...grokUsernamesNotYetAdded.map(u => u.toLowerCase()))
        }
      }
    }
    
    // Use consolidated existence check for all collected profiles
    if (allProfiles.length > 0 && globalExistingUserIds.size === 0) {
      console.log(`   → Running consolidated existence check for all ${allProfiles.length} collected profiles...`)
      try {
        globalExistingUserIds = await consolidatedUserExistenceCheck({
          memberProfiles: results.affiliatedUsers,
          searchProfiles: results.searchedUsers,
          followingProfiles: results.followingUsers,
          additionalUserIds: allProfiles.map(p => p.id_str || p.id).filter(Boolean)
        })
        console.log(`   → Found ${globalExistingUserIds.size} existing users in Neo4j`)
      } catch (error: any) {
        console.warn(`   → Error in consolidated existence check:`, error.message)
        // Fallback to treating all as non-existing
        globalExistingUserIds = new Set()
      }
    }

    // Remove the organization's own username from both sets
    allUsernames.delete(orgUsername.toLowerCase())
    
    // Also remove org profile from allProfiles array if it was added
    const orgUsernameToRemove = orgUsername.toLowerCase()
    const profilesBeforeFilter = allProfiles.length
    allProfiles.splice(0, allProfiles.length, ...allProfiles.filter(profile => 
      profile.screen_name?.toLowerCase() !== orgUsernameToRemove
    ))
    
    if (profilesBeforeFilter !== allProfiles.length) {
      console.log(`🔄 Removed organization profile from results (${profilesBeforeFilter} → ${allProfiles.length} profiles)`)
    }

    console.log(`📝 Total unique usernames collected: ${allUsernames.size}`)
    console.log(`🤖 Grok usernames needing profile fetch: ${grokUsernamesNeedingProfiles.length}`)

    // Step 4: Fetch and upsert profiles for Grok usernames (optimized)
    if (grokUsernamesNeedingProfiles.length > 0) {
      try {
        console.log('👥 Fetching profiles for Grok-discovered users...')
        
        // Optimized batch processing with increased concurrency
        const batchSize = 100
        const maxConcurrentBatches = 3 // Process multiple batches in parallel
        let fetchedProfilesCount = 0
        let failedUsernames: string[] = []
        const fetchedGrokProfiles: any[] = []
        
        // Process batches with optimal concurrency
        for (let i = 0; i < grokUsernamesNeedingProfiles.length; i += batchSize * maxConcurrentBatches) {
          const batchGroup = []
          
          // Create batch group
          for (let j = 0; j < maxConcurrentBatches && (i + j * batchSize) < grokUsernamesNeedingProfiles.length; j++) {
            const startIdx = i + j * batchSize
            const endIdx = Math.min(startIdx + batchSize, grokUsernamesNeedingProfiles.length)
            const batch = grokUsernamesNeedingProfiles.slice(startIdx, endIdx)
            batchGroup.push(batch)
          }
          
          // Process batch group in parallel
          const batchPromises = batchGroup.map(async (batch) => {
            try {
              const profileResponse = await fetch('https://api.socialapi.me/twitter/users-by-usernames', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({ usernames: batch })
              })

              if (profileResponse.ok) {
                const profileData = await profileResponse.json()
                const fetchedProfiles = profileData.users || []
                
                // Track missing profiles for fallback
                if (fetchedProfiles.length < batch.length) {
                  const fetchedUsernames = new Set(fetchedProfiles.map((p: any) => p.screen_name?.toLowerCase()))
                  const missingInBatch = batch.filter(username => !fetchedUsernames.has(username.toLowerCase()))
                  return { success: true, profiles: fetchedProfiles, failed: missingInBatch }
                }
                
                return { success: true, profiles: fetchedProfiles, failed: [] }
              } else {
                return { success: false, profiles: [], failed: batch }
              }
            } catch (error: any) {
              return { success: false, profiles: [], failed: batch }
            }
          })
          
          const batchResults = await Promise.allSettled(batchPromises)
          
          // Process batch results
          batchResults.forEach((result) => {
            if (result.status === 'fulfilled') {
              const { profiles, failed } = result.value
              allProfiles.push(...profiles)
              fetchedGrokProfiles.push(...profiles)
              fetchedProfilesCount += profiles.length
              failedUsernames.push(...failed)
            }
          })
        }

        // Fallback: Use batch function for failed usernames instead of individual requests
        if (failedUsernames.length > 0) {
          console.log(`🔄 Attempting batch fallback for ${failedUsernames.length} failed usernames...`)
          
          // Import and use the batch function from services/user.ts
          const { fetchOrganizationsBatch } = await import('@/services/user')
          
          try {
            const fallbackProfiles = await fetchOrganizationsBatch(failedUsernames)
            allProfiles.push(...fallbackProfiles)
            fetchedGrokProfiles.push(...fallbackProfiles)
            fetchedProfilesCount += fallbackProfiles.length
            
            console.log(`   ✅ Batch fallback retrieved ${fallbackProfiles.length}/${failedUsernames.length} profiles`)
          } catch (fallbackError: any) {
            console.warn(`⚠️ Batch fallback failed, trying individual requests:`, fallbackError.message)
            
            // Only as absolute last resort for small numbers
            if (failedUsernames.length <= 5) {
              const individualPromises = failedUsernames.map(async (username) => {
                try {
                  const profileResponse = await fetch(`https://api.socialapi.me/twitter/user/${username}`, {
                    headers: {
                      'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
                      'Accept': 'application/json',
                    }
                  })

                  if (profileResponse.ok) {
                    const profileData = await profileResponse.json()
                    return profileData
                  }
                  return null
                } catch (error: any) {
                  console.log(`⚠️ Individual request error for ${username}:`, error.message)
                  return null
                }
              })

              const individualResults = await Promise.allSettled(individualPromises)
              let individualSuccessCount = 0
              
              individualResults.forEach((result) => {
                if (result.status === 'fulfilled' && result.value) {
                  allProfiles.push(result.value)
                  fetchedGrokProfiles.push(result.value)
                  fetchedProfilesCount++
                  individualSuccessCount++
                }
              })
              
              console.log(`   ✅ Individual fallback retrieved ${individualSuccessCount}/${failedUsernames.length} profiles`)
            } else {
              console.log(`   ⚠️ Too many failed usernames (${failedUsernames.length}), skipping individual requests`)
            }
          }
        }

        console.log(`✅ Total fetched: ${fetchedProfilesCount} profiles from ${grokUsernamesNeedingProfiles.length} Grok usernames`)
        
        // Step 4.5: Upsert fetched Grok profiles to Neo4j (without relationships)
        if (fetchedGrokProfiles.length > 0) {
          try {
            console.log(`💾 Upserting ${fetchedGrokProfiles.length} Grok profiles to Neo4j...`)
            
            // Filter out profiles with missing IDs
            const validGrokProfiles = fetchedGrokProfiles.filter(profile => profile.id_str || profile.id)
            const invalidGrokProfilesCount = fetchedGrokProfiles.length - validGrokProfiles.length
            
            if (invalidGrokProfilesCount > 0) {
              console.warn(`   → Filtered out ${invalidGrokProfilesCount} Grok profiles with missing IDs`)
            }
            
            if (validGrokProfiles.length > 0) {
              const grokUsersToUpsert = validGrokProfiles.map(profile => transformToNeo4jUser(profile))
              const result = await createOrUpdateUsersOptimized(grokUsersToUpsert, 1080) // 45 day staleness
              console.log(`   → Grok profiles: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`)
            }
          } catch (grokUpsertError: any) {
            console.warn(`   → Error upserting Grok profiles to Neo4j: ${grokUpsertError.message}`)
            results.errors.push(`Grok profiles upsert error: ${grokUpsertError.message}`)
          }
        }
      } catch (error: any) {
        const errorMsg = `Error fetching Grok profiles: ${error.message}`
        console.error('❌', errorMsg)
        results.errors.push(errorMsg)
      }
    }

    // Step 5: Combined profile filtering and categorization (optimized single pass)
    console.log('🏢 Filtering and categorizing profiles in single pass...')
    console.log(`   📝 Organization name variations: ${globalOrgVariations.join(', ')}`)
    
    // Define generic words that should require more specific matching
    const genericWords = new Set([
      'foundation', 'labs', 'technologies', 'crypto', 'blockchain', 
      'onchain', 'protocol', 'network', 'solutions', 'systems', 'platform',
      'company', 'corp', 'corporation', 'inc', 'llc', 'ltd',
      'global', 'international', 'ventures', 'capital', 'fund',
      'studio', 'agency', 'consulting', 'services', 'partners',
      'project', 'ecosystem', 'community', 'dao', 'defi', 'nft', 'web3',
      'innovation', 'research', 'development', 'security', 'finance',
      'exchange', 'wallet', 'token', 'coin', 'chain', 'verse', 'world'
    ])

    // Regional/country indicators
    const regionalIndicators = [
      // Countries
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

    // Helper function to check for additional context when generic words are found
    const checkForAdditionalContext = (searchableText: string, genericVariation: string, allVariations: string[]): boolean => {
      // Check if multiple organization variations appear together
      const otherVariations = allVariations.filter(v => v !== genericVariation && !genericWords.has(v.toLowerCase()))
      
      for (const otherVariation of otherVariations) {
        const otherWordBoundaryRegex = new RegExp(`\\b${otherVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        const otherSeparatorRegex = new RegExp(`(^|[\\s\\-_@\\.])${otherVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-_@\\.])`,'i')
        
        if (otherWordBoundaryRegex.test(searchableText) || otherSeparatorRegex.test(searchableText)) {
          return true // Found another non-generic variation in the same profile
        }
      }
      
      // Check for proximity - generic word should be close to other specific terms
      const genericWordRegex = new RegExp(`\\b${genericVariation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      const match = genericWordRegex.exec(searchableText)
      
      if (match) {
        const matchPosition = match.index
        const contextWindow = 50 // characters before and after
        const contextStart = Math.max(0, matchPosition - contextWindow)
        const contextEnd = Math.min(searchableText.length, matchPosition + match[0].length + contextWindow)
        const context = searchableText.substring(contextStart, contextEnd)
        
        // Look for organization username or other specific identifiers in close proximity
        const orgUsernameInContext = orgUsername.toLowerCase()
        if (context.includes(orgUsernameInContext)) {
          return true
        }
        
        // Check for exact phrase matches that include the generic word
        const orgName = results.orgProfile?.name?.toLowerCase() || ''
        if (orgName && context.includes(orgName)) {
          return true
        }
      }
      
      return false
    }

    // Combined comprehensive profile filter
    const analyzeProfile = (profile: any): { 
      accepted: boolean, 
      rejectionReason?: string, 
      relevanceReason?: string 
    } => {
      // 1. Spam filter check
      const followers = profile.followers_count || 0
      const following = profile.friends_count || 0
      const isValidProfile = followers >= 10 || following >= 10
      
      if (!isValidProfile) {
        return { accepted: false, rejectionReason: 'spam_filtered' }
      }

      // 2. Organization account detection
      if (profile.verification_info?.type === 'Business') {
        return { accepted: false, rejectionReason: 'organization_account' }
      }

      // 3. Regional/functional account detection
      const name = (profile.name || '').toLowerCase()
      const screenName = (profile.screen_name || '').toLowerCase()
      
      // More precise regional checking - avoid false positives like "scindia"
      const hasRegionalIndicator = regionalIndicators.some(indicator => {
        // For sensitive country names, be more strict about word boundaries and context
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
      
      // Additional pattern checks for common organizational account structures (more specific)
      const organizationalPatterns = [
        // Pattern: @orgname_country or @orgnameCountry (with required separators)
        new RegExp(`\\b${orgUsername.toLowerCase()}[_\\s]+(india|china|japan|usa|uk|apac|emea|latam)\\b`, 'i'),
        // Pattern: @orgname_function or @orgnameFunction  
        new RegExp(`\\b${orgUsername.toLowerCase()}[_\\s]+(support|help|news|jobs|dev)\\b`, 'i'),
        // Pattern: @countryOrgname or @functionOrgname (with required separators)
        new RegExp(`\\b(india|china|japan|usa|uk|apac|emea|latam)[_\\s]+${orgUsername.toLowerCase()}\\b`, 'i'),
        new RegExp(`\\b(support|help|news|jobs|dev)[_\\s]+${orgUsername.toLowerCase()}\\b`, 'i'),
        // Pattern: country/function as suffix with clear concatenation
        new RegExp(`\\b${orgUsername.toLowerCase()}(india|china|japan|usa|uk|apac|emea|latam|support|help|news|jobs|dev)$`, 'i'),
        // Pattern: country/function as prefix with clear concatenation
        new RegExp(`^(india|china|japan|usa|uk|apac|emea|latam|support|help|news|jobs|dev)${orgUsername.toLowerCase()}\\b`, 'i')
      ]
      
      const hasOrganizationalPattern = organizationalPatterns.some(pattern => 
        pattern.test(name) || pattern.test(screenName)
      )
      
      if (hasRegionalIndicator || hasFunctionalIndicator || hasOrganizationalPattern) {
        console.log(`     🏢 @${profile.screen_name} - ORGANIZATIONAL ACCOUNT (regional/functional)`)
        return { accepted: false, rejectionReason: 'regional_or_functional_account' }
      }

      // 4. Organization relevance check (combined with filtering)
      // Always accept official affiliates (they were fetched from the org's official affiliates list)
      const isOfficialAffiliate = results.affiliatedUsers.some(affiliate => 
        affiliate.screen_name?.toLowerCase() === profile.screen_name?.toLowerCase()
      )
      
      if (isOfficialAffiliate) {
        return { accepted: true, relevanceReason: 'official_affiliate' }
      }
      
      // Check for organization name variations in user's profile
      const searchableText = [
        profile.name || '',
        profile.description || '',
        profile.screen_name || ''
      ].join(' ').toLowerCase()
      
      for (const variation of globalOrgVariations) {
        const isGenericWord = genericWords.has(variation.toLowerCase())
        
        // Create word boundary regex for proper matching
        const wordBoundaryRegex = new RegExp(`\\b${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        // Also check for exact matches with common separators
        const separatorRegex = new RegExp(`(^|[\\s\\-_@\\.])${variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[\\s\\-_@\\.])`,'i')
        
        const hasMatch = wordBoundaryRegex.test(searchableText) || separatorRegex.test(searchableText)
        
        if (hasMatch) {
          if (isGenericWord) {
            // For generic words, require additional validation
            const hasAdditionalContext = checkForAdditionalContext(searchableText, variation, globalOrgVariations)
            
            if (hasAdditionalContext) {
              return { accepted: true, relevanceReason: `name_match_${variation}_with_context` }
            } else {
              // Continue checking other variations instead of rejecting immediately
              continue
            }
          } else {
            return { accepted: true, relevanceReason: `name_match_${variation}` }
          }
        }
      }
      
      return { accepted: false, rejectionReason: 'no_org_name_match' }
    }

    // Apply combined filter in single pass
    const relevantIndividuals: any[] = []
    const rejectedProfiles: any[] = []

    allProfiles.forEach((profile) => {
      const analysis = analyzeProfile(profile)
      
      if (analysis.accepted) {
        profile._relevance_reason = analysis.relevanceReason
        relevantIndividuals.push(profile)
      } else {
        profile._rejection_reason = analysis.rejectionReason
        rejectedProfiles.push(profile)
      }
    })

    console.log(`✅ Combined profile filtering complete:`)
    console.log(`   ✅ Relevant individuals: ${relevantIndividuals.length}`)
    console.log(`   ❌ Total rejected profiles: ${rejectedProfiles.length}`)
    console.log(`     - Spam filtered: ${rejectedProfiles.filter(p => p._rejection_reason === 'spam_filtered').length}`)
    console.log(`     - Organization accounts: ${rejectedProfiles.filter(p => p._rejection_reason === 'organization_account').length}`)
    console.log(`     - Regional/functional accounts: ${rejectedProfiles.filter(p => p._rejection_reason === 'regional_or_functional_account').length}`)
    console.log(`     - Not organization relevant: ${rejectedProfiles.filter(p => p._rejection_reason === 'no_org_name_match').length}`)

    // Initialize counters for Grok analysis
    let totalOrgsFound = 0
    let totalAnalyzed = 0

    // Step 5.5: Early filtering and comprehensive user data check (OPTIMIZED)
    console.log('🔍 Step 5.5: Early filtering and comprehensive user data collection...')
    
    let finalIndividuals: any[] = []
    let grokAnalysisMetadata: any[] = []
    let usersNeedingGrokAnalysis: any[] = []
    let usersWithExistingRelationships: any[] = []
    let usersIdentifiedAsOrganizations: any[] = []
    let grokIdentifiedOrganizations: Array<{
      screenName: string, 
      profile: any,
      classification?: {
        org_type?: string,
        org_subtype?: string,
        web3_focus?: string
      }
    }> = []

    // First, process existing employees as source of truth
    console.log(`   → Processing ${results.existingEmployees.length} existing employees as source of truth...`)
    const existingEmployeeUserIds = new Set<string>()
    
    if (results.existingEmployees.length > 0) {
      results.existingEmployees.forEach(employee => {
        existingEmployeeUserIds.add(employee.userId)
        
        // Convert employee data to expected format and add to final individuals
        const employeeProfile = {
          id: employee.userId,
          id_str: employee.userId,
          screen_name: employee.screenName,
          name: employee.name,
          description: employee.description,
          location: employee.location,
          url: employee.url,
          profile_image_url_https: employee.profileImageUrl,
          followers_count: employee.followersCount,
          friends_count: employee.followingCount,
          verified: employee.verified,
          created_at: employee.createdAt,
          listed_count: employee.listedCount,
          statuses_count: employee.statusesCount,
          favourites_count: employee.favouritesCount,
          protected: employee.protected,
          can_dm: employee.canDm,
          profile_banner_url: employee.profileBannerUrl,
          verification_info: {
            type: employee.verificationType,
            reason: employee.verificationReason
          },
          _relevance_reason: 'existing_works_at_relationship',
          _employment_data: {
            current_organizations: [orgUsername],
            department: employee.department || 'other',
            past_organizations: []
          }
        }
        
        finalIndividuals.push(employeeProfile)
        usersWithExistingRelationships.push(employeeProfile)
      })
      
      console.log(`   → ✅ Added ${results.existingEmployees.length} existing employees directly to final results (skipping all analysis)`)
    }

    if (relevantIndividuals.length > 0 && results.orgProfile?.id_str) {
      try {
        // Filter out existing employees from relevant individuals before processing
        const relevantIndividualsToProcess = relevantIndividuals.filter(profile => {
          const userId = profile.id_str || profile.id
          return !existingEmployeeUserIds.has(userId)
        })
        
        console.log(`   → Filtered out ${relevantIndividuals.length - relevantIndividualsToProcess.length} existing employees from analysis pipeline`)
        console.log(`   → Processing ${relevantIndividualsToProcess.length} remaining individuals for comprehensive data check`)
        
        // Get user IDs from filtered relevant individuals
        const userIds = relevantIndividualsToProcess
          .filter(profile => profile.id_str || profile.id)
          .map(profile => profile.id_str || profile.id)
        
        if (userIds.length > 0) {
          console.log(`   → Using optimized batch employment data check for ${userIds.length} relevant individuals...`)
          
          // Use the new batch function instead of comprehensive query
          const classificationResults = await batchCheckUserEmploymentData(userIds, results.orgProfile.id_str)
          
          // Process results and categorize users
          const existingEmployeeUserIds = new Set(classificationResults.existingEmployees)
          const hasEmploymentDataUserIds = new Set(classificationResults.hasEmploymentData) 
          const needsGrokAnalysisUserIds = new Set(classificationResults.needsGrokAnalysis)
          
          // Categorize profiles based on batch results
          relevantIndividualsToProcess.forEach(profile => {
            const userId = profile.id_str || profile.id
            
            if (existingEmployeeUserIds.has(userId)) {
              // Already an employee of this org
              finalIndividuals.push(profile)
              usersWithExistingRelationships.push(profile)
            } else if (hasEmploymentDataUserIds.has(userId)) {
              // Has employment data with other organizations
              finalIndividuals.push(profile)
              usersWithExistingRelationships.push(profile)
            } else if (needsGrokAnalysisUserIds.has(userId)) {
              // Needs Grok analysis
              usersNeedingGrokAnalysis.push(profile)
            }
          })
          
          console.log(`   → ✅ Batch employment check complete:`)
          console.log(`   🏢 Existing employees: ${classificationResults.existingEmployees.length}`)
          console.log(`   ⚡ Skip Grok (has employment data): ${classificationResults.hasEmploymentData.length}`)
          console.log(`   🤖 Needs Grok analysis: ${classificationResults.needsGrokAnalysis.length}`)
          console.log(`   📈 Total Grok analysis reduction: ${Math.round(((classificationResults.existingEmployees.length + classificationResults.hasEmploymentData.length) / (relevantIndividualsToProcess.length || 1)) * 100)}%`)
          
        } else {
          console.log('   → No valid user IDs found for batch employment check')
          usersNeedingGrokAnalysis = relevantIndividualsToProcess
        }
      } catch (batchCheckError: any) {
        console.warn(`⚠️ Error in batch employment check:`, batchCheckError.message)
        results.errors.push(`Batch employment check error: ${batchCheckError.message}`)
        // Fallback: send all users (except existing employees) to Grok analysis
        usersNeedingGrokAnalysis = relevantIndividuals.filter(profile => {
          const userId = profile.id_str || profile.id
          return !existingEmployeeUserIds.has(userId)
        })
      }
    } else {
      console.log('   → No relevant individuals or org profile for batch check')
      // Exclude existing employees from fallback analysis
      usersNeedingGrokAnalysis = relevantIndividuals.filter(profile => {
        const userId = profile.id_str || profile.id
        return !existingEmployeeUserIds.has(userId)
      })
    }

    // Step 5.6: Grok analysis for remaining users only (OPTIMIZED)
    console.log('🤖 Step 5.6: Grok analysis for users without existing employment data...')

    if (usersNeedingGrokAnalysis.length > 0) {
      console.log(`   → Only ${usersNeedingGrokAnalysis.length} users need Grok analysis (saved ${usersWithExistingRelationships.length + usersIdentifiedAsOrganizations.length} expensive AI calls)`)
      
      try {
        const batchSize = 5 // Further reduced batch size to avoid token limits
        
        // Create all batches first
        const batches: Array<{
          profiles: any[],
          batchNumber: number,
          size: number
        }> = []
        for (let i = 0; i < usersNeedingGrokAnalysis.length; i += batchSize) {
          const batch = usersNeedingGrokAnalysis.slice(i, i + batchSize)
          const batchNumber = Math.floor(i / batchSize) + 1
          batches.push({
            profiles: batch,
            batchNumber,
            size: batch.length
          })
        }
        
        const totalBatches = batches.length
        console.log(`   → Processing ${totalBatches} batches in parallel (${usersNeedingGrokAnalysis.length} total profiles)`)
        
        // Process all batches in parallel (same as before)
        const batchPromises = batches.map(async (batchInfo) => {
          try {
            console.log(`   → Starting batch ${batchInfo.batchNumber}/${totalBatches} (${batchInfo.size} profiles)`)
            
            // Prepare batch data for Grok
            const batchProfiles = batchInfo.profiles.map(profile => ({
              screen_name: profile.screen_name,
              name: profile.name || '',
              description: profile.description || ''
            }))
            
            // Analyze with Grok using unified function
            const analysisResults = await classifyProfilesWithGrok(batchProfiles) as any[]
            
            // Convert to expected format with flattened structure
            const analysis = {
              profiles: analysisResults.map(result => ({
                screen_name: result.screen_name,
                vibe: result.vibe,
                current_organizations: result.current_organizations,
                department: result.department,
                past_organizations: result.past_organizations,
                org_type: result.org_type,
                org_subtype: result.org_subtype,
                web3_focus: result.web3_focus
              }))
            }
            
            console.log(`   → Completed batch ${batchInfo.batchNumber}/${totalBatches}`)
            
            return {
              batchNumber: batchInfo.batchNumber,
              originalProfiles: batchInfo.profiles,
              analysis,
              success: true,
              error: null
            }
            
          } catch (batchError: any) {
            console.warn(`   → ⚠️  Batch ${batchInfo.batchNumber} failed:`, batchError.message)
            return {
              batchNumber: batchInfo.batchNumber,
              originalProfiles: batchInfo.profiles,
              analysis: null,
              success: false,
              error: batchError.message
            }
          }
        })
        
        // Wait for all batches to complete
        const batchResults = await Promise.allSettled(batchPromises)
        
        // Process all results (same logic as before)
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const batchResult = result.value
            
            if (batchResult && batchResult.success && batchResult.analysis && batchResult.analysis.profiles && Array.isArray(batchResult.analysis.profiles) && batchResult.originalProfiles && Array.isArray(batchResult.originalProfiles)) {
              // Process successful analysis
              batchResult.analysis.profiles.forEach((analyzed: any, idx: number) => {
                const originalProfile = batchResult.originalProfiles[idx]
                
                if (!originalProfile || !analyzed) return
                
                if (analyzed.vibe === 'organization') {
                  // Grok identified this as an organization - handle appropriately
                  originalProfile._rejection_reason = 'grok_identified_organization'
                  rejectedProfiles.push(originalProfile)
                  totalOrgsFound++
                  console.log(`     🏢 @${analyzed.screen_name || originalProfile.screen_name} - ORGANIZATION (will check/update in Neo4j)`)
                  
                  // Collect organization for Neo4j processing with enhanced classification
                  if (!grokIdentifiedOrganizations) {
                    grokIdentifiedOrganizations = []
                  }
                  grokIdentifiedOrganizations.push({
                    screenName: analyzed.screen_name || originalProfile.screen_name,
                    profile: originalProfile,
                    classification: {
                      org_type: analyzed.org_type,
                      org_subtype: analyzed.org_subtype,
                      web3_focus: analyzed.web3_focus
                    }
                  })
                } else if (analyzed.vibe === 'spam') {
                  // Mark as spam and reject
                  originalProfile._rejection_reason = 'grok_identified_spam'
                  rejectedProfiles.push(originalProfile)
                  console.log(`     🚫 @${analyzed.screen_name || originalProfile.screen_name} - SPAM`)
                } else {
                  // Keep as individual and store flattened employment data directly
                  originalProfile._employment_data = {
                    current_organizations: analyzed.current_organizations || [],
                    department: analyzed.department || 'other',
                    past_organizations: analyzed.past_organizations || []
                  }
                  finalIndividuals.push(originalProfile)
                  console.log(`     👤 @${analyzed.screen_name || originalProfile.screen_name} - INDIVIDUAL`)
                }
              })
              
              totalAnalyzed += batchResult.originalProfiles.length
              
              // Store batch metadata
              const validProfiles = batchResult.analysis.profiles.filter((p: any) => p != null)
              const orgCount = validProfiles.filter((p: any) => p.vibe === 'organization').length
              const indCount = validProfiles.filter((p: any) => p.vibe === 'individual').length
              const spamCount = validProfiles.filter((p: any) => p.vibe === 'spam').length
              
              grokAnalysisMetadata.push({
                batch: batchResult.batchNumber || index + 1,
                profiles_analyzed: batchResult.originalProfiles.length,
                organizations_found: orgCount,
                individuals_found: indCount
              })
              
            } else {
              // Handle failed batch - safely handle profiles
              console.warn(`   → ⚠️  Batch ${index + 1} failed or returned invalid data`)
              if (batchResult && batchResult.originalProfiles && Array.isArray(batchResult.originalProfiles)) {
                batchResult.originalProfiles.forEach(profile => {
                  if (profile && typeof profile === 'object') {
                    profile._employment_data = {
                      current_organizations: null,
                      department: 'other',
                      past_organizations: []
                    }
                    finalIndividuals.push(profile)
                  }
                })
                const errorMsg = batchResult.error || 'Unknown batch error'
                const batchNum = batchResult.batchNumber || index + 1
                results.errors.push(`Grok analysis failed for batch ${batchNum}: ${errorMsg}`)
              } else {
                console.error(`   → ❌ Batch ${index + 1} has no valid originalProfiles to recover`)
                results.errors.push(`Batch ${index + 1} failed completely - no profiles to recover`)
              }
            }
          } else {
            console.error(`   → ❌ Batch promise ${index + 1} rejected:`, result.reason)
            results.errors.push(`Batch ${index + 1} promise failed: ${result.reason?.message || 'Unknown error'}`)
            
            // Try to recover profiles from the original batch if possible
            const batchIndex = index
            if (batchIndex < batches.length) {
              const originalBatch = batches[batchIndex]
              if (originalBatch && originalBatch.profiles && Array.isArray(originalBatch.profiles)) {
                originalBatch.profiles.forEach((profile: any) => {
                  if (profile && typeof profile === 'object') {
                    profile._employment_data = {
                      current_organizations: null,
                      department: 'other',
                      past_organizations: []
                    }
                    finalIndividuals.push(profile)
                  }
                })
              }
            }
          }
        })
        
        console.log(`✅ Grok analysis complete:`)
        console.log(`   📊 Total analyzed: ${totalAnalyzed} profiles`)
        console.log(`   👤 New individuals from Grok: ${totalAnalyzed}`)
        console.log(`   🏢 Organizations found and rejected: ${totalOrgsFound}`)
        console.log(`   ⚡ Total AI calls saved: ${usersWithExistingRelationships.length + usersIdentifiedAsOrganizations.length}`)
        
      } catch (grokError: any) {
        console.error('❌ Grok analysis failed completely:', grokError.message)
        results.errors.push(`Grok analysis error: ${grokError.message}`)
        // Fallback: use all users without enrichment
        usersNeedingGrokAnalysis.forEach(profile => {
          if (profile && typeof profile === 'object') {
            profile._employment_data = {
              current_organizations: null,
              department: 'other',
              past_organizations: []
            }
            finalIndividuals.push(profile)
          }
        })
      }
    } else {
      console.log('   → No profiles need Grok analysis - all have existing employment data!')
    }

    // Step 5.7: Process Grok-identified organizations
    if (grokIdentifiedOrganizations.length > 0) {
      console.log(`🏢 Step 5.7: Processing ${grokIdentifiedOrganizations.length} organizations identified by Grok...`)
      
      try {
        // Extract screen names for batch checking
        const orgScreenNames = grokIdentifiedOrganizations.map(org => org.screenName)
        
        // Check which organizations already exist in Neo4j
        const existingOrgs = await getUsersByScreenNames(orgScreenNames)
        const existingOrgMap = new Map()
        existingOrgs.forEach(org => {
          existingOrgMap.set(org.screenName.toLowerCase(), org)
        })
        
        // Separate existing and new organizations
        const orgsToUpdate: Array<{
          screenName: string, 
          userId: string,
          classification?: {
            org_type?: string,
            org_subtype?: string,
            web3_focus?: string
          }
        }> = []
        const orgsToFetch: Array<{
          screenName: string, 
          profile: any,
          classification?: {
            org_type?: string,
            org_subtype?: string,
            web3_focus?: string
          }
        }> = []
        
        grokIdentifiedOrganizations.forEach(({ screenName, profile, classification }) => {
          const existingOrg = existingOrgMap.get(screenName.toLowerCase())
          
          if (existingOrg) {
            // Organization exists - always update classification if we have new data from Grok
            if (classification && (classification.org_type || classification.org_subtype || classification.web3_focus)) {
              orgsToUpdate.push({
                screenName: existingOrg.screenName,
                userId: existingOrg.userId,
                classification
              })
              console.log(`     🔄 @${screenName} - EXISTS, will update classification data`)
            } else if (existingOrg.vibe !== 'organization') {
              orgsToUpdate.push({
                screenName: existingOrg.screenName,
                userId: existingOrg.userId,
                classification: {
                  org_type: 'service',
                  org_subtype: 'other',
                  web3_focus: 'traditional'
                }
              })
              console.log(`     🔄 @${screenName} - EXISTS, will update vibe to 'organization'`)
            } else {
              console.log(`     ✅ @${screenName} - EXISTS, no updates needed`)
            }
          } else {
            // Organization doesn't exist - fetch and store
            orgsToFetch.push({ screenName, profile, classification })
            console.log(`     🆕 @${screenName} - NEW, will fetch and store`)
          }
        })
        
        // Update vibes and classification for existing organizations
        if (orgsToUpdate.length > 0) {
          console.log(`   → Updating vibe and classification for ${orgsToUpdate.length} existing organizations...`)
          
          try {
            // Prepare data for organization classification update
            const orgClassificationUpdates = orgsToUpdate.map(org => ({
              userId: org.userId,
              classification: org.classification || {
                org_type: 'service',
                org_subtype: 'other',
                web3_focus: 'traditional'
              }
            }))
            
            // Update organization classification (includes vibe update)
            await updateOrganizationClassification(orgClassificationUpdates)
            
            if (!results.meta) results.meta = {}
            results.meta.grokOrganizationsUpdated = orgsToUpdate.length
            console.log(`   ✅ Updated ${orgsToUpdate.length} existing organizations`)
            
          } catch (updateError: any) {
            console.error('   ❌ Error updating existing organizations:', updateError)
            results.errors.push(`Failed to update existing organizations: ${updateError.message}`)
          }
        }
        
        // Fetch and store new organizations
        if (orgsToFetch.length > 0) {
          console.log(`   → Fetching ${orgsToFetch.length} new organizations from SocialAPI...`)
          
          const fetchPromises = orgsToFetch.map(async ({ screenName, profile, classification }) => {
            try {
              // Try to fetch fresh profile data
              const response = await fetch(`https://api.socialapi.me/twitter/user/${screenName}`, {
                headers: {
                  'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
                  'Accept': 'application/json',
                }
              })
              
              if (response.ok) {
                const freshOrgProfile = await response.json()
                return { success: true, profile: freshOrgProfile, fallbackProfile: profile, classification }
              } else {
                console.warn(`   → Failed to fetch @${screenName}: ${response.status}, using existing profile data`)
                return { success: false, profile: null, fallbackProfile: profile, classification }
              }
            } catch (error: any) {
              console.warn(`   → Error fetching @${screenName}:`, error.message)
              return { success: false, profile: null, fallbackProfile: profile, classification }
            }
          })
          
          const fetchResults = await Promise.allSettled(fetchPromises)
          const organizationsToStore: Array<{profile: any, classification?: any}> = []
          
          fetchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              const { success, profile, fallbackProfile, classification } = result.value
              const profileToUse = success ? profile : fallbackProfile
              
              if (profileToUse && (profileToUse.id_str || profileToUse.id)) {
                organizationsToStore.push({ profile: profileToUse, classification })
                const source = success ? 'fresh API data' : 'existing profile data'
                console.log(`     ✅ @${profileToUse.screen_name} - prepared for storage (${source})`)
              } else {
                console.warn(`     ❌ @${orgsToFetch[index].screenName} - no valid profile data available`)
              }
            } else {
              console.warn(`     ❌ @${orgsToFetch[index].screenName} - fetch promise failed`)
            }
          })
          
          // Store organizations with vibe='organization' and classification data
          if (organizationsToStore.length > 0) {
            const orgUsersToUpsert = organizationsToStore.map(({ profile, classification }) => {
              const orgUser = transformToNeo4jUser(profile)
              orgUser.vibe = 'organization' // Set vibe to organization
              
              // Apply classification data if available
              if (classification) {
                orgUser.org_type = classification.org_type || 'service'
                orgUser.org_subtype = classification.org_subtype || 'other'
                orgUser.web3_focus = classification.web3_focus || 'traditional'
              } else {
                orgUser.org_type = 'service'
                orgUser.org_subtype = 'other'
                orgUser.web3_focus = 'traditional'
              }
              
              return orgUser
            })
            
            const result = await createOrUpdateUsersOptimized(orgUsersToUpsert, 1080) // 45 day staleness
            console.log(`   → Organizations: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`)
          }
        }
        
        console.log(`✅ Grok-identified organization processing complete`)
        
      } catch (orgProcessingError: any) {
        console.error('❌ Error processing Grok-identified organizations:', orgProcessingError.message)
        results.errors.push(`Organization processing error: ${orgProcessingError.message}`)
      }
    }

    console.log(`📊 Final analysis summary:`)
    console.log(`   👥 Existing employees (source of truth): ${results.existingEmployees.length}`)
    console.log(`   🏢 Users pre-identified as organizations: ${usersIdentifiedAsOrganizations.length}`)
    console.log(`   🏢 Organizations identified by Grok: ${grokIdentifiedOrganizations.length}`)
    console.log(`   ✅ Users with existing employment data: ${usersWithExistingRelationships.length}`)
    console.log(`   🤖 Users processed by Grok: ${usersNeedingGrokAnalysis.length}`)
    console.log(`   👤 Total final individuals: ${finalIndividuals.length}`)
    console.log(`   📈 Updated total rejected: ${rejectedProfiles.length}`)
    console.log(`   💰 Total expensive AI calls saved: ${results.existingEmployees.length + usersWithExistingRelationships.length + usersIdentifiedAsOrganizations.length}`)

    // Update results with the Grok-analyzed profile collection
    results.allProfiles = finalIndividuals

    // Step 5.8: Unified Batch Storage Operation (OPTIMIZED)
    console.log('💾 Step 5.8: Unified batch storage operation...')
    
    // Declare variables outside try block for accessibility in employment processing
    let allUsersToStore: any[] = []
    let finalIndividualsToStore: any[] = []
    
    try {
      // ===== PREPARE ALL DATA FOR BATCH STORAGE =====
      
      // 1. Prepare rejected profiles with appropriate vibes
      const rejectedByReason = {
        spam_filtered: rejectedProfiles.filter(p => p._rejection_reason === 'spam_filtered'),
        organization_account: rejectedProfiles.filter(p => p._rejection_reason === 'organization_account'),
        regional_or_functional_account: rejectedProfiles.filter(p => p._rejection_reason === 'regional_or_functional_account'),
        grok_identified_organization: rejectedProfiles.filter(p => p._rejection_reason === 'grok_identified_organization'),
        already_identified_as_organization: rejectedProfiles.filter(p => p._rejection_reason === 'already_identified_as_organization'),
        no_org_name_match: rejectedProfiles.filter(p => p._rejection_reason === 'no_org_name_match')
      }
      
      console.log(`   → Preparing rejected profiles by category:`)
      console.log(`     - Spam filtered: ${rejectedByReason.spam_filtered.length}`)
      console.log(`     - Business verification: ${rejectedByReason.organization_account.length}`)
      console.log(`     - Regional/functional: ${rejectedByReason.regional_or_functional_account.length}`)
      console.log(`     - Grok-identified orgs: ${rejectedByReason.grok_identified_organization.length}`)
      console.log(`     - Pre-identified orgs: ${rejectedByReason.already_identified_as_organization.length}`)
      console.log(`     - No org match: ${rejectedByReason.no_org_name_match.length}`)
      
      const rejectedUsersToStore: any[] = []
      
      // Process spam users - set vibe to 'spam'
      rejectedByReason.spam_filtered.forEach(profile => {
        if (profile.id_str || profile.id) {
          const neo4jUser = transformToNeo4jUser(profile)
          // Validate and set vibe to 'spam'
          const vibeValidation = validateVibe(VibeType.SPAM)
          if (!vibeValidation.isValid) {
            logValidationError('vibe', VibeType.SPAM, vibeValidation.error!, `spam_filtered for user ${profile.id_str || profile.id}`)
          }
          neo4jUser.vibe = vibeValidation.sanitizedValue
          rejectedUsersToStore.push(neo4jUser)
        }
      })
      
      // Process business verification users - set vibe to 'organization'
      rejectedByReason.organization_account.forEach(profile => {
        if (profile.id_str || profile.id) {
          const neo4jUser = transformToNeo4jUser(profile)
          // Validate and set vibe to 'organization'
          const vibeValidation = validateVibe(VibeType.ORGANIZATION)
          if (!vibeValidation.isValid) {
            logValidationError('vibe', VibeType.ORGANIZATION, vibeValidation.error!, `organization_account for user ${profile.id_str || profile.id}`)
          }
          neo4jUser.vibe = vibeValidation.sanitizedValue
          rejectedUsersToStore.push(neo4jUser)
        }
      })
      
      // Process regional/functional accounts - set vibe to 'organization'
      rejectedByReason.regional_or_functional_account.forEach(profile => {
        if (profile.id_str || profile.id) {
          const neo4jUser = transformToNeo4jUser(profile)
          // Validate and set vibe to 'organization'
          const vibeValidation = validateVibe(VibeType.ORGANIZATION)
          if (!vibeValidation.isValid) {
            logValidationError('vibe', VibeType.ORGANIZATION, vibeValidation.error!, `regional_or_functional_account for user ${profile.id_str || profile.id}`)
          }
          neo4jUser.vibe = vibeValidation.sanitizedValue
          rejectedUsersToStore.push(neo4jUser)
        }
      })
      
      // Process Grok-identified organizations - set vibe to 'organization'
      rejectedByReason.grok_identified_organization.forEach(profile => {
        if (profile.id_str || profile.id) {
          const neo4jUser = transformToNeo4jUser(profile)
          // Validate and set vibe to 'organization'
          const vibeValidation = validateVibe(VibeType.ORGANIZATION)
          if (!vibeValidation.isValid) {
            logValidationError('vibe', VibeType.ORGANIZATION, vibeValidation.error!, `grok_identified_organization for user ${profile.id_str || profile.id}`)
          }
          neo4jUser.vibe = vibeValidation.sanitizedValue
          rejectedUsersToStore.push(neo4jUser)
        }
      })
      
      // Process users with no org name match - store without special vibe
      rejectedByReason.no_org_name_match.forEach(profile => {
        if (profile.id_str || profile.id) {
          const neo4jUser = transformToNeo4jUser(profile)
          rejectedUsersToStore.push(neo4jUser)
        }
      })
      
      // 2. Prepare final individuals (accepted users) - set vibe and extract roles
      finalIndividualsToStore = finalIndividuals
        .filter(profile => profile.id_str || profile.id)
        .map(profile => {
          const neo4jUser = transformToNeo4jUser(profile)
          
          // Validate and set vibe to 'individual' for all final individuals
          const vibeValidation = validateVibe(VibeType.INDIVIDUAL)
          if (!vibeValidation.isValid) {
            logValidationError('vibe', VibeType.INDIVIDUAL, vibeValidation.error!, `finalIndividualsToStore for user ${profile.id_str || profile.id}`)
          }
          neo4jUser.vibe = vibeValidation.sanitizedValue
          
          // Extract department from flattened employment data if available
          if (profile._employment_data?.department) {
            neo4jUser.department = profile._employment_data.department
          }
          
          return neo4jUser
        })
      
      // 3. Prepare affiliated users and following users
      const affiliatedUsersToStore = results.affiliatedUsers
        .filter(user => (user.id_str || user.id) && !globalExistingUserIds.has(user.id_str || user.id))
        .map(user => transformToNeo4jUser(user))
      
      const followingUsersToStore = results.followingUsers
        .filter(user => (user.id_str || user.id) && !globalExistingUserIds.has(user.id_str || user.id))
        .map(user => transformToNeo4jUser(user))
      
      // 4. Prepare organization profile
      const orgUserToStore = results.orgProfile && (results.orgProfile.id_str || results.orgProfile.id) 
        ? [transformToNeo4jUser(results.orgProfile)]
        : []
      
      // 5. Combine all users for batch storage
      allUsersToStore = [
        ...rejectedUsersToStore,
        ...finalIndividualsToStore,
        ...affiliatedUsersToStore,
        ...followingUsersToStore,
        ...orgUserToStore
      ]
      
      console.log(`   → Prepared ${allUsersToStore.length} total users for batch storage:`)
      console.log(`     - Rejected profiles: ${rejectedUsersToStore.length}`)
      console.log(`     - Final individuals: ${finalIndividualsToStore.length}`)
      console.log(`     - Affiliated users: ${affiliatedUsersToStore.length}`)
      console.log(`     - Following users: ${followingUsersToStore.length}`)
      console.log(`     - Organization: ${orgUserToStore.length}`)
      
      // ===== EXECUTE BATCH STORAGE =====
      
      // Store all users in single batch operation
      if (allUsersToStore.length > 0) {
        console.log(`   → Executing batch storage for ${allUsersToStore.length} users...`)
        const userStorageResult = await createOrUpdateUsersOptimized(allUsersToStore, 1080)
        console.log(`   → Batch user storage: ${userStorageResult.created} created, ${userStorageResult.updated} updated, ${userStorageResult.skipped} skipped`)
        
        // Log breakdown by type
        const vibeBreakdown = {
          spam: allUsersToStore.filter(u => u.vibe === 'spam').length,
          organization: allUsersToStore.filter(u => u.vibe === 'organization').length,
          regular: allUsersToStore.filter(u => !u.vibe || (u.vibe !== 'spam' && u.vibe !== 'organization')).length
        }
        console.log(`     - Spam vibe: ${vibeBreakdown.spam}`)
        console.log(`     - Organization vibe: ${vibeBreakdown.organization}`)
        console.log(`     - Regular/Individual: ${vibeBreakdown.regular}`)
      } else {
        console.log(`   → No users to store in batch operation`)
      }
      
      console.log(`✅ Unified batch storage operation completed successfully`)
      
    } catch (batchStorageError: any) {
      console.error('❌ Unified batch storage failed:', batchStorageError.message)
      results.errors.push(`Unified batch storage error: ${batchStorageError.message}`)
      // Continue with employment data processing even if batch storage failed
      console.log(`🔄 Continuing with employment data processing despite batch storage failure...`)
    }

    // ===== PROCESS EMPLOYMENT DATA =====
    // This runs regardless of batch storage success/failure
    
    console.log(`   → Processing employment data for ${finalIndividuals.length} individuals...`)
    
    try {
      // Add small delay to prevent deadlocks after batch storage
      if (allUsersToStore.length > 0) {
        console.log(`   → Adding brief delay to prevent transaction deadlocks...`)
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const { processEmploymentData } = await import('@/services/user')
      await processEmploymentData(finalIndividuals)
      console.log(`   → Employment data processing completed`)
      
      // ===== CREATE RELATIONSHIPS =====
      
      // Prepare affiliate relationships
      const allAffiliateRelationships: Array<{orgUserId: string, affiliateUserId: string}> = []
      
      if (results.orgProfile?.id_str) {
        const orgUserId = results.orgProfile.id_str
        
        // Only official affiliates get AFFILIATED_WITH relationships
        results.affiliatedUsers.forEach((affiliate: any) => {
          if (affiliate.id_str && affiliate.id_str !== orgUserId) {
            allAffiliateRelationships.push({
              orgUserId: orgUserId,
              affiliateUserId: affiliate.id_str
            })
          }
        })
        
        if (allAffiliateRelationships.length > 0) {
          console.log(`   → Processing ${allAffiliateRelationships.length} affiliate relationships...`)
          
          // Check which relationships already exist
          const existingAffiliateRelationships = await checkExistingAffiliateRelationships(allAffiliateRelationships)
          const newAffiliateRelationships = filterOutExistingRelationships(
            allAffiliateRelationships,
            existingAffiliateRelationships,
            ['orgUserId', 'affiliateUserId']
          )
          
          console.log(`   → Found ${existingAffiliateRelationships.length} existing, ${newAffiliateRelationships.length} new AFFILIATED_WITH relationships`)
          
          if (newAffiliateRelationships.length > 0) {
            await addAffiliateRelationships(newAffiliateRelationships)
            console.log(`   → Created ${newAffiliateRelationships.length} new AFFILIATED_WITH relationships`)
          }
        } else {
          console.log(`   → No affiliate relationships to create`)
        }
      } else {
        console.warn(`   → No organization profile ID available for relationship creation`)
      }
      
    } catch (employmentError: any) {
      console.error('❌ Employment data processing failed:', employmentError.message)
      results.errors.push(`Employment processing error: ${employmentError.message}`)
    }

    // Step 5.9: Filter individuals by organization affiliation
    console.log('🔍 Step 5.9: Filtering individuals by organization affiliation...')
    
    const orgScreenName = `@${orgUsername.toLowerCase()}`
    const orgScreenNameWithoutAt = orgUsername.toLowerCase()
    
    const directAffiliates: any[] = []
    const otherIndividuals: any[] = []
    
    finalIndividuals.forEach((profile) => {
      const employmentData = profile._employment_data
      let hasOrgAffiliation = false
      
      if (employmentData?.current_organizations && Array.isArray(employmentData.current_organizations)) {
        // Check if any of the current organizations match the searched org
        const orgs = employmentData.current_organizations
        hasOrgAffiliation = orgs.some((org: string) => {
          const orgLower = org.toLowerCase()
          return orgLower === orgScreenName || 
                 orgLower === orgScreenNameWithoutAt ||
                 orgLower === `@${orgScreenNameWithoutAt}`
        })
      }
      
      if (hasOrgAffiliation) {
        directAffiliates.push(profile)
      } else {
        otherIndividuals.push(profile)
      }
    })
    
    console.log(`✅ Organization affiliation filtering complete:`)
    console.log(`   🎯 Direct affiliates: ${directAffiliates.length}`)
    console.log(`   👥 Other individuals: ${otherIndividuals.length}`)
    
    // Update results
    results.allProfiles = directAffiliates

    // Return comprehensive results
    console.log(' Search completed successfully')
    return NextResponse.json({
      success: true,
      orgUsername,
      orgProfile: results.orgProfile,
      summary: {
        totalProfilesFound: finalIndividuals.length,
        directAffiliatesFound: directAffiliates.length,
        otherIndividualsFound: otherIndividuals.length,
        individualsFound: finalIndividuals.length,
        existingEmployeesFound: results.existingEmployees.length,
        affiliatesFound: results.affiliatedUsers.length,
        searchResultsFound: results.searchedUsers.length,
        grokSuggestionsFound: results.grokUsers.length,
        followingAffiliatesFound: results.followingUsers.length,
        spamProfilesRemoved: rejectedProfiles.filter(p => p._rejection_reason === 'spam_filtered').length,
        preIdentifiedOrganizationsRemoved: rejectedProfiles.filter(p => p._rejection_reason === 'already_identified_as_organization').length,
        grokOrganizationsRemoved: rejectedProfiles.filter(p => p._rejection_reason === 'grok_identified_organization').length,
        grokOrganizationsProcessed: grokIdentifiedOrganizations.length,
        rejectedProfilesCount: rejectedProfiles.length,
        errorsEncountered: results.errors.length
      },
      profiles: results.allProfiles,
      individuals: finalIndividuals,
      directAffiliates: directAffiliates,
      otherIndividuals: otherIndividuals,
      existingEmployees: results.existingEmployees,
      rejectedProfiles: rejectedProfiles,
      grokAnalysisMetadata: grokAnalysisMetadata,
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error: any) {
    console.error(' Fatal error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error.message,
        success: false 
      },
      { status: 500 }
    )
  }
}
