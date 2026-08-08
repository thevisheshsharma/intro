import { NextResponse } from 'next/server'
import type { FeatureKey } from '@/lib/features'
import { canAccessFeature } from '@/lib/features'
import { verifyPrivyToken } from '@/lib/privy'
import { getSubscription, type Subscription } from '@/lib/subscription'
import { consumeRateLimit, type RateLimitPolicy } from './rate-limit'
import { hasValidBearerSecret, hasValidSecret } from './secrets'

export interface AuthorizedActor {
  userId: string
  subscription?: Subscription
}

export type AccessResult =
  | { ok: true; actor: AuthorizedActor }
  | { ok: false; response: NextResponse }

interface UserAccessOptions {
  feature?: FeatureKey
  rateLimit?: RateLimitPolicy & { scope: string }
}

export const COST_BEARING_RATE_LIMITS = {
  pathfinder: { scope: 'pathfinder', limit: 20, windowSeconds: 60 * 60 },
  peopleIntel: { scope: 'people-intel', limit: 10, windowSeconds: 60 * 60 },
  companyIntel: { scope: 'company-intel', limit: 10, windowSeconds: 60 * 60 },
  socialProxy: { scope: 'social-proxy', limit: 30, windowSeconds: 60 * 60 },
  followerSync: { scope: 'follower-sync', limit: 2, windowSeconds: 24 * 60 * 60 },
  onboarding: { scope: 'onboarding-analysis', limit: 3, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitPolicy & { scope: string }>

function jsonError(error: string, status: number, headers?: HeadersInit): NextResponse {
  return NextResponse.json({ error }, { status, headers })
}

export async function requireUserAccess(
  request: Request,
  options: UserAccessOptions = {}
): Promise<AccessResult> {
  const { userId } = await verifyPrivyToken(request)
  if (!userId) {
    return { ok: false, response: jsonError('Unauthorized', 401) }
  }

  let subscription: Subscription | undefined
  if (options.feature) {
    const storedSubscription = await getSubscription(userId)
    if (
      !storedSubscription ||
      !canAccessFeature(storedSubscription.plan, storedSubscription.status, options.feature)
    ) {
      return { ok: false, response: jsonError('Feature access denied', 403) }
    }
    subscription = storedSubscription
  }

  if (options.rateLimit) {
    const planMultiplier = subscription?.plan === 'enterprise'
      ? 5
      : subscription?.plan === 'standard'
        ? 2
        : 1
    const policy = {
      ...options.rateLimit,
      limit: options.rateLimit.limit * planMultiplier,
    }
    const rateLimit = await consumeRateLimit(userId, policy.scope, policy)
    if (!rateLimit.allowed) {
      return {
        ok: false,
        response: jsonError('Rate limit exceeded', 429, {
          'Retry-After': String(rateLimit.retryAfterSeconds),
          'X-RateLimit-Limit': String(rateLimit.limit),
          'X-RateLimit-Remaining': String(rateLimit.remaining),
        }),
      }
    }
  }

  return { ok: true, actor: { userId, subscription } }
}

export function requireAdminAccess(request: Request): NextResponse | null {
  if (!hasValidSecret(request.headers.get('x-admin-secret'), process.env.ADMIN_SECRET)) {
    return jsonError('Unauthorized', 401)
  }

  return null
}

export function requireCronAccess(request: Request): NextResponse | null {
  if (!hasValidBearerSecret(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return jsonError('Unauthorized', 401)
  }

  return null
}
