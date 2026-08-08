import { runQuery } from '@/lib/neo4j'

export interface RateLimitPolicy {
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number
}

export async function consumeRateLimit(
  actorId: string,
  scope: string,
  policy: RateLimitPolicy,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const windowMilliseconds = policy.windowSeconds * 1000
  const windowStartMilliseconds =
    Math.floor(now.getTime() / windowMilliseconds) * windowMilliseconds
  const windowStart = new Date(windowStartMilliseconds)
  const key = `${scope}:${actorId}:${windowStart.toISOString()}`

  const results = await runQuery(
    `
      MERGE (limit:ApiRateLimit {key: $key})
      ON CREATE SET limit.count = 0,
                    limit.actorId = $actorId,
                    limit.scope = $scope,
                    limit.windowStart = datetime($windowStart),
                    limit.expiresAt = datetime($expiresAt)
      SET limit.count = limit.count + 1
      RETURN limit.count AS count
    `,
    {
      key,
      actorId,
      scope,
      windowStart: windowStart.toISOString(),
      expiresAt: new Date(windowStartMilliseconds + windowMilliseconds).toISOString(),
    }
  )

  const rawCount = results[0]?.count
  const count = typeof rawCount?.toNumber === 'function'
    ? rawCount.toNumber()
    : Number(rawCount ?? policy.limit + 1)
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((windowStartMilliseconds + windowMilliseconds - now.getTime()) / 1000)
  )

  return {
    allowed: count <= policy.limit,
    limit: policy.limit,
    remaining: Math.max(0, policy.limit - count),
    retryAfterSeconds,
  }
}
