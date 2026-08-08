import { describe, expect, it } from 'vitest'
import { canAccessFeature } from './features'

describe('server feature entitlements', () => {
  it('allows active and trialing plans only when the plan includes the feature', () => {
    expect(canAccessFeature('founder', 'trialing', 'pathfinder')).toBe(true)
    expect(canAccessFeature('founder', 'active', 'teamTools')).toBe(false)
    expect(canAccessFeature('standard', 'active', 'teamTools')).toBe(false)
  })

  it('denies canceled, past-due, and missing subscriptions', () => {
    expect(canAccessFeature('standard', 'canceled', 'pathfinder')).toBe(false)
    expect(canAccessFeature('standard', 'past_due', 'pathfinder')).toBe(false)
    expect(canAccessFeature(null, null, 'pathfinder')).toBe(false)
  })

  it('limits expired trials to the documented soft-gated feature', () => {
    expect(canAccessFeature('founder', 'expired', 'companyIntel')).toBe(true)
    expect(canAccessFeature('founder', 'expired', 'pathfinder')).toBe(false)
  })
})
