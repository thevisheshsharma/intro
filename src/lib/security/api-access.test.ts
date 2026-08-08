import { beforeEach, describe, expect, it, vi } from 'vitest'

const { verifyPrivyToken, getSubscription, consumeRateLimit } = vi.hoisted(() => ({
  verifyPrivyToken: vi.fn(),
  getSubscription: vi.fn(),
  consumeRateLimit: vi.fn(),
}))

vi.mock('@/lib/privy', () => ({ verifyPrivyToken }))
vi.mock('@/lib/subscription', () => ({ getSubscription }))
vi.mock('./rate-limit', () => ({ consumeRateLimit }))

import { requireUserAccess } from './api-access'

const request = new Request('http://localhost/api/test')

describe('requireUserAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyPrivyToken.mockResolvedValue({ userId: 'did:privy:actor', error: null })
    getSubscription.mockResolvedValue({
      privyDid: 'did:privy:actor',
      plan: 'standard',
      status: 'active',
    })
    consumeRateLimit.mockResolvedValue({
      allowed: true,
      limit: 20,
      remaining: 19,
      retryAfterSeconds: 60,
    })
  })

  it('rejects an unauthenticated caller before database checks', async () => {
    verifyPrivyToken.mockResolvedValue({ userId: null, error: 'Invalid token' })
    const result = await requireUserAccess(request, { feature: 'pathfinder' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(401)
    expect(getSubscription).not.toHaveBeenCalled()
  })

  it('enforces feature entitlement from trusted subscription state', async () => {
    getSubscription.mockResolvedValue({
      privyDid: 'did:privy:actor',
      plan: 'founder',
      status: 'active',
    })
    const result = await requireUserAccess(request, { feature: 'teamTools' })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.response.status).toBe(403)
  })

  it('returns retry metadata when the durable quota is exhausted', async () => {
    consumeRateLimit.mockResolvedValue({
      allowed: false,
      limit: 20,
      remaining: 0,
      retryAfterSeconds: 45,
    })
    const result = await requireUserAccess(request, {
      feature: 'pathfinder',
      rateLimit: { scope: 'pathfinder', limit: 10, windowSeconds: 3600 },
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.response.status).toBe(429)
      expect(result.response.headers.get('Retry-After')).toBe('45')
    }
    expect(consumeRateLimit).toHaveBeenCalledWith(
      'did:privy:actor',
      'pathfinder',
      expect.objectContaining({ limit: 20 })
    )
  })

  it('returns the verified actor after all checks pass', async () => {
    const result = await requireUserAccess(request, {
      feature: 'pathfinder',
      rateLimit: { scope: 'pathfinder', limit: 10, windowSeconds: 3600 },
    })

    expect(result).toEqual(expect.objectContaining({
      ok: true,
      actor: expect.objectContaining({ userId: 'did:privy:actor' }),
    }))
  })
})
