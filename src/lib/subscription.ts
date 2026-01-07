import { runQuery } from './neo4j'

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

// Trial configuration
export const TRIAL_DAYS = 10
export const TRIAL_PLAN: PlanType = 'founder' // Trial users get Founder plan features

// Get subscription for a user by Privy DID
export async function getSubscription(privyDid: string): Promise<Subscription | null> {
  const query = `
    MATCH (u:User {privyDid: $privyDid})
    RETURN u.privyDid as privyDid,
           u.stripeCustomerId as stripeCustomerId,
           u.stripeSubscriptionId as stripeSubscriptionId,
           u.plan as plan,
           u.subscriptionStatus as status,
           u.trialStartedAt as trialStartedAt,
           u.trialEndsAt as trialEndsAt,
           u.currentPeriodEnd as currentPeriodEnd,
           u.cancelAtPeriodEnd as cancelAtPeriodEnd
  `

  const result = await runQuery(query, { privyDid })

  if (result.length === 0) {
    return null
  }

  const record = result[0]
  return {
    privyDid: record.privyDid,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    plan: record.plan,
    status: record.status,
    trialStartedAt: record.trialStartedAt,
    trialEndsAt: record.trialEndsAt,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd || false,
  }
}

// Get subscription by Stripe customer ID
export async function getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
  const query = `
    MATCH (u:User {stripeCustomerId: $stripeCustomerId})
    RETURN u.privyDid as privyDid,
           u.stripeCustomerId as stripeCustomerId,
           u.stripeSubscriptionId as stripeSubscriptionId,
           u.plan as plan,
           u.subscriptionStatus as status,
           u.trialStartedAt as trialStartedAt,
           u.trialEndsAt as trialEndsAt,
           u.currentPeriodEnd as currentPeriodEnd,
           u.cancelAtPeriodEnd as cancelAtPeriodEnd
  `

  const result = await runQuery(query, { stripeCustomerId })

  if (result.length === 0) {
    return null
  }

  const record = result[0]
  return {
    privyDid: record.privyDid,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    plan: record.plan,
    status: record.status,
    trialStartedAt: record.trialStartedAt,
    trialEndsAt: record.trialEndsAt,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd || false,
  }
}

// Create or update user with trial
export async function createUserWithTrial(privyDid: string, email?: string): Promise<Subscription> {
  const now = new Date()
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const query = `
    MERGE (u:User {privyDid: $privyDid})
    ON CREATE SET
      u.plan = $plan,
      u.subscriptionStatus = 'trialing',
      u.trialStartedAt = datetime($trialStartedAt),
      u.trialEndsAt = datetime($trialEndsAt),
      u.email = $email,
      u.createdAt = datetime()
    ON MATCH SET
      u.updatedAt = datetime()
    RETURN u.privyDid as privyDid,
           u.stripeCustomerId as stripeCustomerId,
           u.stripeSubscriptionId as stripeSubscriptionId,
           u.plan as plan,
           u.subscriptionStatus as status,
           toString(u.trialStartedAt) as trialStartedAt,
           toString(u.trialEndsAt) as trialEndsAt,
           u.currentPeriodEnd as currentPeriodEnd,
           u.cancelAtPeriodEnd as cancelAtPeriodEnd
  `

  const result = await runQuery(query, {
    privyDid,
    plan: TRIAL_PLAN,
    trialStartedAt: now.toISOString(),
    trialEndsAt: trialEndsAt.toISOString(),
    email: email || null,
  })

  const record = result[0]
  return {
    privyDid: record.privyDid,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    plan: record.plan,
    status: record.status,
    trialStartedAt: record.trialStartedAt,
    trialEndsAt: record.trialEndsAt,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd || false,
  }
}

// Update subscription from Stripe webhook
export async function updateSubscriptionFromStripe(
  stripeCustomerId: string,
  data: {
    stripeSubscriptionId?: string
    plan?: PlanType
    status?: SubscriptionStatus
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  }
): Promise<void> {
  const query = `
    MATCH (u:User {stripeCustomerId: $stripeCustomerId})
    SET u.stripeSubscriptionId = COALESCE($stripeSubscriptionId, u.stripeSubscriptionId),
        u.plan = COALESCE($plan, u.plan),
        u.subscriptionStatus = COALESCE($status, u.subscriptionStatus),
        u.currentPeriodEnd = CASE WHEN $currentPeriodEnd IS NOT NULL THEN datetime($currentPeriodEnd) ELSE u.currentPeriodEnd END,
        u.cancelAtPeriodEnd = COALESCE($cancelAtPeriodEnd, u.cancelAtPeriodEnd),
        u.updatedAt = datetime()
  `

  await runQuery(query, {
    stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId || null,
    plan: data.plan || null,
    status: data.status || null,
    currentPeriodEnd: data.currentPeriodEnd || null,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? null,
  })
}

// Link Stripe customer to user
export async function linkStripeCustomer(privyDid: string, stripeCustomerId: string): Promise<void> {
  const query = `
    MATCH (u:User {privyDid: $privyDid})
    SET u.stripeCustomerId = $stripeCustomerId,
        u.updatedAt = datetime()
  `
  await runQuery(query, { privyDid, stripeCustomerId })
}

// Expire trials that have ended
export async function expireTrials(): Promise<number> {
  const query = `
    MATCH (u:User)
    WHERE u.subscriptionStatus = 'trialing'
      AND u.trialEndsAt < datetime()
    SET u.subscriptionStatus = 'expired',
        u.updatedAt = datetime()
    RETURN count(u) as expired
  `
  const result = await runQuery(query)
  return result[0]?.expired?.low || result[0]?.expired || 0
}

// Get users with expiring trials (for reminder emails)
export async function getExpiringTrials(daysLeft: number = 3): Promise<{ privyDid: string; email: string | null; trialEndsAt: string }[]> {
  const query = `
    MATCH (u:User)
    WHERE u.subscriptionStatus = 'trialing'
      AND u.trialEndsAt < datetime() + duration({days: $daysLeft})
      AND u.trialEndsAt > datetime()
    RETURN u.privyDid as privyDid,
           u.email as email,
           toString(u.trialEndsAt) as trialEndsAt
  `
  return runQuery(query, { daysLeft })
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
  const query = `
    MATCH (u:User {privyDid: $privyDid})
    SET u.onboardingCompletedAt = datetime(),
        u.updatedAt = datetime()
  `
  await runQuery(query, { privyDid })
}

// Check if onboarding is complete for a user
export async function isOnboardingComplete(privyDid: string): Promise<boolean> {
  const query = `
    MATCH (u:User {privyDid: $privyDid})
    RETURN u.onboardingCompletedAt IS NOT NULL as isComplete
  `
  const result = await runQuery(query, { privyDid })

  if (result.length === 0) {
    return false
  }

  return result[0].isComplete === true
}
