// Shared storage for onboarding analysis jobs
// Using a module-level Map that persists across imports

export interface OnboardingJob {
    status: 'pending' | 'processing' | 'complete' | 'error'
    step: string
    progress: number
    result?: OnboardingResult
    error?: string
    startedAt: Date
}

export interface OnboardingResult {
    vibe: string
    twitterProfile: {
        screenName: string
        name: string
        profileImageUrl?: string
        followersCount: number
        followingCount: number
    }
    organizations: {
        works_at: OrgInfo[]
        worked_at: OrgInfo[]
        member_of: OrgInfo[]
        invested_in: OrgInfo[]
        partners_with: OrgInfo[]
    }
    berriPoints: number
    pendingIcpAnalysis: string[]
}

export interface OrgInfo {
    screenName: string
    name: string
    type?: string
    profileImageUrl?: string
}

import { runQuery } from './neo4j'

// Global job storage - persists in Neo4j for serverless environments
export const analysisJobs = {
    async get(jobId: string): Promise<OnboardingJob | undefined> {
        try {
            const query = `
                MATCH (j:OnboardingJob {jobId: $jobId})
                RETURN j
            `
            const results = await runQuery(query, { jobId })
            if (results.length === 0) return undefined

            // Handle both direct properties and nested .properties object
            const node = results[0].j
            const props = node?.properties || node

            if (!props || !props.status) {
                console.warn(`[OnboardingStorage] Invalid job data for ${jobId}:`, props)
                return undefined
            }

            return {
                status: props.status,
                step: props.step,
                progress: typeof props.progress === 'object' ? props.progress.low : props.progress,
                error: props.error || undefined,
                result: props.result ? JSON.parse(props.result) : undefined,
                startedAt: new Date(props.startedAt)
            }
        } catch (error: any) {
            console.error(`[OnboardingStorage] Error getting job ${jobId}:`, error.message)
            return undefined
        }
    },

    async set(jobId: string, job: OnboardingJob): Promise<void> {
        try {
            const query = `
                MERGE (j:OnboardingJob {jobId: $jobId})
                SET j.status = $status,
                    j.step = $step,
                    j.progress = toInteger($progress),
                    j.error = $error,
                    j.startedAt = $startedAt,
                    j.result = $result,
                    j.expiresAt = datetime() + duration({minutes: 60})
            `
            await runQuery(query, {
                jobId,
                status: job.status,
                step: job.step,
                progress: job.progress,
                error: job.error || null,
                startedAt: job.startedAt.toISOString(),
                result: job.result ? JSON.stringify(job.result) : null
            })
            console.log(`[OnboardingStorage] Job ${jobId} updated: ${job.status} - ${job.step}`)
        } catch (error: any) {
            console.error(`[OnboardingStorage] Error setting job ${jobId}:`, error.message)
            throw error // Re-throw to propagate to caller
        }
    },

    async size(): Promise<number> {
        const query = `MATCH (j:OnboardingJob) RETURN count(j) as count`
        const result = await runQuery(query)
        return result[0]?.count?.low || result[0]?.count || 0
    },

    async delete(jobId: string): Promise<void> {
        const query = `MATCH (j:OnboardingJob {jobId: $jobId}) DETACH DELETE j`
        await runQuery(query, { jobId })
    }
}

// Step labels for UI display  
export const stepLabels: Record<string, string> = {
    initializing: 'Setting up your account...',
    profile: 'Creating your profile...',
    fetching: 'Fetching your Twitter profile...',
    classifying: 'Analyzing your vibe...',
    extracting_orgs: 'Discovering your organizations...',
    checking_relationships: 'Mapping your network...',
    saving: 'Saving your data...',
    done: 'Analysis complete!',
    error: 'Something went wrong'
}
