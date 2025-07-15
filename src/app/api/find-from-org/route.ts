import { NextRequest, NextResponse } from 'next/server'
import { findOrgAffiliatesWithGrok, analyzeProfileBatch } from '@/lib/grok'
import { runQuery } from '@/lib/neo4j'
import { 
  createOrUpdateUser, 
  createOrUpdateUsers,
  createOrUpdateUsersOptimized,
  getUserByScreenName,
  getUsersByScreenNames,
  getUserFollowingCount,
  getUserFollowingCounts,
  transformToNeo4jUser,
  hasFollowingData,
  batchCheckUserDataTypes,
  getOrganizationFollowingUsers,
  addAffiliateRelationships,
  addFollowsRelationships,
  checkUsersExist,
  checkExistingAffiliateRelationships,
  checkExistingFollowsRelationships,
  filterOutExistingRelationships,
  getUsersWithExistingEmploymentRelationships
} from '@/lib/neo4j/services/user-service'

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
      errors: string[];
    } = {
      orgProfile: null,
      affiliatedUsers: [],
      searchedUsers: [],
      grokUsers: [],
      followingUsers: [],
      allProfiles: [],
      errors: []
    }

    // Step 1: Massively Parallel Data Fetching Optimization
    console.log('Step 1: Parallel data source execution (optimized)...')
    
    let existingOrgUser: any = null
    let freshOrgProfile: any = null
    let shouldFetchFollowingsFromAPI = true
    
    // Execute ALL initial operations in parallel for maximum efficiency
    console.log('→ Starting all data sources in parallel...')
    const [
      neo4jOrgResult,
      socialApiOrgResult,
      grokResult,
      affiliatesResult,
      searchResult
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
      
      // 1c: Grok AI analysis (moved to parallel)
      (async () => {
        console.log('   → Starting Grok analysis...')
        const grokUsernames = await findOrgAffiliatesWithGrok(orgUsername)
        console.log(`   → ✅ Grok: Found ${grokUsernames.length} usernames`)
        return grokUsernames
      })(),
      
      // 1d: Official affiliates (requires orgProfile, but we'll handle this conditionally)
      (async () => {
        console.log('   → Starting affiliates fetch (will retry with ID if needed)...')
        console.log(`   → Affiliates URL: https://api.socialapi.me/twitter/user/${orgUsername}/affiliates`)
        // We'll try with username first, then retry with ID later if needed
        try {
          const affiliatesResponse = await fetch(`https://api.socialapi.me/twitter/user/${orgUsername}/affiliates`, {
            headers: {
              'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
              'Accept': 'application/json'
            }
          })
          
          if (affiliatesResponse.ok) {
            const affiliatesData = await affiliatesResponse.json()
            const affiliates = affiliatesData.users || affiliatesData.data || []
            console.log(`   → ✅ Affiliates: Found ${affiliates.length} official affiliates`)
            return { success: true, data: affiliates, needsRetry: false }
          } else if (affiliatesResponse.status === 404) {
            console.log('   → ✅ Affiliates: No official affiliates available for this organization (404)')
            return { success: true, data: [], needsRetry: false }
          } else if (affiliatesResponse.status === 401) {
            console.warn('   → ⚠️  Affiliates: Authentication error (401)')
            return { success: false, data: [], needsRetry: false, authError: true }
          } else if (affiliatesResponse.status === 403) {
            console.warn('   → ⚠️  Affiliates: Access forbidden (403) - may require user ID')
            return { success: false, data: [], needsRetry: true }
          } else if (affiliatesResponse.status >= 400 && affiliatesResponse.status < 500) {
            console.warn(`   → ⚠️  Affiliates: Client error ${affiliatesResponse.status} - will retry with user ID`)
            return { success: false, data: [], needsRetry: true }
          } else {
            console.warn(`   → ⚠️  Affiliates: Server error ${affiliatesResponse.status} - will retry with user ID`)
            return { success: false, data: [], needsRetry: true }
          }
        } catch (error: any) {
          console.warn(`   → ⚠️  Affiliates error: ${error.message} - will retry with user ID`)
          return { success: false, data: [], needsRetry: true, error: error.message }
        }
      })(),
      
      // 1e: User search
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

      // Process Affiliates result (may need retry with user ID)
      if (affiliatesResult.status === 'fulfilled') {
        const affiliateData = affiliatesResult.value
        if (affiliateData.success) {
          results.affiliatedUsers = affiliateData.data
          console.log(`   → ✅ Affiliates: Found ${results.affiliatedUsers.length} official affiliates`)
        } else if (affiliateData.authError) {
          console.error('   → ❌ Affiliates: Authentication failed - check SOCIALAPI_BEARER_TOKEN')
          results.errors.push('Affiliates authentication error - check API token')
          results.affiliatedUsers = []
        } else if (affiliateData.needsRetry) {
          // Will retry later with user ID
          console.log('   → ⚠️  Affiliates: Will retry with user ID later')
          results.affiliatedUsers = []
        } else {
          console.log('   → ℹ️  Affiliates: No retry needed, using empty result')
          results.affiliatedUsers = []
        }
      } else {
        console.error(`   → ❌ Affiliates error: ${affiliatesResult.reason?.message}`)
        results.errors.push(`Affiliates error: ${affiliatesResult.reason?.message}`)
        results.affiliatedUsers = []
      }
      
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
            await createOrUpdateUser(transformToNeo4jUser(freshOrgProfile))
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
          await createOrUpdateUser(transformToNeo4jUser(freshOrgProfile))
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

      // Retry affiliates with user ID if needed
      if (results.affiliatedUsers.length === 0 && affiliatesResult.status === 'fulfilled' && 
          affiliatesResult.value.needsRetry && results.orgProfile?.id_str) {
        try {
          console.log('   → Retrying affiliates fetch with user ID...')
          console.log(`   → Retry URL: https://api.socialapi.me/twitter/user/${results.orgProfile.id_str}/affiliates`)
          const retryResponse = await fetch(`https://api.socialapi.me/twitter/user/${results.orgProfile.id_str}/affiliates`, {
            headers: {
              'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
              'Accept': 'application/json'
            }
          })
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json()
            results.affiliatedUsers = retryData.users || retryData.data || []
            console.log(`   → ✅ Affiliates retry: Found ${results.affiliatedUsers.length} official affiliates`)
          } else if (retryResponse.status === 404) {
            console.log('   → ✅ Affiliates retry: No official affiliates available for this organization (404)')
            results.affiliatedUsers = []
          } else if (retryResponse.status === 401) {
            console.error('   → ❌ Affiliates retry: Authentication failed (401)')
            results.errors.push('Affiliates retry authentication error')
          } else if (retryResponse.status === 403) {
            console.warn('   → ⚠️  Affiliates retry: Access forbidden (403)')
            results.errors.push('Affiliates retry access forbidden')
          } else {
            console.warn(`   → ⚠️  Affiliates retry failed: ${retryResponse.status}`)
            const responseText = await retryResponse.text().catch(() => 'Unknown error')
            results.errors.push(`Affiliates retry failed: ${retryResponse.status} - ${responseText}`)
          }
        } catch (retryError: any) {
          console.error(`   → ❌ Affiliates retry error: ${retryError.message}`)
          results.errors.push(`Affiliates retry error: ${retryError.message}`)
        }
      } else if (results.affiliatedUsers.length === 0 && affiliatesResult.status === 'fulfilled' && 
                 !affiliatesResult.value.needsRetry) {
        console.log('   → ✅ Affiliates: No official affiliates available for this organization')
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

    console.log(`   → ✅ All parallel data sources complete: ${results.affiliatedUsers.length} affiliates, ${results.searchedUsers.length} search results, ${results.grokUsers.length} Grok suggestions`)

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
                // Check which users already exist to avoid redundant upserts
                const followingUserIds = validFollowings.map(user => user.id_str || user.id)
                const existingFollowingIds = await checkUsersExist(followingUserIds)
                const existingFollowingIdsSet = new Set(existingFollowingIds)
                
                const newFollowingUsers = validFollowings
                  .filter(user => !existingFollowingIdsSet.has(user.id_str || user.id))
                  .map(user => transformToNeo4jUser(user))
                
                console.log(`   → Found ${existingFollowingIds.length} existing following users, ${newFollowingUsers.length} new users to upsert`)
                
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

    // Step 3: Collect all unique usernames and profiles
    const allUsernames = new Set<string>()
    const allProfiles: any[] = []
    
    // Add FULL PROFILES from affiliates (already have complete data)
    results.affiliatedUsers.forEach((user: any) => {
      if (user.screen_name) {
        allUsernames.add(user.screen_name.toLowerCase())
        allProfiles.push(user) // Use existing profile data
      }
    })
    
    // Add FULL PROFILES from search (already have complete data)
    results.searchedUsers.forEach((user: any) => {
      if (user.screen_name) {
        const username = user.screen_name.toLowerCase()
        if (!allUsernames.has(username)) { // Avoid duplicates
          allUsernames.add(username)
          allProfiles.push(user) // Use existing profile data
        }
      }
    })
    
    // Add FULL PROFILES from following list analysis (already have complete data)
    results.followingUsers.forEach((user: any) => {
      if (user.screen_name) {
        const username = user.screen_name.toLowerCase()
        if (!allUsernames.has(username)) { // Avoid duplicates
          allUsernames.add(username)
          allProfiles.push(user) // Use existing profile data
        }
      }
    })
    
    // Only collect USERNAMES from Grok (need to check which exist in Neo4j and fetch missing profiles)
    const grokUsernamesNeedingProfiles: string[] = []
    
    if (results.grokUsers.length > 0) {
      console.log(`🔍 Checking ${results.grokUsers.length} Grok usernames against Neo4j...`)
      
      // Check which Grok usernames already exist in Neo4j by screen name
      const grokUsernamesNotYetAdded = results.grokUsers.filter((username: string) => {
        if (username) {
          const cleanUsername = username.toLowerCase()
          return !allUsernames.has(cleanUsername) // Only if not already found in other sources
        }
        return false
      })
      
      if (grokUsernamesNotYetAdded.length > 0) {
        // Use batch query to check existing users in Neo4j - OPTIMIZED
        console.log(`   → Batch checking ${grokUsernamesNotYetAdded.length} Grok usernames in Neo4j...`)
        
        let existingGrokUsers: any[] = []
        let nonExistingGrokUsernames: string[] = []
        
        try {
          const existingUsers = await getUsersByScreenNames(grokUsernamesNotYetAdded)
          const existingUsernamesSet = new Set(existingUsers.map(user => user.screenName.toLowerCase()))
          
          // Convert existing users to API format
          existingUsers.forEach(existingUser => {
            existingGrokUsers.push({
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
            })
            allUsernames.add(existingUser.screenName.toLowerCase())
          })
          
          // Identify usernames that don't exist in Neo4j
          grokUsernamesNotYetAdded.forEach(username => {
            if (!existingUsernamesSet.has(username.toLowerCase())) {
              nonExistingGrokUsernames.push(username.toLowerCase())
              allUsernames.add(username.toLowerCase())
            }
          })
        } catch (error: any) {
          console.warn(`   → Error in batch user lookup:`, error.message)
          // Fallback to treating all as non-existing
          nonExistingGrokUsernames = grokUsernamesNotYetAdded.map(u => u.toLowerCase())
          existingGrokUsers = []
        }
        
        // Add existing users from Neo4j to profiles
        allProfiles.push(...existingGrokUsers)
        
        console.log(`   → Found ${existingGrokUsers.length} existing Grok users in Neo4j`)
        console.log(`   → Need to fetch ${nonExistingGrokUsernames.length} new Grok users from API`)
        
        // Only these usernames need profile fetching
        grokUsernamesNeedingProfiles.push(...nonExistingGrokUsernames)
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

    console.log(`📝 Total unique usernames found: ${allUsernames.size}`)
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

        // Fallback: Try individual requests for failed usernames
        if (failedUsernames.length > 0) {
          console.log(`🔄 Attempting individual requests for ${failedUsernames.length} failed usernames...`)
          
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
              } else {
                console.log(`⚠️ Individual request failed for ${username}: ${profileResponse.status}`)
                return null
              }
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

          console.log(`✅ Individual fallback: Fetched ${individualSuccessCount}/${failedUsernames.length} additional profiles`)
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

    // Step 5.5: Check existing employment relationships and organization vibes before Grok analysis
    console.log('🔍 Step 5.5: Checking for existing employment relationships and organization vibes in Neo4j...')
    
    let finalIndividuals: any[] = []
    let grokAnalysisMetadata: any[] = []
    let usersNeedingGrokAnalysis: any[] = []
    let usersWithExistingRelationships: any[] = []
    let usersIdentifiedAsOrganizations: any[] = []
    let grokIdentifiedOrganizations: Array<{screenName: string, profile: any}> = []

    if (relevantIndividuals.length > 0 && results.orgProfile?.id_str) {
      try {
        // Get user IDs from relevant individuals
        const userIds = relevantIndividuals
          .filter(profile => profile.id_str || profile.id)
          .map(profile => profile.id_str || profile.id)
        
        if (userIds.length > 0) {
          // Check for existing employment relationships
          const existingEmploymentData = await getUsersWithExistingEmploymentRelationships(
            userIds, 
            results.orgProfile.id_str
          )
          
          // Create a map for quick lookup
          const existingEmploymentMap = new Map()
          existingEmploymentData.forEach(data => {
            existingEmploymentMap.set(data.userId, data)
          })
          
          // Get user vibes to check for organizations
          const userVibeQuery = `
            UNWIND $userIds AS userId
            MATCH (u:User {userId: userId})
            RETURN u.userId as userId, u.vibe as vibe, u.screenName as screenName
          `
          const userVibeResults = await runQuery(userVibeQuery, { userIds })
          const userVibeMap = new Map()
          userVibeResults.forEach(record => {
            userVibeMap.set(record.userId, { vibe: record.vibe, screenName: record.screenName })
          })
          
          // Separate users based on existing relationships and vibes
          relevantIndividuals.forEach(profile => {
            const userId = profile.id_str || profile.id
            const existingData = existingEmploymentMap.get(userId)
            const userVibeData = userVibeMap.get(userId)
            
            if (userVibeData?.vibe === 'organization') {
              // User is already identified as an organization - reject as organization
              profile._rejection_reason = 'already_identified_as_organization'
              usersIdentifiedAsOrganizations.push(profile)
              rejectedProfiles.push(profile)
              totalOrgsFound++
              console.log(`     🏢 @${profile.screen_name} - ALREADY IDENTIFIED AS ORGANIZATION (skipping Grok)`)
            } else if (existingData) {
              // User has existing employment relationship - add to final list directly
              profile._grok_analysis = {
                current_position: existingData.currentPosition || null,
                employment_history: existingData.employmentHistory || []
              }
              usersWithExistingRelationships.push(profile)
              finalIndividuals.push(profile)
              
              console.log(`     ✅ @${profile.screen_name} - HAS EXISTING EMPLOYMENT DATA (skipping Grok)`)
              if (existingData.hasWorksAt) {
                console.log(`        Current: ${existingData.currentPosition?.organizations?.join(', ')} (${existingData.currentPosition?.department || 'Unknown'})`)
              }
              if (existingData.hasWorkedAt) {
                console.log(`        Previous: ${existingData.employmentHistory?.map((h: any) => h.organization).join(', ')}`)
              }
            } else {
              // User needs Grok analysis
              usersNeedingGrokAnalysis.push(profile)
            }
          })
          
          console.log(`📊 Employment relationship and vibe check complete:`)
          console.log(`   🏢 Users already identified as organizations: ${usersIdentifiedAsOrganizations.length}`)
          console.log(`   ✅ Users with existing relationships: ${usersWithExistingRelationships.length}`)
          console.log(`   🤖 Users needing Grok analysis: ${usersNeedingGrokAnalysis.length}`)
        } else {
          console.log('   → No valid user IDs found for employment relationship check')
          usersNeedingGrokAnalysis = relevantIndividuals
        }
      } catch (employmentCheckError: any) {
        console.warn(`⚠️ Error checking existing employment relationships:`, employmentCheckError.message)
        results.errors.push(`Employment relationship check error: ${employmentCheckError.message}`)
        // Fallback: send all users to Grok analysis
        usersNeedingGrokAnalysis = relevantIndividuals
      }
    } else {
      console.log('   → No relevant individuals or org profile for employment check')
      usersNeedingGrokAnalysis = relevantIndividuals
    }

    // Step 5.6: Grok analysis for remaining users only
    console.log('🤖 Step 5.6: Starting Grok analysis for users without existing employment data...')

    if (usersNeedingGrokAnalysis.length > 0) {
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
            
            // Analyze with Grok
            const analysis = await analyzeProfileBatch(batchProfiles)
            
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
                
                if (analyzed.type === 'organization') {
                  // Grok identified this as an organization - handle appropriately
                  originalProfile._rejection_reason = 'grok_identified_organization'
                  rejectedProfiles.push(originalProfile)
                  totalOrgsFound++
                  console.log(`     🏢 @${analyzed.screen_name || originalProfile.screen_name} - ORGANIZATION (will check/update in Neo4j)`)
                  
                  // Collect organization for Neo4j processing
                  if (!grokIdentifiedOrganizations) {
                    grokIdentifiedOrganizations = []
                  }
                  grokIdentifiedOrganizations.push({
                    screenName: analyzed.screen_name || originalProfile.screen_name,
                    profile: originalProfile
                  })
                } else {
                  // Keep as individual and enrich with role/org data
                  originalProfile._grok_analysis = {
                    current_position: analyzed.current_position || null,
                    employment_history: analyzed.employment_history || []
                  }
                  finalIndividuals.push(originalProfile)
                  console.log(`     👤 @${analyzed.screen_name || originalProfile.screen_name} - INDIVIDUAL`)
                  
                  // Log current position details
                  if (analyzed.current_position) {
                    const pos = analyzed.current_position
                    const orgs = pos.organizations && pos.organizations.length > 0 ? pos.organizations.join(', ') : 'Unknown'
                    console.log(`        Current: ${orgs} (${pos.department})`)
                  }
                  
                  // Log employment history
                  if (analyzed.employment_history && analyzed.employment_history.length > 0) {
                    console.log(`        Previous: ${analyzed.employment_history.map((h: any) => h.organization).join(', ')}`)
                  }
                }
              })
              
              totalAnalyzed += batchResult.originalProfiles.length
              
              // Store batch metadata
              const validProfiles = batchResult.analysis.profiles.filter((p: any) => p != null)
              const orgCount = validProfiles.filter((p: any) => p.type === 'organization').length
              const indCount = validProfiles.filter((p: any) => p.type === 'individual').length
              
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
                    profile._grok_analysis = {
                      current_position: null,
                      employment_history: []
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
                    profile._grok_analysis = {
                      current_position: null,
                      employment_history: []
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
        
      } catch (grokError: any) {
        console.error('❌ Grok analysis failed completely:', grokError.message)
        results.errors.push(`Grok analysis error: ${grokError.message}`)
        // Fallback: use all users without enrichment
        usersNeedingGrokAnalysis.forEach(profile => {
          if (profile && typeof profile === 'object') {
            profile._grok_analysis = {
              current_position: null,
              employment_history: []
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
        const orgsToUpdate: Array<{screenName: string, userId: string}> = []
        const orgsToFetch: Array<{screenName: string, profile: any}> = []
        
        grokIdentifiedOrganizations.forEach(({ screenName, profile }) => {
          const existingOrg = existingOrgMap.get(screenName.toLowerCase())
          
          if (existingOrg) {
            // Organization exists - update vibe if needed
            if (existingOrg.vibe !== 'organization') {
              orgsToUpdate.push({
                screenName: existingOrg.screenName,
                userId: existingOrg.userId
              })
              console.log(`     🔄 @${screenName} - EXISTS, will update vibe to 'organization'`)
            } else {
              console.log(`     ✅ @${screenName} - EXISTS, already has 'organization' vibe`)
            }
          } else {
            // Organization doesn't exist - fetch and store
            orgsToFetch.push({ screenName, profile })
            console.log(`     🆕 @${screenName} - NEW, will fetch and store`)
          }
        })
        
        // Update vibes for existing organizations
        if (orgsToUpdate.length > 0) {
          console.log(`   → Updating vibe for ${orgsToUpdate.length} existing organizations...`)
          
          const updateVibeQuery = `
            UNWIND $orgs AS org
            MATCH (u:User {userId: org.userId})
            SET u.vibe = 'organization'
            RETURN u.screenName as screenName, u.vibe as vibe
          `
          
          const updateResults = await runQuery(updateVibeQuery, { orgs: orgsToUpdate })
          console.log(`   → Updated vibe for ${updateResults.length} organizations`)
        }
        
        // Fetch and store new organizations
        if (orgsToFetch.length > 0) {
          console.log(`   → Fetching ${orgsToFetch.length} new organizations from SocialAPI...`)
          
          const fetchPromises = orgsToFetch.map(async ({ screenName, profile }) => {
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
                return { success: true, profile: freshOrgProfile, fallbackProfile: profile }
              } else {
                console.warn(`   → Failed to fetch @${screenName}: ${response.status}, using existing profile data`)
                return { success: false, profile: null, fallbackProfile: profile }
              }
            } catch (error: any) {
              console.warn(`   → Error fetching @${screenName}:`, error.message)
              return { success: false, profile: null, fallbackProfile: profile }
            }
          })
          
          const fetchResults = await Promise.allSettled(fetchPromises)
          const organizationsToStore: any[] = []
          
          fetchResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
              const { success, profile, fallbackProfile } = result.value
              const profileToUse = success ? profile : fallbackProfile
              
              if (profileToUse && (profileToUse.id_str || profileToUse.id)) {
                organizationsToStore.push(profileToUse)
                const source = success ? 'fresh API data' : 'existing profile data'
                console.log(`     ✅ @${profileToUse.screen_name} - prepared for storage (${source})`)
              } else {
                console.warn(`     ❌ @${orgsToFetch[index].screenName} - no valid profile data available`)
              }
            } else {
              console.warn(`     ❌ @${orgsToFetch[index].screenName} - fetch promise failed`)
            }
          })
          
          // Store organizations with vibe='organization'
          if (organizationsToStore.length > 0) {
            const orgUsersToUpsert = organizationsToStore.map(profile => {
              const orgUser = transformToNeo4jUser(profile)
              orgUser.vibe = 'organization' // Set vibe to organization
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
    console.log(`   🏢 Users pre-identified as organizations: ${usersIdentifiedAsOrganizations.length}`)
    console.log(`   🏢 Organizations identified by Grok: ${grokIdentifiedOrganizations.length}`)
    console.log(`   ✅ Users with existing employment data: ${usersWithExistingRelationships.length}`)
    console.log(`   🤖 Users processed by Grok: ${usersNeedingGrokAnalysis.length}`)
    console.log(`   👤 Total final individuals: ${finalIndividuals.length}`)
    console.log(`   📈 Updated total rejected: ${rejectedProfiles.length}`)

    // Update results with the Grok-analyzed profile collection
    results.allProfiles = finalIndividuals

    // Step 5.8: Process employment data from Grok analysis (OPTIMIZED)
    console.log('🏢 Step 5.7: Processing employment data...')
    try {
      const { processEmploymentData } = await import('@/lib/neo4j/services/user-service')
      await processEmploymentData(finalIndividuals)
      console.log('✅ Employment data processing completed')
    } catch (employmentError: any) {
      console.error('❌ Employment data processing failed:', employmentError.message)
      results.errors.push(`Employment data processing error: ${employmentError.message}`)
    }

    // Store organization and affiliates to Neo4j
    try {
      console.log('Step 6: Neo4j data storage...')
      
      // First, check and create/update users in Neo4j (excluding search results to avoid storing too much data)
      const allUsersData = [...results.affiliatedUsers, ...results.followingUsers]
      console.log(`   → Preparing to store ${allUsersData.length} users to Neo4j (excluding search results)`)
      
      // Filter out users with missing IDs before transformation
      const validUsersData = allUsersData.filter(user => user.id_str || user.id)
      const invalidUsersCount = allUsersData.length - validUsersData.length
      
      if (invalidUsersCount > 0) {
        console.warn(`   → Filtered out ${invalidUsersCount} users with missing IDs`)
      }
      
      // Check which users already exist in Neo4j in batch (more efficient than individual lookups)
      const userIds = validUsersData.map(user => user.id_str || user.id)
      const existingUserIds = await checkUsersExist(userIds)
      const existingUserIdsSet = new Set(existingUserIds)
      
      // Only transform and upsert users that don't exist
      const newUsersToUpsert = validUsersData
        .filter(user => !existingUserIdsSet.has(user.id_str || user.id))
        .map(user => transformToNeo4jUser(user))
      
      console.log(`   → Found ${existingUserIds.length} existing users, ${newUsersToUpsert.length} new users to upsert`)
      
      if (newUsersToUpsert.length > 0) {
        console.log(`   → Checking ${newUsersToUpsert.length} users for staleness...`)
        const result = await createOrUpdateUsersOptimized(newUsersToUpsert, 1080) // 45 day staleness
        console.log(`   → Users: ${result.created} created, ${result.updated} updated, ${result.skipped} skipped`)
      } else {
        console.log('   → No new users to upsert to Neo4j')
      }
      
      // Create or update the organization user (always update org data as it might be fresh)
      if (results.orgProfile && (results.orgProfile.id_str || results.orgProfile.id)) {
        console.log('   → Upserting organization profile to Neo4j...')
        const orgUser = transformToNeo4jUser(results.orgProfile)
        await createOrUpdateUser(orgUser)
        console.log('   → Upserted organization to Neo4j')
      } else {
        console.warn('   → No valid organization profile to upsert to Neo4j (missing ID)')
      }
      
      // Check and create AFFILIATED_WITH relationships (only for official affiliates)
      console.log('   → Checking and creating AFFILIATED_WITH relationships for official affiliates...')
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
          // Check which relationships already exist
          const existingAffiliateRelationships = await checkExistingAffiliateRelationships(allAffiliateRelationships)
          const newAffiliateRelationships = filterOutExistingRelationships(
            allAffiliateRelationships,
            existingAffiliateRelationships,
            ['orgUserId', 'affiliateUserId']
          )
          
          console.log(`   → Found ${existingAffiliateRelationships.length} existing, ${newAffiliateRelationships.length} new AFFILIATED_WITH relationships`)
          
          if (newAffiliateRelationships.length > 0) {
            console.log(`   → Creating ${newAffiliateRelationships.length} new AFFILIATED_WITH relationships in Neo4j...`)
            await addAffiliateRelationships(newAffiliateRelationships)
            console.log(`   → Created ${newAffiliateRelationships.length} new AFFILIATED_WITH relationships`)
          } else {
            console.log('   → All affiliate relationships already exist')
          }
        } else {
          console.log('   → No official affiliate relationships to create')
        }
      } else {
        console.warn('   → No organization profile ID available for relationship creation')
      }
      
    } catch (error: any) {
      console.error('   → Error storing data to Neo4j:', error.message)
      results.errors.push(`Neo4j storage error: ${error.message}`)
    }

    // Step 7: Filter individuals by organization affiliation
    console.log('🔍 Filtering individuals by organization affiliation...')
    
    const orgScreenName = `@${orgUsername.toLowerCase()}`
    const orgScreenNameWithoutAt = orgUsername.toLowerCase()
    
    const directAffiliates: any[] = []
    const otherIndividuals: any[] = []
    
    finalIndividuals.forEach((profile) => {
      const grokAnalysis = profile._grok_analysis
      let hasOrgAffiliation = false
      
      if (grokAnalysis?.current_position?.organizations) {
        // Check if any of the current organizations match the searched org
        const orgs = grokAnalysis.current_position.organizations
        hasOrgAffiliation = orgs.some((org: string) => {
          const orgLower = org.toLowerCase()
          return orgLower === orgScreenName || 
                 orgLower === orgScreenNameWithoutAt ||
                 orgLower === `@${orgScreenNameWithoutAt}`
        })
      }
      
      if (hasOrgAffiliation) {
        directAffiliates.push(profile)
        console.log(`     ✅ @${profile.screen_name} - DIRECT AFFILIATE (has org in current position)`)
      } else {
        otherIndividuals.push(profile)
        console.log(`     ➡️  @${profile.screen_name} - OTHER INDIVIDUAL (no org in current position)`)
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
