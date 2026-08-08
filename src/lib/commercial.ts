import type { BillingInterval } from './subscription'

export const STRIPE_TRIAL_DAYS = 14

export const SELF_SERVE_PLANS = {
  founder: {
    name: 'Founder',
    monthlyPrice: 99,
    annualMonthlyPrice: 79,
    annualTotal: 948,
    seats: 1,
  },
  standard: {
    name: 'Growth',
    monthlyPrice: 299,
    annualMonthlyPrice: 249,
    annualTotal: 2988,
    seats: 3,
  },
} as const

export type SelfServePlan = keyof typeof SELF_SERVE_PLANS

export function getPlanPrice(plan: SelfServePlan, interval: BillingInterval) {
  const configuredPlan = SELF_SERVE_PLANS[plan]

  return interval === 'annual'
    ? {
        amount: configuredPlan.annualMonthlyPrice,
        total: configuredPlan.annualTotal,
      }
    : {
        amount: configuredPlan.monthlyPrice,
        total: configuredPlan.monthlyPrice,
      }
}

export function getTrialEndDate(start: Date = new Date()): Date {
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + STRIPE_TRIAL_DAYS)
  return end
}
