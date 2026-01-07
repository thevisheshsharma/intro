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

        console.log(`[Onboarding Status] Looking for job ${jobId}`)

        let job
        try {
            job = await analysisJobs.get(jobId)
        } catch (dbError: any) {
            console.error(`[Onboarding Status] DB error fetching job ${jobId}:`, dbError.message)
            // Return a pending status on DB error to allow retries
            return NextResponse.json({
                status: 'processing',
                step: 'initializing',
                stepLabel: 'Connecting to database...',
                progress: 5
            })
        }

        if (!job) {
            console.log(`[Onboarding Status] Job ${jobId} not found in DB - may still be initializing`)
            // Return pending instead of 404 for recently created jobs that haven't been written yet
            return NextResponse.json({
                status: 'processing',
                step: 'initializing',
                stepLabel: 'Initializing analysis...',
                progress: 0
            })
        }

        // Clean up old jobs (older than 60 minutes - matching the DB expiry)
        const now = new Date()
        const sixtyMinutesAgo = new Date(now.getTime() - 60 * 60 * 1000)
        if (job.startedAt < sixtyMinutesAgo) {
            await analysisJobs.delete(jobId)
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
