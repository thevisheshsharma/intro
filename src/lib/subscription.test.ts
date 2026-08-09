import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getBillingProjectionByPrivyDid,
  getLegacyBillingProjection,
} = vi.hoisted(() => ({
  getBillingProjectionByPrivyDid: vi.fn(),
  getLegacyBillingProjection: vi.fn(),
}))

vi.mock('./billing-repository', () => ({
  ensureBillingAccount: vi.fn(),
  getBillingProjectionByCustomerId: vi.fn(),
  getBillingProjectionByPrivyDid,
  getExpiringStripeTrials: vi.fn(),
  getLegacyBillingProjection,
  setStripeCustomerId: vi.fn(),
}))

vi.mock('./neo4j', () => ({ getDriver: vi.fn() }))

import { getSubscription } from './subscription'

const emptyProjection = {
  privyDid: 'did:privy:owner',
  stripeCustomerId: 'cus_123',
  stripeSubscriptionId: null,
  plan: null,
  status: null,
  trialStartedAt: null,
  trialEndsAt: null,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
}

describe('subscription projection reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getBillingProjectionByPrivyDid.mockResolvedValue(emptyProjection)
    getLegacyBillingProjection.mockResolvedValue(null)
  })

  it('prefers the dedicated billing projection', async () => {
    getBillingProjectionByPrivyDid.mockResolvedValue({
      ...emptyProjection,
      stripeSubscriptionId: 'sub_current',
      plan: 'founder',
      status: 'active',
    })

    await expect(getSubscription('did:privy:owner')).resolves.toEqual(
      expect.objectContaining({ stripeSubscriptionId: 'sub_current', status: 'active' })
    )
    expect(getLegacyBillingProjection).not.toHaveBeenCalled()
  })

  it('temporarily falls back to a legacy Stripe-backed subscription', async () => {
    getLegacyBillingProjection.mockResolvedValue({
      ...emptyProjection,
      stripeSubscriptionId: 'sub_legacy',
      plan: 'founder',
      status: 'trialing',
    })

    await expect(getSubscription('did:privy:owner')).resolves.toEqual(
      expect.objectContaining({ stripeSubscriptionId: 'sub_legacy', status: 'trialing' })
    )
  })

  it('does not honor an application-created legacy trial without Stripe ownership', async () => {
    getLegacyBillingProjection.mockResolvedValue({
      ...emptyProjection,
      stripeCustomerId: null,
      plan: 'founder',
      status: 'trialing',
    })

    await expect(getSubscription('did:privy:owner')).resolves.toEqual(emptyProjection)
  })
})
