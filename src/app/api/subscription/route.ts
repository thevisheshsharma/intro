import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import {
  getSubscription,
  createUserWithTrial,
  isSubscriptionActive,
  getTrialDaysLeft,
} from '@/lib/subscription'

// GET: Get current user's subscription
export async function GET(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    let subscription = await getSubscription(userId)

    // If no subscription exists, create one with trial
    if (!subscription) {
      subscription = await createUserWithTrial(userId)
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
    console.error('Error fetching subscription:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch subscription' },
      { status: 500 }
    )
  }
}
