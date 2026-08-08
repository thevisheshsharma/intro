import { describe, expect, it } from 'vitest'
import {
  getPlanPrice,
  getTrialEndDate,
  SELF_SERVE_PLANS,
  STRIPE_TRIAL_DAYS,
} from './commercial'

describe('commercial configuration', () => {
  it('keeps the public Growth name while preserving the standard Stripe key', () => {
    expect(SELF_SERVE_PLANS.standard.name).toBe('Growth')
    expect(SELF_SERVE_PLANS.standard.seats).toBe(3)
  })

  it('uses the approved Founder and Growth prices', () => {
    expect(getPlanPrice('founder', 'monthly')).toEqual({ amount: 99, total: 99 })
    expect(getPlanPrice('founder', 'annual')).toEqual({ amount: 79, total: 948 })
    expect(getPlanPrice('standard', 'monthly')).toEqual({ amount: 299, total: 299 })
    expect(getPlanPrice('standard', 'annual')).toEqual({ amount: 249, total: 2988 })
  })

  it('ends a Stripe trial fourteen days after checkout', () => {
    const start = new Date('2026-08-08T12:00:00.000Z')
    expect(STRIPE_TRIAL_DAYS).toBe(14)
    expect(getTrialEndDate(start).toISOString()).toBe('2026-08-22T12:00:00.000Z')
  })
})
