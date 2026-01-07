import { NextRequest, NextResponse } from 'next/server'
import { expireTrials, getExpiringTrials } from '@/lib/subscription'

/**
 * Cron endpoint to expire trials that have ended
 *
 * This endpoint is called daily by Vercel Cron to:
 * 1. Mark expired trials as 'expired'
 * 2. Optionally send reminder emails to users with trials expiring soon
 *
 * Protected by CRON_SECRET to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('[Cron] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Cron not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[Cron] Unauthorized cron request')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Cron] Starting trial expiration check...')

    // Get users with trials expiring in 3 days (for potential reminder emails)
    const expiringTrials = await getExpiringTrials(3)
    console.log(`[Cron] Found ${expiringTrials.length} trials expiring in 3 days`)

    // Expire trials that have ended
    const expiredCount = await expireTrials()
    console.log(`[Cron] Expired ${expiredCount} trials`)

    // TODO: Send reminder emails to users with expiring trials
    // This would integrate with an email service like Resend, SendGrid, etc.
    // for (const trial of expiringTrials) {
    //   if (trial.email) {
    //     await sendTrialExpiringEmail(trial.email, trial.trialEndsAt)
    //   }
    // }

    return NextResponse.json({
      success: true,
      expired: expiredCount,
      expiringIn3Days: expiringTrials.length,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cron] Error in trial expiration:', error)
    return NextResponse.json(
      {
        error: 'Failed to process trial expiration',
        details: error.message
      },
      { status: 500 }
    )
  }
}
