import { NextRequest, NextResponse } from 'next/server'
import { verifyPrivyToken } from '@/lib/privy'
import { stripe, PRICE_IDS } from '@/lib/stripe'
import { ensureUserAccount, linkStripeCustomer } from '@/lib/subscription'
import { STRIPE_TRIAL_DAYS } from '@/lib/commercial'
import { z } from 'zod'
import { parseJsonBody, RequestValidationError } from '@/lib/security/request'
import { createSafeRouteLogger } from '@/lib/safe-logger'

const logger = createSafeRouteLogger('subscription-checkout')
const checkoutSchema = z.object({
  // Growth remains a private rollout until its collaboration controls ship.
  plan: z.literal('founder'),
  interval: z.enum(['monthly', 'annual']),
  source: z.enum(['onboarding', 'pricing', 'billing']).default('pricing'),
}).strict()

// POST: Create Stripe checkout session
export async function POST(request: NextRequest) {
  const { userId, error: authError } = await verifyPrivyToken(request)

  if (authError || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await parseJsonBody(request, checkoutSchema, 4 * 1024)
    const { plan, interval, source } = body

    // Get price ID
    const priceId = PRICE_IDS[plan][interval]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price not configured for this plan' },
        { status: 500 }
      )
    }

    // Ensure the application account exists, but do not start the trial until
    // Stripe has collected a payment method.
    const subscription = await ensureUserAccount(userId)
    if (
      subscription.stripeSubscriptionId &&
      (subscription.status === 'active' || subscription.status === 'trialing')
    ) {
      return NextResponse.json(
        { error: 'You already have an active subscription. Manage it from Billing.' },
        { status: 409 }
      )
    }

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

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const cancelPath = source === 'onboarding'
      ? '/onboarding/complete?checkout=canceled'
      : source === 'billing'
        ? '/app/settings/billing?checkout=canceled'
        : '/pricing?checkout=canceled'

    // Create a card-required trial. Stripe owns the trial dates and converts
    // the subscription automatically at the end unless the user cancels.
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      payment_method_collection: 'always',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${appUrl}/app/settings/billing?checkout=trial-started`,
      cancel_url: `${appUrl}${cancelPath}`,
      metadata: {
        privyDid: userId,
        plan,
        source,
      },
      subscription_data: {
        trial_period_days: STRIPE_TRIAL_DAYS,
        trial_settings: {
          end_behavior: {
            missing_payment_method: 'cancel',
          },
        },
        metadata: {
          privyDid: userId,
          plan,
        },
      },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (error: any) {
    if (error instanceof RequestValidationError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    logger.error('Error creating checkout session:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
