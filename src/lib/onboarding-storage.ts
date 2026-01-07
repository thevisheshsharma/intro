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

// Global job storage - survives across route handlers
declare global {
    var onboardingJobs: Map<string, OnboardingJob> | undefined
}

// Use global to persist across hot reloads in dev
export const analysisJobs: Map<string, OnboardingJob> =
    global.onboardingJobs || (global.onboardingJobs = new Map())

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
