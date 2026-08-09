import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { getAppUrl, stripe } from '@/lib/stripe'
import { getSubscription } from '@/lib/subscription'

// POST: Create Stripe customer portal session
export async function POST(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const subscription = await getSubscription(userId)

    if (!subscription?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No billing account found. Please subscribe first.' },
        { status: 400 }
      )
    }

    const portalConfigurationId = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    if (!portalConfigurationId) {
      return NextResponse.json(
        { error: 'Billing portal is not configured.' },
        { status: 503 }
      )
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      configuration: portalConfigurationId,
      return_url: `${getAppUrl()}/app/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Portal session creation failed')
    return NextResponse.json(
      { error: 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
