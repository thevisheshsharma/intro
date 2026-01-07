import { NextRequest, NextResponse } from 'next/server'
import { stripe, getPlanFromPriceId, mapStripeStatus } from '@/lib/stripe'
import {
  getSubscriptionByCustomerId,
  updateSubscriptionFromStripe,
  linkStripeCustomer,
} from '@/lib/subscription'
import Stripe from 'stripe'

// Disable body parsing - we need raw body for webhook verification
export const dynamic = 'force-dynamic'

// POST: Handle Stripe webhooks
export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('No Stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`Processing Stripe webhook: ${event.type}`)

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
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Error processing webhook:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id)

  if (session.mode !== 'subscription') {
    console.log('Not a subscription checkout, skipping')
    return
  }

  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID')
    return
  }

  // Get the subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId) as Stripe.Subscription
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = getPlanFromPriceId(priceId)

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
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  console.log(`Subscription activated for customer ${customerId}`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id)

  const customerId = subscription.customer as string
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = getPlanFromPriceId(priceId)

  // Get current period end from the first subscription item (Stripe v20+)
  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : undefined

  await updateSubscriptionFromStripe(customerId, {
    stripeSubscriptionId: subscription.id,
    plan,
    status: mapStripeStatus(subscription.status),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  console.log(`Subscription updated for customer ${customerId}`)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log('Processing subscription deletion:', subscription.id)

  const customerId = subscription.customer as string

  await updateSubscriptionFromStripe(customerId, {
    status: 'canceled',
    cancelAtPeriodEnd: false,
  })

  console.log(`Subscription canceled for customer ${customerId}`)
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log('Processing payment failure:', invoice.id)

  const customerId = invoice.customer as string

  if (!customerId) {
    console.error('No customer ID in invoice')
    return
  }

  await updateSubscriptionFromStripe(customerId, {
    status: 'past_due',
  })

  console.log(`Payment failed for customer ${customerId}`)
}
