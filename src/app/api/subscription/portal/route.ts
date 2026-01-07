import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { stripe } from '@/lib/stripe'
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

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app/settings/billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating portal session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
