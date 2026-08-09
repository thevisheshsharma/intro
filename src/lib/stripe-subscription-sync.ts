import type Stripe from 'stripe'
import { upsertStripeSubscriptionProjection } from './billing-repository'
import { linkStripeCustomer } from './subscription'
import { getPlanFromPriceId, mapStripeStatus, stripe } from './stripe'

function objectId(value: string | { id: string }): string {
  return typeof value === 'string' ? value : value.id
}

function toIsoDate(timestamp: number | null): string | null {
  return timestamp ? new Date(timestamp * 1000).toISOString() : null
}

export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscription = invoice.parent?.subscription_details?.subscription
  return subscription ? objectId(subscription) : null
}

export async function projectStripeSubscription(
  subscription: Stripe.Subscription,
  stripeEventCreated: number,
  privyDid?: string
): Promise<{ applied: boolean; privyDid: string }> {
  const customerId = objectId(subscription.customer)
  const firstItem = subscription.items.data[0]
  const priceId = firstItem?.price.id
  const plan = priceId ? getPlanFromPriceId(priceId) : null

  if (!plan || !priceId) {
    throw new Error('Stripe subscription uses an unknown price')
  }

  const ownerDid = privyDid || subscription.metadata?.privyDid
  if (ownerDid) {
    await linkStripeCustomer(ownerDid, customerId)
  }

  const currentPeriodEnd = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null

  return upsertStripeSubscriptionProjection({
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    stripeStatus: subscription.status,
    plan,
    status: mapStripeStatus(subscription.status),
    trialStartedAt: toIsoDate(subscription.trial_start),
    trialEndsAt: toIsoDate(subscription.trial_end),
    currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    stripeEventCreated,
  })
}

export async function syncStripeSubscription(
  stripeSubscriptionId: string,
  stripeEventCreated: number,
  privyDid?: string
): Promise<{ applied: boolean; privyDid: string }> {
  const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)
  return projectStripeSubscription(subscription, stripeEventCreated, privyDid)
}
