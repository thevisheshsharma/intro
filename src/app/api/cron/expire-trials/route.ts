import { NextRequest, NextResponse } from 'next/server'
import { expireTrials, getExpiringTrials } from '@/lib/subscription'
import { requireCronAccess } from '@/lib/security/api-access'

export const dynamic = 'force-dynamic'

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
    const unauthorized = requireCronAccess(request)
    if (unauthorized) return unauthorized

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
    console.error('[Cron] Trial expiration failed')
    return NextResponse.json(
      {
        error: 'Failed to process trial expiration'
      },
      { status: 500 }
    )
  }
}
