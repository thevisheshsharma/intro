import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import {
  getSubscription,
  ensureUserAccount,
  isSubscriptionActive,
  getTrialDaysLeft,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// GET: Get current user's subscription
export async function GET(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let subscription = await getSubscription(userId)

    // Ensure the account exists without starting a trial. Stripe Checkout is
    // the only place that creates a paid-plan trial.
    if (!subscription) {
      subscription = await ensureUserAccount(userId)
    }

    return NextResponse.json({
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
      isActive: isSubscriptionActive(subscription),
      trialDaysLeft: getTrialDaysLeft(subscription),
    })
  } catch (error: any) {
    console.error('Subscription lookup failed')
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
