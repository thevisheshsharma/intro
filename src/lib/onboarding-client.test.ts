import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  fetchOnboardingCompletion,
  startOnboardingAnalysis,
  TwitterLinkRequiredError,
} from './onboarding-client'

describe('fetchOnboardingCompletion', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns the server-authoritative completion state', async () => {
    const fetcher = vi.fn(async () => Response.json({ completed: false }))

    await expect(fetchOnboardingCompletion({
      getAccessToken: async () => 'token',
      fetcher,
    })).resolves.toBe(false)

    expect(fetcher).toHaveBeenCalledWith('/api/user/onboarding-status', expect.objectContaining({
      headers: { Authorization: 'Bearer token' },
      cache: 'no-store',
      signal: expect.any(AbortSignal),
    }))
  })

  it('rejects instead of waiting forever when Privy does not return a token', async () => {
    vi.useFakeTimers()
    const result = fetchOnboardingCompletion({
      getAccessToken: () => new Promise(() => undefined),
      timeoutMs: 1_000,
    })
    const assertion = expect(result).rejects.toThrow(
      'Checking your account took too long. Please try again.',
    )

    await vi.advanceTimersByTimeAsync(1_000)
    await assertion
  })

  it('rejects malformed status responses', async () => {
    await expect(fetchOnboardingCompletion({
      getAccessToken: async () => 'token',
      fetcher: async () => Response.json({ onboardingComplete: false }),
    })).rejects.toThrow('The onboarding status response was invalid.')
  })

  it('returns a validated analysis job ID', async () => {
    await expect(startOnboardingAnalysis({
      getAccessToken: async () => 'token',
      fetcher: async () => Response.json({ jobId: 'onboard_123' }),
    })).resolves.toBe('onboard_123')
  })

  it('preserves the server signal that Twitter must be linked', async () => {
    await expect(startOnboardingAnalysis({
      getAccessToken: async () => 'token',
      fetcher: async () => Response.json(
        { error: 'Twitter account not linked', requiresTwitter: true },
        { status: 400 },
      ),
    })).rejects.toBeInstanceOf(TwitterLinkRequiredError)
  })
})
