import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  checkoutCreate,
  customerCreate,
  ensureUserAccount,
  linkStripeCustomer,
  parseJsonBody,
  verifyPrivyToken,
} = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  customerCreate: vi.fn(),
  ensureUserAccount: vi.fn(),
  linkStripeCustomer: vi.fn(),
  parseJsonBody: vi.fn(),
  verifyPrivyToken: vi.fn(),
}))

vi.mock('@/lib/privy', () => ({ verifyPrivyToken }))
vi.mock('@/lib/subscription', () => ({ ensureUserAccount, linkStripeCustomer }))
vi.mock('@/lib/stripe', () => ({
  getAppUrl: () => 'https://app.berri.example',
  PRICE_IDS: {
    founder: { monthly: 'price_monthly', annual: 'price_annual' },
  },
  stripe: {
    customers: { create: customerCreate },
    checkout: { sessions: { create: checkoutCreate } },
  },
}))
vi.mock('@/lib/security/request', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/security/request')>()
  return { ...actual, parseJsonBody }
})

import { POST } from './route'

const request = new Request('https://app.berri.example/api/subscription/checkout', {
  method: 'POST',
})

describe('Stripe checkout route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyPrivyToken.mockResolvedValue({ userId: 'did:privy:owner', error: null })
    parseJsonBody.mockResolvedValue({
      plan: 'founder',
      interval: 'monthly',
      source: 'billing',
    })
    ensureUserAccount.mockResolvedValue({
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      status: null,
    })
    customerCreate.mockResolvedValue({ id: 'cus_123' })
    checkoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.example/session' })
  })

  it('rejects unauthenticated checkout before provider calls', async () => {
    verifyPrivyToken.mockResolvedValue({ userId: null, error: 'invalid' })
    const response = await POST(request as never)

    expect(response.status).toBe(401)
    expect(customerCreate).not.toHaveBeenCalled()
    expect(checkoutCreate).not.toHaveBeenCalled()
  })

  it('creates an idempotent card-required Stripe trial', async () => {
    const response = await POST(request as never)

    expect(response.status).toBe(200)
    expect(linkStripeCustomer).toHaveBeenCalledWith('did:privy:owner', 'cus_123')
    expect(customerCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { privyDid: 'did:privy:owner' } }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^berri-customer-/) })
    )
    expect(checkoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        mode: 'subscription',
        payment_method_collection: 'always',
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
      }),
      expect.objectContaining({ idempotencyKey: expect.stringMatching(/^berri-checkout-/) })
    )
  })

  it('does not create another checkout for an active subscription', async () => {
    ensureUserAccount.mockResolvedValue({
      stripeCustomerId: 'cus_123',
      stripeSubscriptionId: 'sub_123',
      status: 'active',
    })

    const response = await POST(request as never)
    expect(response.status).toBe(409)
    expect(checkoutCreate).not.toHaveBeenCalled()
  })

  it('uses distinct idempotency keys when the checkout return path changes', async () => {
    await POST(request as never)
    parseJsonBody.mockResolvedValue({
      plan: 'founder',
      interval: 'monthly',
      source: 'onboarding',
    })
    await POST(request as never)

    const firstKey = checkoutCreate.mock.calls[0][1].idempotencyKey
    const secondKey = checkoutCreate.mock.calls[1][1].idempotencyKey
    expect(firstKey).not.toBe(secondKey)
  })
})
