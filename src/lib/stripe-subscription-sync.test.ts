import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Stripe from 'stripe'

const {
  getPlanFromPriceId,
  linkStripeCustomer,
  mapStripeStatus,
  retrieveSubscription,
  upsertStripeSubscriptionProjection,
} = vi.hoisted(() => ({
  getPlanFromPriceId: vi.fn(),
  linkStripeCustomer: vi.fn(),
  mapStripeStatus: vi.fn(),
  retrieveSubscription: vi.fn(),
  upsertStripeSubscriptionProjection: vi.fn(),
}))

vi.mock('./billing-repository', () => ({ upsertStripeSubscriptionProjection }))
vi.mock('./subscription', () => ({ linkStripeCustomer }))
vi.mock('./stripe', () => ({
  getPlanFromPriceId,
  mapStripeStatus,
  stripe: { subscriptions: { retrieve: retrieveSubscription } },
}))

import {
  getInvoiceSubscriptionId,
  projectStripeSubscription,
  syncStripeSubscription,
} from './stripe-subscription-sync'

function stripeSubscription(
  overrides: Partial<Stripe.Subscription> = {}
): Stripe.Subscription {
  return {
    id: 'sub_123',
    customer: 'cus_123',
    status: 'trialing',
    metadata: { privyDid: 'did:privy:owner' },
    trial_start: 1_700_000_000,
    trial_end: 1_701_209_600,
    cancel_at_period_end: false,
    items: {
      data: [{
        price: { id: 'price_founder' },
        current_period_end: 1_701_209_600,
      }],
    },
    ...overrides,
  } as Stripe.Subscription
}

describe('Stripe subscription synchronization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPlanFromPriceId.mockReturnValue('founder')
    mapStripeStatus.mockReturnValue('trialing')
    upsertStripeSubscriptionProjection.mockResolvedValue({
      applied: true,
      privyDid: 'did:privy:owner',
    })
  })

  it('projects canonical Stripe state onto the linked billing account', async () => {
    await projectStripeSubscription(stripeSubscription(), 1_700_000_100)

    expect(linkStripeCustomer).toHaveBeenCalledWith('did:privy:owner', 'cus_123')
    expect(upsertStripeSubscriptionProjection).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeCustomerId: 'cus_123',
        stripeSubscriptionId: 'sub_123',
        stripePriceId: 'price_founder',
        plan: 'founder',
        status: 'trialing',
        stripeEventCreated: 1_700_000_100,
      })
    )
  })

  it('retrieves current Stripe state rather than trusting an event snapshot', async () => {
    retrieveSubscription.mockResolvedValue(stripeSubscription({ status: 'active' }))
    await syncStripeSubscription('sub_123', 1_700_000_200)

    expect(retrieveSubscription).toHaveBeenCalledWith('sub_123')
    expect(upsertStripeSubscriptionProjection).toHaveBeenCalled()
  })

  it('rejects subscriptions using unconfigured prices', async () => {
    getPlanFromPriceId.mockReturnValue(null)
    await expect(projectStripeSubscription(stripeSubscription(), 1)).rejects.toThrow(
      'unknown price'
    )
    expect(upsertStripeSubscriptionProjection).not.toHaveBeenCalled()
  })

  it('extracts subscription IDs from Stripe v20 invoice parents', () => {
    const invoice = {
      parent: {
        subscription_details: { subscription: 'sub_invoice' },
      },
    } as Stripe.Invoice
    expect(getInvoiceSubscriptionId(invoice)).toBe('sub_invoice')
  })
})
