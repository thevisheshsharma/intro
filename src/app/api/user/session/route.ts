import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import {
  getSubscription,
  ensureUserAccount,
  isSubscriptionActive,
  getTrialDaysLeft,
  isOnboardingComplete,
} from '@/lib/subscription'

export const dynamic = 'force-dynamic'

// GET: Get current user's session data (combined profile + subscription)
// This endpoint combines what was previously 2-3 separate API calls
export async function GET(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch subscription without implicitly starting the trial clock.
    let subscription = await getSubscription(userId)
    if (!subscription) {
      subscription = await ensureUserAccount(userId)
    }

    // Check onboarding status
    const onboardingComplete = await isOnboardingComplete(userId)

    // Build session response
    const session = {
      userId,
      subscription: {
        plan: subscription.plan,
        status: subscription.status,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canManageBilling: Boolean(subscription.stripeCustomerId),
      },
      isActive: isSubscriptionActive(subscription),
      trialDaysLeft: getTrialDaysLeft(subscription),
      isTrialing: subscription.status === 'trialing',
      isExpired: subscription.status === 'expired',
      onboardingComplete,
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('User session lookup failed')
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
