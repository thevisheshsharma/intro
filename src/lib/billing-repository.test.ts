import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runQuery } = vi.hoisted(() => ({ runQuery: vi.fn() }))

vi.mock('./neo4j', () => ({ runQuery }))

import { upsertStripeSubscriptionProjection } from './billing-repository'

describe('billing repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    runQuery.mockResolvedValue([{ applied: true, privyDid: 'did:privy:owner' }])
  })

  it('separates the subscription merge from the following optional match', async () => {
    await upsertStripeSubscriptionProjection({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      stripePriceId: 'price_123',
      stripeStatus: 'trialing',
      plan: 'founder',
      status: 'trialing',
      trialStartedAt: '2026-08-09T10:00:00.000Z',
      trialEndsAt: '2026-08-23T10:00:00.000Z',
      currentPeriodEnd: '2026-08-23T10:00:00.000Z',
      cancelAtPeriodEnd: false,
      stripeEventCreated: 1_786_273_200,
    })

    const query = runQuery.mock.calls[0][0] as string
    expect(query).toMatch(
      /ON CREATE SET subscription\.createdAt = datetime\(\)\s+WITH account, subscription\s+OPTIONAL MATCH/
    )
  })
})
