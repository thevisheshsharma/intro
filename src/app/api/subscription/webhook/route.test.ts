import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const {
  claimStripeEvent,
  completeStripeEvent,
  constructEvent,
  failStripeEvent,
  linkStripeCustomer,
  syncStripeSubscription,
} = vi.hoisted(() => ({
  claimStripeEvent: vi.fn(),
  completeStripeEvent: vi.fn(),
  constructEvent: vi.fn(),
  failStripeEvent: vi.fn(),
  linkStripeCustomer: vi.fn(),
  syncStripeSubscription: vi.fn(),
}))

vi.mock('@/lib/stripe', () => ({
  stripe: { webhooks: { constructEvent } },
}))
vi.mock('@/lib/subscription', () => ({ linkStripeCustomer }))
vi.mock('@/lib/stripe-webhook-ledger', () => ({
  claimStripeEvent,
  completeStripeEvent,
  failStripeEvent,
}))
vi.mock('@/lib/stripe-subscription-sync', () => ({
  getInvoiceSubscriptionId: vi.fn(() => 'sub_invoice'),
  syncStripeSubscription,
}))

import { POST } from './route'

const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET

function request(): Request {
  return new Request('https://app.berri.example/api/subscription/webhook', {
    method: 'POST',
    headers: { 'stripe-signature': 'signed' },
    body: '{}',
  })
}

describe('Stripe webhook route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
    claimStripeEvent.mockResolvedValue({ claimed: true, claimToken: 'claim_123' })
    completeStripeEvent.mockResolvedValue(undefined)
    failStripeEvent.mockResolvedValue(undefined)
    syncStripeSubscription.mockResolvedValue({
      applied: true,
      privyDid: 'did:privy:owner',
    })
  })

  afterEach(() => {
    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret
    }
  })

  it('fails closed when the signing secret is absent', async () => {
    delete process.env.STRIPE_WEBHOOK_SECRET
    const response = await POST(request() as never)

    expect(response.status).toBe(503)
    expect(constructEvent).not.toHaveBeenCalled()
  })

  it('acknowledges duplicate events without applying them again', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_duplicate',
      type: 'customer.subscription.updated',
      created: 100,
      data: { object: { id: 'sub_123', metadata: {} } },
    })
    claimStripeEvent.mockResolvedValue({ claimed: false })

    const response = await POST(request() as never)
    expect(response.status).toBe(200)
    expect(syncStripeSubscription).not.toHaveBeenCalled()
  })

  it('refreshes current Stripe state and completes the event receipt', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_subscription',
      type: 'customer.subscription.updated',
      created: 200,
      data: {
        object: {
          id: 'sub_123',
          metadata: { privyDid: 'did:privy:owner' },
        },
      },
    })

    const response = await POST(request() as never)
    expect(response.status).toBe(200)
    expect(syncStripeSubscription).toHaveBeenCalledWith(
      'sub_123',
      200,
      'did:privy:owner'
    )
    expect(completeStripeEvent).toHaveBeenCalledWith('evt_subscription', 'claim_123')
  })

  it('requires checkout ownership metadata before projection', async () => {
    constructEvent.mockReturnValue({
      id: 'evt_checkout',
      type: 'checkout.session.completed',
      created: 300,
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
          customer: 'cus_123',
          metadata: {},
        },
      },
    })

    const response = await POST(request() as never)
    expect(response.status).toBe(500)
    expect(linkStripeCustomer).not.toHaveBeenCalled()
    expect(failStripeEvent).toHaveBeenCalledWith(
      'evt_checkout',
      'claim_123',
      'PROCESSING_FAILED'
    )
  })
})
