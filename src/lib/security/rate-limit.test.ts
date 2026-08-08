import { beforeEach, describe, expect, it, vi } from 'vitest'

const { runQuery } = vi.hoisted(() => ({ runQuery: vi.fn() }))
vi.mock('@/lib/neo4j', () => ({ runQuery }))

import { consumeRateLimit } from './rate-limit'

describe('durable rate limits', () => {
  beforeEach(() => vi.clearAllMocks())

  it('increments a fixed-window Neo4j counter and reports remaining quota', async () => {
    runQuery.mockResolvedValue([{ count: { toNumber: () => 3 } }])
    const result = await consumeRateLimit(
      'did:privy:actor',
      'pathfinder',
      { limit: 5, windowSeconds: 60 },
      new Date('2026-08-08T00:00:30.000Z')
    )

    expect(result).toEqual({
      allowed: true,
      limit: 5,
      remaining: 2,
      retryAfterSeconds: 30,
    })
    expect(runQuery).toHaveBeenCalledWith(
      expect.stringContaining('MERGE (limit:ApiRateLimit {key: $key})'),
      expect.objectContaining({
        actorId: 'did:privy:actor',
        scope: 'pathfinder',
        windowStart: '2026-08-08T00:00:00.000Z',
      })
    )
  })

  it('denies calls beyond the configured limit', async () => {
    runQuery.mockResolvedValue([{ count: 6 }])
    const result = await consumeRateLimit(
      'did:privy:actor',
      'people-intel',
      { limit: 5, windowSeconds: 60 },
      new Date('2026-08-08T00:00:59.500Z')
    )

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.retryAfterSeconds).toBe(1)
  })
})
