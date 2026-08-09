import { NextRequest, NextResponse } from 'next/server'
import { getExpiringTrials } from '@/lib/subscription'
import { listStripeSubscriptionIdsForReconciliation } from '@/lib/billing-repository'
import { requireCronAccess } from '@/lib/security/api-access'
import { syncStripeSubscription } from '@/lib/stripe-subscription-sync'

export const dynamic = 'force-dynamic'

/**
 * Reconcile current Stripe subscriptions and identify trials nearing their end.
 * The bounded batch keeps the route suitable for a serverless cron invocation.
 */
export async function GET(request: NextRequest) {
  try {
    const unauthorized = requireCronAccess(request)
    if (unauthorized) return unauthorized

    const subscriptionIds = await listStripeSubscriptionIdsForReconciliation(25)
    const reconciliationTimestamp = Math.floor(Date.now() / 1000)
    const reconciliationResults = await Promise.allSettled(
      subscriptionIds.map(subscriptionId =>
        syncStripeSubscription(subscriptionId, reconciliationTimestamp)
      )
    )
    const reconciled = reconciliationResults.filter(result => result.status === 'fulfilled').length
    const failed = reconciliationResults.length - reconciled
    const expiringTrials = await getExpiringTrials(3)

    return NextResponse.json({
      success: true,
      reconciled,
      failed,
      expiringIn3Days: expiringTrials.length,
      timestamp: new Date().toISOString(),
    })
  } catch {
    console.error('[Stripe reconciliation] operation failed')
    return NextResponse.json(
      { error: 'Failed to reconcile Stripe subscriptions' },
      { status: 500 }
    )
  }
}
