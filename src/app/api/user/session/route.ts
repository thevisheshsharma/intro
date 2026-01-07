import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import {
  getSubscription,
  createUserWithTrial,
  isSubscriptionActive,
  getTrialDaysLeft,
  isOnboardingComplete,
} from '@/lib/subscription'

// GET: Get current user's session data (combined profile + subscription)
// This endpoint combines what was previously 2-3 separate API calls
export async function GET(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Fetch subscription (creates with trial if doesn't exist)
    let subscription = await getSubscription(userId)
    if (!subscription) {
      subscription = await createUserWithTrial(userId)
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
        stripeCustomerId: subscription.stripeCustomerId,
      },
      isActive: isSubscriptionActive(subscription),
      trialDaysLeft: getTrialDaysLeft(subscription),
      isTrialing: subscription.status === 'trialing',
      isExpired: subscription.status === 'expired',
      onboardingComplete,
    }

    return NextResponse.json(session)
  } catch (error: any) {
    console.error('Error fetching user session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
