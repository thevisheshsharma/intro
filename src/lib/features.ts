import type { PlanType, SubscriptionStatus } from './subscription'

// Feature keys that can be gated
export type FeatureKey = 'pathfinder' | 'companyIntel' | 'peopleIntel' | 'csvExports' | 'advancedFilters' | 'teamTools' | 'apiAccess' | 'sso'

// Features allowed for expired trials (soft gate)
export const EXPIRED_TRIAL_ALLOWED_FEATURES: FeatureKey[] = ['companyIntel']

// Feature definitions for each plan
export const PLAN_FEATURES = {
  founder: {
    pathfinder: true,
    companyIntel: true,
    peopleIntel: true,
    csvExports: true,
    advancedFilters: false,
    teamTools: false,
    apiAccess: false,
    sso: false,
    seats: 1,
  },
  standard: {
    pathfinder: true,
    companyIntel: true,
    peopleIntel: true,
    csvExports: true,
    advancedFilters: true,
    teamTools: true,
    apiAccess: false,
    sso: false,
    seats: 5,
  },
  enterprise: {
    pathfinder: true,
    companyIntel: true,
    peopleIntel: true,
    csvExports: true,
    advancedFilters: true,
    teamTools: true,
    apiAccess: true,
    sso: true,
    seats: -1, // unlimited
  },
} as const

export type FeatureName = keyof typeof PLAN_FEATURES.founder

// Check if a plan has access to a feature (base check, doesn't consider subscription status)
export function canAccess(plan: PlanType, feature: FeatureName): boolean {
  if (!plan) return false
  const features = PLAN_FEATURES[plan]
  if (!features) return false
  return features[feature] === true
}

/**
 * Check if a user can access a feature based on both plan and subscription status.
 *
 * For active or trialing subscriptions: uses plan features.
 * For expired trials: only allows EXPIRED_TRIAL_ALLOWED_FEATURES (soft gate).
 * For other statuses (canceled, past_due): no access.
 */
export function canAccessFeature(
  plan: PlanType,
  status: SubscriptionStatus,
  feature: FeatureKey
): boolean {
  // Active or trialing subscriptions use plan-based feature access
  if (status === 'active' || status === 'trialing') {
    return canAccess(plan, feature as FeatureName)
  }

  // Expired trials get limited access (soft gate)
  if (status === 'expired') {
    return EXPIRED_TRIAL_ALLOWED_FEATURES.includes(feature)
  }

  // No access for canceled, past_due, or null status
  return false
}

/**
 * Get the list of features a user has access to based on their subscription.
 */
export function getAccessibleFeatures(
  plan: PlanType,
  status: SubscriptionStatus
): FeatureKey[] {
  const allFeatures: FeatureKey[] = [
    'pathfinder',
    'companyIntel',
    'peopleIntel',
    'csvExports',
    'advancedFilters',
    'teamTools',
    'apiAccess',
    'sso'
  ]

  return allFeatures.filter(feature => canAccessFeature(plan, status, feature))
}

// Get the number of seats for a plan
export function getSeats(plan: PlanType): number {
  if (!plan) return 0
  const features = PLAN_FEATURES[plan]
  if (!features) return 0
  return features.seats
}

// Get all features for a plan
export function getPlanFeatures(plan: PlanType): (typeof PLAN_FEATURES)[keyof typeof PLAN_FEATURES] | null {
  if (!plan) return null
  return PLAN_FEATURES[plan] || null
}

// Plan display names
export const PLAN_NAMES: Record<string, string> = {
  founder: 'Founder',
  standard: 'Standard',
  enterprise: 'Enterprise',
}

// Plan descriptions
export const PLAN_DESCRIPTIONS: Record<string, string> = {
  founder: 'Perfect for solo founders and small teams getting started',
  standard: 'For growing teams that need advanced collaboration',
  enterprise: 'Custom solutions for large organizations',
}
