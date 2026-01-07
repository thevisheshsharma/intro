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

        const totalJobs = await analysisJobs.size()
        console.log(`[Onboarding Status] Looking for job ${jobId} - total jobs in DB: ${totalJobs}`)

        const job = await analysisJobs.get(jobId)

        if (!job) {
            console.log(`[Onboarding Status] Job ${jobId} not found in DB.`)
            return NextResponse.json({
                error: 'Job not found',
                status: 'not_found'
            }, { status: 404 })
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
