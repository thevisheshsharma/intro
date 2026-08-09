import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createPortalSession, getSubscription, verifyPrivyToken } = vi.hoisted(() => ({
  createPortalSession: vi.fn(),
  getSubscription: vi.fn(),
  verifyPrivyToken: vi.fn(),
}))

vi.mock('@/lib/privy', () => ({ verifyPrivyToken }))
vi.mock('@/lib/subscription', () => ({ getSubscription }))
vi.mock('@/lib/stripe', () => ({
  getAppUrl: () => 'https://app.berri.example',
  stripe: { billingPortal: { sessions: { create: createPortalSession } } },
}))

import { POST } from './route'

const originalPortalConfiguration = process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID

const request = new Request('https://app.berri.example/api/subscription/portal', {
  method: 'POST',
})

describe('Stripe customer portal route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = 'bpc_test'
    verifyPrivyToken.mockResolvedValue({ userId: 'did:privy:owner', error: null })
    getSubscription.mockResolvedValue({ stripeCustomerId: 'cus_server_owned' })
    createPortalSession.mockResolvedValue({ url: 'https://billing.stripe.example/session' })
  })

  afterEach(() => {
    if (originalPortalConfiguration === undefined) {
      delete process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    } else {
      process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID = originalPortalConfiguration
    }
  })

  it('rejects unauthenticated callers before billing lookup', async () => {
    verifyPrivyToken.mockResolvedValue({ userId: null, error: 'invalid' })
    const response = await POST(request as never)

    expect(response.status).toBe(401)
    expect(getSubscription).not.toHaveBeenCalled()
  })

  it('creates the portal from the verified owner billing record', async () => {
    const response = await POST(request as never)

    expect(response.status).toBe(200)
    expect(getSubscription).toHaveBeenCalledWith('did:privy:owner')
    expect(createPortalSession).toHaveBeenCalledWith({
      customer: 'cus_server_owned',
      configuration: 'bpc_test',
      return_url: 'https://app.berri.example/app/settings/billing',
    })
  })

  it('fails closed when the portal configuration is missing', async () => {
    delete process.env.STRIPE_BILLING_PORTAL_CONFIGURATION_ID
    const response = await POST(request as never)

    expect(response.status).toBe(503)
    expect(createPortalSession).not.toHaveBeenCalled()
  })
})
