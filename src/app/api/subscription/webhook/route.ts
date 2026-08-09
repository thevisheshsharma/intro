import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { linkStripeCustomer } from '@/lib/subscription'
import Stripe from 'stripe'
import {
  claimStripeEvent,
  completeStripeEvent,
  failStripeEvent,
} from '@/lib/stripe-webhook-ledger'
import { createSafeRouteLogger } from '@/lib/safe-logger'
import {
  getInvoiceSubscriptionId,
  syncStripeSubscription,
} from '@/lib/stripe-subscription-sync'

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

  const claim = await claimStripeEvent(event.id, event.type, event.created)
  if (!claim.claimed || !claim.claimToken) {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const subscriptionId = getObjectId(session.subscription)
        const customerId = getObjectId(session.customer)
        const privyDid = session.metadata?.privyDid
        if (!subscriptionId || !customerId || !privyDid) {
          throw new Error('Stripe checkout is missing billing ownership metadata')
        }

        await linkStripeCustomer(privyDid, customerId)
        await syncStripeSubscription(subscriptionId, event.created, privyDid)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
      case 'customer.subscription.paused':
      case 'customer.subscription.resumed':
      case 'customer.subscription.trial_will_end': {
        const subscription = event.data.object as Stripe.Subscription
        await syncStripeSubscription(
          subscription.id,
          event.created,
          subscription.metadata?.privyDid
        )
        break
      }

      case 'invoice.paid':
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId = getInvoiceSubscriptionId(invoice)
        if (subscriptionId) {
          await syncStripeSubscription(subscriptionId, event.created)
        }
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

function getObjectId(value: string | { id: string } | null): string | null {
  if (!value) return null
  return typeof value === 'string' ? value : value.id
}
