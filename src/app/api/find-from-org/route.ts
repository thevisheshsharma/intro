import { NextRequest, NextResponse } from 'next/server'
import { findOrgAffiliatesWithGrok } from '@/lib/grok'

/**
 * API Route: Find people associated with an organization
 * POST /api/find-from-org
 * 
 * This endpoint implements the logic described in the requirements:
 * 1. Use socialapi to fetch affiliates
 * 2. Use socialapi to search for users by org name
 * 3. Use Grok to find additional associated accounts
 * 4. Fetch profiles for all discovered usernames
 */

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
      console.error('❌ SOCIALAPI_BEARER_TOKEN not configured')
      return NextResponse.json(
        { error: 'API configuration error: Missing SocialAPI token' },
        { status: 500 }
      )
    }

    if (!process.env.GROK_API_KEY) {
      console.error('❌ GROK_API_KEY not configured')
      return NextResponse.json(
        { error: 'API configuration error: Missing Grok API key' },
        { status: 500 }
      )
    }

    console.log('🔍 Starting search for organization:', orgUsername)

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

    // Step 1: Fetch organization profile using socialapi
    try {
      console.log('📊 Fetching organization profile...')
      const orgProfileResponse = await fetch(`https://api.socialapi.me/twitter/user/${orgUsername}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json',
        }
      })

      console.log('🔍 [DEBUG] Org Profile Response Status:', orgProfileResponse.status)
      
      if (orgProfileResponse.ok) {
        results.orgProfile = await orgProfileResponse.json()
        console.log('✅ Organization profile fetched successfully')
      } else {
        const errorText = await orgProfileResponse.text()
        const error = `Failed to fetch org profile: ${orgProfileResponse.status}`
        console.error('❌', error)
        console.log('🔍 [DEBUG] Org Profile Error Response:', errorText)
        results.errors.push(error)
      }
    } catch (error: any) {
      const errorMsg = `Error fetching org profile: ${error.message}`
      console.error('❌', errorMsg)
      console.log('🔍 [DEBUG] Org Profile Exception:', error)
      results.errors.push(errorMsg)
    }

    // Step 2a: Get affiliated accounts using the official SocialAPI endpoint
    try {
      console.log('🔗 Fetching affiliates using official endpoint...')
      
      // First, we need the numeric user ID for the affiliates endpoint
      let userId = null
      if (results.orgProfile && results.orgProfile.id_str) {
        userId = results.orgProfile.id_str
        console.log('🔍 [DEBUG] Using User ID for affiliates:', userId)
      }
      
      if (userId) {
        const affiliatesResponse = await fetch(`https://api.socialapi.me/twitter/user/${userId}/affiliates`, {
          headers: {
            'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
            'Accept': 'application/json'
          }
        })

        console.log('🔍 [DEBUG] Affiliates Response Status:', affiliatesResponse.status)

        if (affiliatesResponse.ok) {
          const affiliatesData = await affiliatesResponse.json()
          results.affiliatedUsers = affiliatesData.users || []
          console.log(`✅ Found ${results.affiliatedUsers.length} affiliated users`)
        } else if (affiliatesResponse.status === 404) {
          console.log('ℹ️ No affiliates found for this organization (not all organizations have affiliates listed)')
          console.log('🔍 [DEBUG] 404 Response Body:', await affiliatesResponse.text())
        } else {
          const errorText = await affiliatesResponse.text()
          const error = `Failed to fetch affiliates: ${affiliatesResponse.status}`
          console.error('❌', error)
          console.log('🔍 [DEBUG] Affiliates Error Response:', errorText)
          results.errors.push(error)
        }
      } else {
        console.log('⚠️ Could not get user ID for affiliates lookup - skipping affiliates')
        console.log('🔍 [DEBUG] Org Profile ID fields:', {
          id: results.orgProfile?.id,
          id_str: results.orgProfile?.id_str
        })
        results.errors.push('Could not obtain user ID for affiliates lookup')
      }
    } catch (error: any) {
      const errorMsg = `Error fetching affiliates: ${error.message}`
      console.error('❌', errorMsg)
      results.errors.push(errorMsg)
    }

    // Step 2b: Search for users using organization name as query
    try {
      console.log('🔍 Searching for users...')
      console.log('🔍 [DEBUG] Search Query:', orgUsername)
      
      // Try the search endpoint with the organization name
      const searchResponse = await fetch(`https://api.socialapi.me/twitter/search-users?query=${encodeURIComponent(orgUsername)}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
          'Accept': 'application/json'
        }
      })

      console.log('🔍 [DEBUG] Search Response Status:', searchResponse.status)

      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        results.searchedUsers = searchData.users || searchData || []
        console.log(`✅ Found ${results.searchedUsers.length} users from search`)
      } else {
        const errorText = await searchResponse.text()
        console.log(`⚠️ Search endpoint returned ${searchResponse.status} - this endpoint may not be available`)
        console.log('🔍 [DEBUG] Search Error Response:', errorText)
        results.errors.push(`Search API returned ${searchResponse.status} (search functionality limited)`)
      }
    } catch (error: any) {
      const errorMsg = `Error searching users: ${error.message}`
      console.error('❌', errorMsg)
      console.log('🔍 [DEBUG] Search Exception:', error)
      results.errors.push(errorMsg)
    }

    // Step 2c: Ask Grok to find associated accounts (primary source)
    try {
      console.log('🤖 Using Grok AI with enhanced X search to find associated accounts...')
      console.log('🔍 [DEBUG] Grok Input Org Username:', orgUsername)
      
      const grokUsernames = await findOrgAffiliatesWithGrok(orgUsername)
      results.grokUsers = grokUsernames
    } catch (error: any) {
      const errorMsg = `Error with Grok analysis: ${error.message}`
      console.error('❌', errorMsg)
      results.errors.push(errorMsg)
    }

    // Step 2d: Check organization's following list for potential affiliates
    const followingUsers: any[] = []
    try {
      console.log('👥 Analyzing organization\'s following list for potential affiliates...')
      
      if (results.orgProfile && results.orgProfile.id_str) {
        const userId = results.orgProfile.id_str
        console.log('🔍 [DEBUG] Fetching following list for user ID:', userId)
        
        // Fetch the list of accounts the organization follows using SocialAPI directly
        let allFollowings: any[] = []
        let nextCursor: string | undefined = undefined
        let firstPage = true
        
        do {
          let url = `https://api.socialapi.me/twitter/friends/list?user_id=${userId}&count=200`
          if (!firstPage && nextCursor) {
            url += `&cursor=${nextCursor}`
          }
          
          console.log('🔍 [DEBUG] Fetching following page:', firstPage ? 'first' : `cursor: ${nextCursor}`)
          
          const response = await fetch(url, {
            headers: {
              'Authorization': `Bearer ${process.env.SOCIALAPI_BEARER_TOKEN}`,
              'Accept': 'application/json',
            },
          })
          
          if (!response.ok) {
            const errorText = await response.text()
            console.log(`⚠️ Failed to fetch following list: ${response.status}`)
            console.log('🔍 [DEBUG] Following List Error Response:', errorText)
            results.errors.push(`Failed to fetch following list: ${response.status}`)
            break
          }
          
          const data = await response.json()
          
          if (Array.isArray(data.users)) {
            allFollowings.push(...data.users)
          }
          
          nextCursor = data.next_cursor_str || data.next_cursor
          firstPage = false
          
          console.log(`🔍 [DEBUG] Following page fetched: ${data.users?.length || 0} users, next cursor: ${nextCursor}`)
          
        } while (nextCursor && nextCursor !== '0')
        
        console.log(`📋 Organization follows ${allFollowings.length} accounts`)
        
        // Extract multiple variations of the organization to search for
        const orgVariations = new Set<string>()
        
        // Add username variations
        orgVariations.add(orgUsername.toLowerCase())
        
        // Add display name variations if available
        if (results.orgProfile?.name) {
          const displayName = results.orgProfile.name.toLowerCase()
          orgVariations.add(displayName)
          
          // Add variations without common suffixes (Inc, LLC, etc.)
          const cleanedName = displayName
            .replace(/\s+(inc|llc|ltd|corp|corporation|company|co)\b/g, '')
            .trim()
          if (cleanedName && cleanedName !== displayName) {
            orgVariations.add(cleanedName)
          }
        }
        
        // Add website domain variations if available
        if (results.orgProfile?.url) {
          try {
            const url = new URL(results.orgProfile.url)
            const domain = url.hostname.toLowerCase()
            orgVariations.add(domain)
            
            // Add domain without www
            const domainWithoutWww = domain.replace(/^www\./, '')
            if (domainWithoutWww !== domain) {
              orgVariations.add(domainWithoutWww)
            }
            
            // Add just the domain name (without .com, .org, etc.)
            const domainName = domainWithoutWww.split('.')[0]
            if (domainName && domainName.length > 2) {
              orgVariations.add(domainName)
            }
          } catch (error) {
            console.log('🔍 [DEBUG] Could not parse organization URL:', results.orgProfile.url)
          }
        }
        
        const orgMentions = Array.from(orgVariations).filter(variation => variation.length > 2)
        console.log(`🔍 [DEBUG] Searching for ${orgMentions.length} organization variations:`, orgMentions)
        
        // Filter the following list to find potential affiliates
        // Look for accounts that mention any organization variation in their bio
        allFollowings.forEach((user: any, index: number) => {
          if (user.description) {
            const bioLower = user.description.toLowerCase()
            const matchedVariations = orgMentions.filter(mention => bioLower.includes(mention))
            
            if (matchedVariations.length > 0) {
              followingUsers.push(user)
              console.log(`🎯 Found potential affiliate in following list: @${user.screen_name} (mentions: ${matchedVariations.join(', ')})`)
            }
          }
          
          // Log progress for large following lists
          if (index > 0 && index % 100 === 0) {
            console.log(`🔍 [DEBUG] Processed ${index}/${allFollowings.length} following accounts...`)
          }
        })
        
        console.log(`✅ Found ${followingUsers.length} potential affiliates from ${allFollowings.length} following accounts`)
        console.log('🔍 [DEBUG] Following affiliates:', followingUsers.slice(0, 5).map(u => u.screen_name))
        
        // Store the following users in results
        results.followingUsers = followingUsers
        
      } else {
        console.log('⚠️ Could not get user ID for following list analysis - skipping following list step')
        results.errors.push('Could not obtain user ID for following list analysis')
      }
    } catch (error: any) {
      const errorMsg = `Error analyzing following list: ${error.message}`
      console.error('❌', errorMsg)
      console.log('🔍 [DEBUG] Following List Exception:', error)
      results.errors.push(errorMsg)
    }

    // Step 2e: Collect all unique usernames and profiles
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
    
    // Only collect USERNAMES from Grok (need to fetch profiles)
    const grokUsernamesNeedingProfiles: string[] = []
    results.grokUsers.forEach((username: string) => {
      if (username) {
        const cleanUsername = username.toLowerCase()
        if (!allUsernames.has(cleanUsername)) { // Only if not already found
          allUsernames.add(cleanUsername)
          grokUsernamesNeedingProfiles.push(cleanUsername)
        }
      }
    })

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
    console.log('🔍 [DEBUG] All collected usernames:', Array.from(allUsernames))

    // Step 3: Fetch profiles ONLY for Grok usernames (others already have full profiles)
    if (grokUsernamesNeedingProfiles.length > 0) {
      try {
        console.log('👥 Fetching profiles for Grok-discovered users only...')
        console.log('🔍 [DEBUG] Profile fetch batch size:', grokUsernamesNeedingProfiles.length)
        
        // Process usernames in batches of 100 (API limit)
        const batchSize = 100
        let fetchedProfilesCount = 0
        let failedUsernames: string[] = []
        
        for (let i = 0; i < grokUsernamesNeedingProfiles.length; i += batchSize) {
          const batch = grokUsernamesNeedingProfiles.slice(i, i + batchSize)
          console.log(`🔍 [DEBUG] Fetching batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(grokUsernamesNeedingProfiles.length / batchSize)} (${batch.length} usernames)`)
          
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
              allProfiles.push(...fetchedProfiles)
              fetchedProfilesCount += fetchedProfiles.length
              console.log(`✅ Batch ${Math.floor(i / batchSize) + 1}: Fetched ${fetchedProfiles.length}/${batch.length} profiles`)
              
              // If we got fewer profiles than requested, track the missing ones for fallback
              if (fetchedProfiles.length < batch.length) {
                const fetchedUsernames = new Set(fetchedProfiles.map((p: any) => p.screen_name?.toLowerCase()))
                const missingInBatch = batch.filter(username => !fetchedUsernames.has(username.toLowerCase()))
                failedUsernames.push(...missingInBatch)
                console.log(`⚠️ Batch ${Math.floor(i / batchSize) + 1}: ${missingInBatch.length} usernames not found, will retry individually`)
              }
            } else {
              const errorText = await profileResponse.text()
              console.log(`⚠️ Failed to fetch profile batch: ${profileResponse.status}`)
              console.log(`🔍 [DEBUG] Batch error response:`, errorText)
              
              // Add all usernames in this batch to failed list for individual retry
              failedUsernames.push(...batch)
              console.log(`🔄 Will retry ${batch.length} usernames individually due to batch failure`)
            }
          } catch (error: any) {
            console.log(`⚠️ Error fetching profile batch:`, error.message)
            console.log(`🔍 [DEBUG] Batch exception:`, error)
            
            // Add all usernames in this batch to failed list for individual retry
            failedUsernames.push(...batch)
            console.log(`🔄 Will retry ${batch.length} usernames individually due to batch error`)
          }
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
              fetchedProfilesCount++
              individualSuccessCount++
            }
          })

          console.log(`✅ Individual fallback: Fetched ${individualSuccessCount}/${failedUsernames.length} additional profiles`)
        }

        console.log(`✅ Total fetched: ${fetchedProfilesCount} profiles from ${grokUsernamesNeedingProfiles.length} Grok usernames`)
      } catch (error: any) {
        const errorMsg = `Error fetching Grok profiles: ${error.message}`
        console.error('❌', errorMsg)
        results.errors.push(errorMsg)
      }
    }

    // Step 4: Categorize profiles and apply spam filter
    console.log('🏢 Categorizing profiles by type...')
    
    const categorizeProfile = (profile: any) => {
      // Check if it's a business/organization based on verification info
      const isOrganization = profile.verification_info?.type === 'Business'
      return isOrganization ? 'organization' : 'individual'
    }

    const spamFilter = (profile: any) => {
      const followers = profile.followers_count || 0
      const following = profile.friends_count || 0
      return followers >= 10 || following >= 10
    }

    // Categorize all profiles
    const organizations: any[] = []
    const individuals: any[] = []
    const spamProfiles: any[] = []

    allProfiles.forEach((profile) => {
      const category = categorizeProfile(profile)
      const isValidProfile = spamFilter(profile)
      
      if (isValidProfile) {
        if (category === 'organization') {
          organizations.push(profile)
        } else {
          individuals.push(profile)
        }
      } else {
        spamProfiles.push(profile)
      }
    })

    const validProfiles = [...organizations, ...individuals]
    
    console.log(`✅ Profile categorization complete:`)
    console.log(`   🏢 Organizations: ${organizations.length}`)
    console.log(`   👤 Individuals: ${individuals.length}`)
    console.log(`   🗑️ Spam filtered: ${spamProfiles.length}`)
    console.log(`   📊 Total valid: ${validProfiles.length}`)

    // Update results with the filtered profile collection
    results.allProfiles = validProfiles

    // Return comprehensive results
    console.log('🎉 Search completed successfully')
    return NextResponse.json({
      success: true,
      orgUsername,
      orgProfile: results.orgProfile,
      summary: {
        totalProfilesFound: results.allProfiles.length,
        organizationsFound: organizations.length,
        individualsFound: individuals.length,
        affiliatesFound: results.affiliatedUsers.length,
        searchResultsFound: results.searchedUsers.length,
        grokSuggestionsFound: results.grokUsers.length,
        followingAffiliatesFound: results.followingUsers.length,
        spamProfilesRemoved: spamProfiles.length,
        errorsEncountered: results.errors.length
      },
      profiles: results.allProfiles,
      organizations: organizations,
      individuals: individuals,
      spamProfiles: spamProfiles,
      errors: results.errors.length > 0 ? results.errors : undefined
    })

  } catch (error: any) {
    console.error('❌ Fatal error in find-from-org API:', error)
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
