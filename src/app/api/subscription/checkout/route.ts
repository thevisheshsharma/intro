import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { getSubscription, linkStripeCustomer } from '@/lib/subscription'
import type { BillingInterval, PlanType } from '@/lib/subscription'

interface CheckoutRequest {
  plan: 'founder' | 'standard'
  interval: BillingInterval
}

// POST: Create Stripe checkout session
export async function POST(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body: CheckoutRequest = await request.json()
    const { plan, interval } = body

    // Validate plan and interval
    if (!['founder', 'standard'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    if (!['monthly', 'annual'].includes(interval)) {
      return NextResponse.json({ error: 'Invalid billing interval' }, { status: 400 })
    }

    // Get price ID
    const priceId = PRICE_IDS[plan][interval]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 500 }
      )
    }

    // Get existing subscription to check for Stripe customer
    const subscription = await getSubscription(userId)
    let customerId = subscription?.stripeCustomerId

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: {
          privyDid: userId,
        },
      })
      customerId = customer.id
      await linkStripeCustomer(userId, customerId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/app?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/pricing?checkout=canceled`,
      subscription_data: {
        metadata: {
          privyDid: userId,
          plan,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    console.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
