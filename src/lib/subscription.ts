import { getDriver } from './neo4j'
import {
  ensureBillingAccount,
  getBillingProjectionByCustomerId,
  getBillingProjectionByPrivyDid,
  getExpiringStripeTrials,
  getLegacyBillingProjection,
  setStripeCustomerId,
} from './billing-repository'

// Subscription types
export type PlanType = 'founder' | 'standard' | 'enterprise' | null
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired' | null
export type BillingInterval = 'monthly' | 'annual'

export interface Subscription {
  privyDid: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  plan: PlanType
  status: SubscriptionStatus
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
}

// Get subscription for a user by Privy DID
export async function getSubscription(privyDid: string): Promise<Subscription | null> {
  const projection = await getBillingProjectionByPrivyDid(privyDid)
  if (projection?.stripeSubscriptionId) {
    return projection
  }

  const legacy = await getLegacyBillingProjection({ privyDid })
  if (legacy?.stripeSubscriptionId) {
    return normalizeStoredSubscription(legacy)
  }

  return projection ?? (legacy ? normalizeStoredSubscription(legacy) : null)
}

// Get subscription by Stripe customer ID
export async function getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
  const projection = await getBillingProjectionByCustomerId(stripeCustomerId)
  if (projection?.stripeSubscriptionId) {
    return projection
  }

  const legacy = await getLegacyBillingProjection({ stripeCustomerId })
  if (legacy?.stripeSubscriptionId) {
    return normalizeStoredSubscription(legacy)
  }

  return projection ?? (legacy ? normalizeStoredSubscription(legacy) : null)
}

// Ensure the application user exists without starting a paid-plan trial.
// Stripe Checkout is the only authority allowed to create a trial.
export async function ensureUserAccount(privyDid: string, email?: string): Promise<Subscription> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    await session.run(
      `
      MERGE (u:User {privyDid: $privyDid})
      ON CREATE SET
        u.email = $email,
        u.createdAt = datetime()
      ON MATCH SET
        u.email = COALESCE(u.email, $email),
        u.updatedAt = datetime()
      RETURN u.privyDid AS privyDid
      `,
      {
        privyDid,
        email: email || null,
      }
    )
  } finally {
    await session.close()
  }

  await ensureBillingAccount(privyDid)
  const subscription = await getSubscription(privyDid)
  return subscription ?? emptySubscription(privyDid)
}

function normalizeStoredSubscription(subscription: Subscription): Subscription {
  // Trials created by the legacy onboarding flow had no Stripe subscription.
  // Treat them as Explorer access without mutating production data implicitly.
  if (subscription.status === 'trialing' && !subscription.stripeSubscriptionId) {
    return {
      ...subscription,
      plan: null,
      status: null,
      trialStartedAt: null,
      trialEndsAt: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    }
  }

  return subscription
}

// Link Stripe customer to user
export async function linkStripeCustomer(privyDid: string, stripeCustomerId: string): Promise<void> {
  await setStripeCustomerId(privyDid, stripeCustomerId)
}

// Get users with expiring trials (for reminder emails)
export async function getExpiringTrials(
  daysLeft: number = 3
): Promise<Array<{ privyDid: string; trialEndsAt: string }>> {
  return getExpiringStripeTrials(daysLeft)
}

function emptySubscription(privyDid: string): Subscription {
  return {
    privyDid,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    plan: null,
    status: null,
    trialStartedAt: null,
    trialEndsAt: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  }
}

// Check if user has active subscription
export function isSubscriptionActive(subscription: Subscription | null): boolean {
  if (!subscription) return false
  return subscription.status === 'active' || subscription.status === 'trialing'
}

// Calculate days left in trial
export function getTrialDaysLeft(subscription: Subscription | null): number | null {
  if (!subscription || subscription.status !== 'trialing' || !subscription.trialEndsAt) {
    return null
  }
  const now = new Date()
  const trialEnd = new Date(subscription.trialEndsAt)
  const daysLeft = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, daysLeft)
}

// Mark onboarding as complete for a user
export async function markOnboardingComplete(privyDid: string): Promise<void> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    await session.run(
      `
      MATCH (u:User {privyDid: $privyDid})
      SET u.onboardingCompletedAt = datetime(),
          u.updatedAt = datetime()
      `,
      { privyDid }
    )
  } finally {
    await session.close()
  }
}

// Check if onboarding is complete for a user
export async function isOnboardingComplete(privyDid: string): Promise<boolean> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User {privyDid: $privyDid})
      RETURN u.onboardingCompletedAt IS NOT NULL as isComplete
      `,
      { privyDid }
    )

    if (result.records.length === 0) {
      return false
    }

    return result.records[0].get('isComplete') === true
  } finally {
    await session.close()
  }
}
