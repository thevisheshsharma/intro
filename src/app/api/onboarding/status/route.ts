import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { analysisJobs, stepLabels } from '@/lib/onboarding-storage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const { userId, error: authError } = await verifyPrivyToken(request)
        if (authError || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const jobId = searchParams.get('jobId')

        if (!jobId) {
            return NextResponse.json({ error: 'jobId required' }, { status: 400 })
        }

        // Verify this job belongs to the user
        if (!jobId.includes(userId)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        }

        console.log(`[Onboarding Status] Looking for job ${jobId} - jobs in memory: ${analysisJobs.size}`)

        const job = analysisJobs.get(jobId)

        if (!job) {
            console.log(`[Onboarding Status] Job ${jobId} not found. Available jobs:`, Array.from(analysisJobs.keys()))
            return NextResponse.json({
                error: 'Job not found',
                status: 'not_found'
            }, { status: 404 })
        }

        // Clean up old jobs (older than 30 minutes)
        const now = new Date()
        const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
        if (job.startedAt < thirtyMinutesAgo) {
            analysisJobs.delete(jobId)
            return NextResponse.json({
                error: 'Job expired',
                status: 'expired'
            }, { status: 410 })
        }

        console.log(`[Onboarding Status] Job ${jobId} status: ${job.status}, step: ${job.step}, progress: ${job.progress}`)

        return NextResponse.json({
            status: job.status,
            step: job.step,
            stepLabel: stepLabels[job.step] || job.step,
            progress: job.progress,
            result: job.status === 'complete' ? job.result : undefined,
            error: job.status === 'error' ? job.error : undefined
        })

    } catch (error: any) {
        console.error('Onboarding status error:', error)
        return NextResponse.json({
            error: 'Failed to get status',
            details: error.message
        }, { status: 500 })
    }
}
