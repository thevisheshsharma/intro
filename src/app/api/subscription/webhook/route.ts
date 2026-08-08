import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId, mapStripeStatus } from '@/lib/stripe'
import {
  getSubscriptionByCustomerId,
  updateSubscriptionFromStripe,
  linkStripeCustomer,
} from '@/lib/subscription'
import Stripe from 'stripe'
import {
  claimStripeEvent,
  completeStripeEvent,
  failStripeEvent,
} from '@/lib/stripe-webhook-ledger'
import { createSafeRouteLogger } from '@/lib/safe-logger'

const logger = createSafeRouteLogger('stripe-webhook')

// Disable body parsing - we need raw body for webhook verification
export const dynamic = 'force-dynamic'

// POST: Handle Stripe webhooks
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    logger.error('Stripe webhook secret is not configured')
    return NextResponse.json({ error: 'Webhook unavailable' }, { status: 503 })
  }

  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    logger.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    )
  } catch (error: any) {
    logger.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const claim = await claimStripeEvent(event.id, event.type)
  if (!claim.claimed || !claim.claimToken) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handlePaymentFailed(invoice)
        break
      }

      default:
        logger.log(`Unhandled event type: ${event.type}`)
    }

    await completeStripeEvent(event.id, claim.claimToken)
    return NextResponse.json({ received: true })
  } catch (error: any) {
    await failStripeEvent(event.id, claim.claimToken, 'PROCESSING_FAILED')
    logger.error('Error processing Stripe webhook')
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  logger.log('Processing checkout.session.completed:', session.id)

  if (session.mode !== 'subscription') {
    logger.log('Not a subscription checkout, skipping')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!customerId || !subscriptionId) {
    logger.error('Missing customer or subscription ID')
    return
  }

  // Get the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = getPlanFromPriceId(priceId)
  if (!plan) {
    throw new Error('Stripe subscription uses an unknown price')
  }

  // Link Privy user to Stripe customer if metadata exists
  const privyDid = session.metadata?.privyDid || subscription.metadata?.privyDid
  if (privyDid) {
    await linkStripeCustomer(privyDid, customerId)
  }

  // Get current period end from the first subscription item (Stripe v20+)
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : undefined

  // Update subscription in Neo4j
  await updateSubscriptionFromStripe(customerId, {
    stripeSubscriptionId: subscriptionId,
    plan,
    status: mapStripeStatus(subscription.status),
    trialStartedAt: toIsoDate(subscription.trial_start),
    trialEndsAt: toIsoDate(subscription.trial_end),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  logger.log(`Subscription activated for customer ${customerId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  logger.log('Processing subscription update:', subscription.id)

  const customerId = subscription.customer as string
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = getPlanFromPriceId(priceId)
  if (!plan) {
    throw new Error('Stripe subscription uses an unknown price')
  }

  // Get current period end from the first subscription item (Stripe v20+)
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : undefined

  await updateSubscriptionFromStripe(customerId, {
    stripeSubscriptionId: subscription.id,
    plan,
    status: mapStripeStatus(subscription.status),
    trialStartedAt: toIsoDate(subscription.trial_start),
    trialEndsAt: toIsoDate(subscription.trial_end),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  logger.log(`Subscription updated for customer ${customerId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  logger.log('Processing subscription deletion:', subscription.id)

  const customerId = subscription.customer as string

  await updateSubscriptionFromStripe(customerId, {
    status: 'canceled',
    cancelAtPeriodEnd: false,
  })

  logger.log(`Subscription canceled for customer ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  logger.log('Processing payment failure:', invoice.id)

  const customerId = invoice.customer as string

  if (!customerId) {
    logger.error('No customer ID in invoice')
    return
  }

  await updateSubscriptionFromStripe(customerId, {
    status: 'past_due',
  })

  logger.log(`Payment failed for customer ${customerId}`)
}

function toIsoDate(timestamp: number | null): string | null {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null
}
