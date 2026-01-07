import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { verifyPrivyToken, getPrivyUser, extractTwitterFromPrivyUser, extractEmailFromPrivyUser } from '@/lib/privy'
import { fetchTwitterProfile, classifyProfileComplete } from '@/lib/classifier'
import { createUserWithTrial } from '@/lib/subscription'
import { runQuery } from '@/services'
import { analysisJobs, type OnboardingResult, type OrgInfo } from '@/lib/onboarding-storage'

export const maxDuration = 60 // Allow up to 60 seconds for analysis

export async function POST(request: NextRequest) {
    try {
        const { userId, error: authError } = await verifyPrivyToken(request)
        if (authError || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Get user from Privy to extract Twitter info
        const privyUser = await getPrivyUser(userId)
        const twitterUsername = extractTwitterFromPrivyUser(privyUser)
        const email = extractEmailFromPrivyUser(privyUser)

        if (!twitterUsername) {
            return NextResponse.json({
                error: 'Twitter account not linked',
                requiresTwitter: true
            }, { status: 400 })
        }

        // Generate job ID
        const jobId = `onboard_${userId}_${Date.now()}`

        // Initialize job in shared storage
        await analysisJobs.set(jobId, {
            status: 'pending',
            step: 'initializing',
            progress: 0,
            startedAt: new Date()
        })

        console.log(`[Onboarding] Created job ${jobId}`)

        // Use waitUntil to keep the function alive for background analysis
        // This is critical for Vercel serverless - without it, the function terminates
        // immediately after returning the response, killing the background work
        const analysisPromise = runAnalysis(jobId, userId, twitterUsername, email).catch(async err => {
            console.error('[Onboarding] Analysis failed:', err)
            try {
                const job = await analysisJobs.get(jobId)
                if (job) {
                    job.status = 'error'
                    job.error = err.message
                    await analysisJobs.set(jobId, job)
                }
            } catch (setError) {
                console.error('[Onboarding] Failed to set error state:', setError)
            }
        })

        // waitUntil keeps the serverless function alive until the promise resolves
        // while still allowing us to return a response immediately
        waitUntil(analysisPromise)

        return NextResponse.json({
            jobId,
            status: 'started',
            twitterUsername
        })

    } catch (error: any) {
        console.error('Onboarding analyze error:', error)
        return NextResponse.json({
            error: 'Failed to start analysis',
            details: error.message
        }, { status: 500 })
    }
}

async function runAnalysis(
    jobId: string,
    privyDid: string,
    twitterUsername: string,
    email?: string | null
) {
    const job = await analysisJobs.get(jobId)
    if (!job) return
    const normalizedUsername = twitterUsername.replace('@', '').toLowerCase()

    try {
        // Step 1: Create/update user with trial subscription
        await updateJob(jobId, 'processing', 'profile', 10)
        await createUserWithTrial(privyDid, email || undefined)

        // Step 2: Fetch Twitter profile from SocialAPI
        await updateJob(jobId, 'processing', 'fetching', 20)
        const twitterProfile = await fetchTwitterProfile(normalizedUsername)
        console.log(`[Onboarding] Fetched profile for @${normalizedUsername}`)

        // Step 3: Classify user with Grok
        await updateJob(jobId, 'processing', 'classifying', 40)
        const classification = await classifyProfileComplete(normalizedUsername, twitterProfile)
        console.log(`[Onboarding] Classification: ${classification.vibe}`)

        // Step 4: Extract organizations - first try Neo4j, then fallback to classification
        await updateJob(jobId, 'processing', 'extracting_orgs', 60)

        // Query Neo4j for existing org relationships (for returning users)
        let works_at: OrgInfo[] = []
        let worked_at: OrgInfo[] = []
        let member_of: OrgInfo[] = []

        try {
            const orgQuery = `
                MATCH (u:User)
                WHERE toLower(u.screenName) = toLower($screenName)
                OPTIONAL MATCH (u)-[:WORKS_AT]->(worksAt:User)
                OPTIONAL MATCH (u)-[:WORKED_AT]->(workedAt:User)
                OPTIONAL MATCH (u)-[:MEMBER_OF]->(memberOf:User)
                RETURN 
                    u.screenName as userScreenName,
                    collect(DISTINCT worksAt) as worksAtOrgs,
                    collect(DISTINCT workedAt) as workedAtOrgs,
                    collect(DISTINCT memberOf) as memberOfOrgs
            `
            console.log(`[Onboarding] Querying Neo4j for orgs with screenName: ${normalizedUsername}`)
            const records = await runQuery(orgQuery, { screenName: normalizedUsername })
            console.log(`[Onboarding] Neo4j returned ${records.length} records`)

            if (records.length > 0) {
                const record = records[0]
                const foundUser = record.userScreenName
                console.log(`[Onboarding] Found user in Neo4j: ${foundUser}`)

                const worksAtRaw = record.worksAtOrgs || []
                const workedAtRaw = record.workedAtOrgs || []
                const memberOfRaw = record.memberOfOrgs || []
                console.log(`[Onboarding] Raw data - worksAt: ${worksAtRaw?.length}, workedAt: ${workedAtRaw?.length}, memberOf: ${memberOfRaw?.length}`)

                const mapOrgs = (orgs: any[]): OrgInfo[] =>
                    (orgs || []).filter(o => o).map(o => ({
                        screenName: o.properties?.screenName || '',
                        name: o.properties?.name || o.properties?.screenName || '',
                        type: o.properties?.orgType || o.properties?.vibe,
                        profileImageUrl: o.properties?.profileImageUrl
                    }))

                works_at = mapOrgs(worksAtRaw)
                worked_at = mapOrgs(workedAtRaw)
                member_of = mapOrgs(memberOfRaw)
                console.log(`[Onboarding] Mapped Neo4j relationships: works_at=${works_at.length}, worked_at=${worked_at.length}, member_of=${member_of.length}`)
            }
        } catch (err) {
            console.error('[Onboarding] Error querying Neo4j for orgs:', err)
        }

        // Fallback to classification data if Neo4j didn't have any relationships
        if (works_at.length === 0 && worked_at.length === 0 && member_of.length === 0) {
            const toOrgInfo = (orgNames: string[] | undefined | null): OrgInfo[] => {
                if (!orgNames) return []
                return orgNames.map(name => ({
                    screenName: name.replace('@', '').toLowerCase(),
                    name: name.replace('@', '')
                }))
            }
            works_at = toOrgInfo(classification.current_organizations)
            worked_at = toOrgInfo(classification.past_organizations)
            member_of = toOrgInfo(classification.member_of)
            console.log(`[Onboarding] Using classification data: works_at=${works_at.length}, worked_at=${worked_at.length}, member_of=${member_of.length}`)
        }

        // Collect all unique orgs for ICP analysis
        const allOrgScreenNames = new Set<string>()
        works_at.forEach(o => allOrgScreenNames.add(o.screenName))
        worked_at.forEach(o => allOrgScreenNames.add(o.screenName))
        member_of.forEach(o => allOrgScreenNames.add(o.screenName))

        // Step 5: Check Neo4j for orgs with ICP relationships
        await updateJob(jobId, 'processing', 'checking_relationships', 70)
        const { invested_in, partners_with, missingIcp } = await fetchIcpRelationships(Array.from(allOrgScreenNames))

        // Step 6: Queue ICP analysis for missing orgs (background, non-blocking)
        const orgsNeedingIcp = missingIcp
        if (orgsNeedingIcp.length > 0) {
            console.log(`[Onboarding] Queuing ICP analysis for ${orgsNeedingIcp.length} orgs`)
            // Fire and forget - don't block onboarding
            queueIcpAnalysis(orgsNeedingIcp, privyDid).catch(err => {
                console.error('[Onboarding] Background ICP analysis error:', err)
            })
        }

        // Step 7: Update Neo4j with onboarding status
        await updateJob(jobId, 'processing', 'saving', 90)
        await updateOnboardingStatus(privyDid, normalizedUsername, classification)

        // Calculate Berri points
        const berriPoints = calculateBerriPoints(twitterProfile, classification)

        // Complete
        const result: OnboardingResult = {
            vibe: classification.vibe,
            twitterProfile: {
                screenName: normalizedUsername,
                name: twitterProfile.name,
                profileImageUrl: twitterProfile.profile_image_url_https,
                followersCount: twitterProfile.followers_count || 0,
                followingCount: twitterProfile.friends_count || 0
            },
            organizations: {
                works_at,
                worked_at,
                member_of,
                invested_in,
                partners_with
            },
            berriPoints,
            pendingIcpAnalysis: orgsNeedingIcp
        }

        await updateJob(jobId, 'complete', 'done', 100, result)
        console.log(`[Onboarding] Analysis complete for @${normalizedUsername}, job ${jobId} marked complete`)
        console.log(`[Onboarding] Orgs found: works_at=${works_at.length}, worked_at=${worked_at.length}, member_of=${member_of.length}`)

    } catch (error: any) {
        console.error(`[Onboarding] Analysis error:`, error)
        const job = await analysisJobs.get(jobId)
        if (job) {
            job.status = 'error'
            job.step = 'error'
            job.error = error.message
            await analysisJobs.set(jobId, job)
        }
    }
}

async function updateJob(
    jobId: string,
    status: 'pending' | 'processing' | 'complete' | 'error',
    step: string,
    progress: number,
    result?: OnboardingResult
) {
    const job = await analysisJobs.get(jobId)
    if (job) {
        job.status = status
        job.step = step
        job.progress = progress
        if (result) job.result = result
        await analysisJobs.set(jobId, job)
        console.log(`[Onboarding] Job ${jobId} updated: ${status} - ${step} (${progress}%)`)
    }
}

async function fetchIcpRelationships(
    orgScreenNames: string[]
): Promise<{
    invested_in: OrgInfo[]
    partners_with: OrgInfo[]
    missingIcp: string[]
}> {
    const result = {
        invested_in: [] as OrgInfo[],
        partners_with: [] as OrgInfo[],
        missingIcp: [] as string[]
    }

    if (orgScreenNames.length === 0) return result

    const ICP_STALE_DAYS = 90

    try {
        // Query Neo4j for ICP data from the orgs, including last updated timestamp
        const query = `
            UNWIND $orgScreenNames as orgName
            OPTIONAL MATCH (org:User)
            WHERE toLower(org.screenName) = toLower(orgName)
            OPTIONAL MATCH (org)-[:INVESTED_IN]->(investedOrg:User)
            OPTIONAL MATCH (org)-[:PARTNERS_WITH]->(partnerOrg:User)
            
            WITH orgName, org, 
                 collect(DISTINCT investedOrg) as investedOrgs,
                 collect(DISTINCT partnerOrg) as partnerOrgs
            
            RETURN 
                collect(DISTINCT {
                    orgName: orgName,
                    hasIcp: org.last_icp_analysis IS NOT NULL,
                    lastUpdated: org.lastUpdated,
                    icpUpdatedAt: org.last_icp_analysis
                }) as orgStatuses,
                [x IN collect(investedOrgs) | x] as allInvestedOrgs,
                [x IN collect(partnerOrgs) | x] as allPartnerOrgs
        `

        const records = await runQuery(query, { orgScreenNames })

        if (records.length > 0) {
            const record = records[0]

            const mapOrgs = (orgs: any[]): OrgInfo[] => {
                // Flatten nested arrays and filter nulls
                const flatOrgs = orgs.flat().filter(o => o)
                return flatOrgs.map(o => ({
                    screenName: o.properties?.screenName || '',
                    name: o.properties?.name || o.properties?.screenName || '',
                    type: o.properties?.orgType,
                    profileImageUrl: o.properties?.profileImageUrl
                }))
            }

            result.invested_in = mapOrgs(record.allInvestedOrgs || [])
            result.partners_with = mapOrgs(record.allPartnerOrgs || [])

            // Check which orgs need ICP analysis (missing or stale > 90 days)
            const now = new Date()
            const staleThreshold = new Date(now.getTime() - ICP_STALE_DAYS * 24 * 60 * 60 * 1000)

            const orgStatuses = record.orgStatuses || []
            result.missingIcp = orgStatuses
                .filter((status: any) => {
                    if (!status.hasIcp) return true // No ICP data

                    // Check if stale
                    const updatedAt = status.icpUpdatedAt || status.lastUpdated
                    if (!updatedAt) return true // No timestamp, consider stale

                    const updateDate = new Date(updatedAt)
                    return updateDate < staleThreshold // Stale if older than 90 days
                })
                .map((status: any) => status.orgName)

            console.log(`[Onboarding] ICP check: ${orgStatuses.length} orgs, ${result.missingIcp.length} need analysis`)
        } else {
            // If query fails, assume all orgs need ICP
            result.missingIcp = orgScreenNames
        }

    } catch (error) {
        console.error('[Onboarding] Error fetching ICP relationships:', error)
        // On error, assume all orgs need ICP analysis
        result.missingIcp = orgScreenNames
    }

    return result
}

async function queueIcpAnalysis(orgScreenNames: string[], requesterPrivyDid: string) {
    const analyzeOrg = async (screenName: string) => {
        try {
            console.log(`[Onboarding] Starting background ICP analysis for @${screenName}`)

            const { createStructuredICPAnalysis, ICPAnalysisConfig } = await import('@/lib/grok')
            const { processICPRelationships } = await import('@/services')

            const icpAnalysis = await createStructuredICPAnalysis(
                screenName,
                ICPAnalysisConfig.FULL
            )

            if (icpAnalysis) {
                await processICPRelationships(screenName, {
                    competitors: icpAnalysis.competitors as string[] | undefined,
                    investors: icpAnalysis.investors as string[] | undefined,
                    partners: icpAnalysis.partners as string[] | undefined,
                    auditor: icpAnalysis.auditor as string[] | undefined
                })
            }

            console.log(`[Onboarding] Completed background ICP analysis for @${screenName}`)
        } catch (error) {
            console.error(`[Onboarding] Background ICP analysis failed for @${screenName}:`, error)
        }
    }

    const concurrency = 3
    for (let i = 0; i < orgScreenNames.length; i += concurrency) {
        const batch = orgScreenNames.slice(i, i + concurrency)
        await Promise.allSettled(batch.map(analyzeOrg))
    }
}

async function updateOnboardingStatus(
    privyDid: string,
    twitterUsername: string,
    classification: any
) {
    const screenNameLower = twitterUsername.toLowerCase()

    // Check if a Twitter user with this screenName already exists (separate from Privy user)
    const checkQuery = `
        MATCH (twitterUser:User)
        WHERE toLower(twitterUser.screenName) = $screenNameLower
        AND twitterUser.privyDid IS NULL
        OPTIONAL MATCH (privyUser:User {privyDid: $privyDid})
        RETURN twitterUser.userId as twitterUserId, 
               privyUser.privyDid as existingPrivyDid,
               privyUser.plan as privyPlan,
               privyUser.subscriptionStatus as privyStatus,
               privyUser.trialStartedAt as trialStartedAt,
               privyUser.trialEndsAt as trialEndsAt,
               privyUser.stripeCustomerId as stripeCustomerId
    `

    const records = await runQuery(checkQuery, { screenNameLower, privyDid })

    if (records.length > 0 && records[0].twitterUserId) {
        // Twitter user exists! Merge Privy data onto it
        console.log(`[Onboarding] Linking Privy ${privyDid} to existing Twitter user ${records[0].twitterUserId}`)

        const mergeQuery = `
            // Update the Twitter user with Privy data
            MATCH (twitterUser:User)
            WHERE toLower(twitterUser.screenName) = $screenNameLower
            SET twitterUser.privyDid = $privyDid,
                twitterUser.onboardingCompleted = true,
                twitterUser.onboardingCompletedAt = datetime(),
                twitterUser.vibe = CASE WHEN $vibe IS NOT NULL THEN $vibe ELSE twitterUser.vibe END,
                twitterUser.department = CASE WHEN $department IS NOT NULL THEN $department ELSE twitterUser.department END,
                twitterUser.plan = COALESCE($privyPlan, twitterUser.plan),
                twitterUser.subscriptionStatus = COALESCE($privyStatus, twitterUser.subscriptionStatus),
                twitterUser.trialStartedAt = CASE WHEN $trialStartedAt IS NOT NULL THEN datetime($trialStartedAt) ELSE twitterUser.trialStartedAt END,
                twitterUser.trialEndsAt = CASE WHEN $trialEndsAt IS NOT NULL THEN datetime($trialEndsAt) ELSE twitterUser.trialEndsAt END,
                twitterUser.stripeCustomerId = COALESCE($stripeCustomerId, twitterUser.stripeCustomerId),
                twitterUser.screenNameLower = $screenNameLower
            
            // Delete the separate Privy-only user if it exists
            WITH twitterUser
            OPTIONAL MATCH (privyOnlyUser:User {privyDid: $privyDid})
            WHERE privyOnlyUser.userId IS NULL OR privyOnlyUser.userId = ''
            DETACH DELETE privyOnlyUser
            
            RETURN twitterUser
        `

        await runQuery(mergeQuery, {
            screenNameLower,
            privyDid,
            vibe: classification.vibe || 'individual',
            department: classification.department || null,
            privyPlan: records[0].privyPlan,
            privyStatus: records[0].privyStatus,
            trialStartedAt: records[0].trialStartedAt?.toString() || null,
            trialEndsAt: records[0].trialEndsAt?.toString() || null,
            stripeCustomerId: records[0].stripeCustomerId
        })

        console.log(`[Onboarding] Successfully merged Privy user into Twitter user for @${twitterUsername}`)
    } else {
        // No separate Twitter user exists, update the Privy user directly
        const query = `
            MATCH (u:User {privyDid: $privyDid})
            SET u.onboardingCompleted = true,
                u.onboardingCompletedAt = datetime(),
                u.screenName = $twitterUsername,
                u.screenNameLower = $screenNameLower,
                u.vibe = $vibe,
                u.department = $department
            RETURN u
        `

        await runQuery(query, {
            privyDid,
            twitterUsername,
            screenNameLower,
            vibe: classification.vibe || 'individual',
            department: classification.department || null
        })
    }
}

function calculateBerriPoints(profile: any, classification: any): number {
    let points = 100
    points += 500

    const followers = profile.followers_count || 0
    const following = profile.friends_count || 0

    if (followers >= 10000) points += 500
    else if (followers >= 5000) points += 250
    else if (followers >= 1000) points += 100

    points += Math.floor(followers / 100) + Math.floor(following / 200)

    const orgCount = [
        ...(classification.current_organizations || []),
        ...(classification.past_organizations || []),
        ...(classification.member_of || [])
    ].length
    points += orgCount * 50

    return points
}
