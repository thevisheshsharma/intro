import { getDriver } from './neo4j'

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
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User {privyDid: $privyDid})
      RETURN u.privyDid as privyDid,
             u.stripeCustomerId as stripeCustomerId,
             u.stripeSubscriptionId as stripeSubscriptionId,
             u.plan as plan,
             u.subscriptionStatus as status,
             toString(u.trialStartedAt) as trialStartedAt,
             toString(u.trialEndsAt) as trialEndsAt,
             toString(u.currentPeriodEnd) as currentPeriodEnd,
             u.cancelAtPeriodEnd as cancelAtPeriodEnd
      `,
      { privyDid }
    )

    if (result.records.length === 0) {
      return null
    }

    const record = result.records[0]
    return normalizeStoredSubscription({
      privyDid: record.get('privyDid'),
      stripeCustomerId: record.get('stripeCustomerId'),
      stripeSubscriptionId: record.get('stripeSubscriptionId'),
      plan: record.get('plan'),
      status: record.get('status'),
      trialStartedAt: record.get('trialStartedAt'),
      trialEndsAt: record.get('trialEndsAt'),
      currentPeriodEnd: record.get('currentPeriodEnd'),
      cancelAtPeriodEnd: record.get('cancelAtPeriodEnd') || false,
    })
  } finally {
    await session.close()
  }
}

// Get subscription by Stripe customer ID
export async function getSubscriptionByCustomerId(stripeCustomerId: string): Promise<Subscription | null> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User {stripeCustomerId: $stripeCustomerId})
      RETURN u.privyDid as privyDid,
             u.stripeCustomerId as stripeCustomerId,
             u.stripeSubscriptionId as stripeSubscriptionId,
             u.plan as plan,
             u.subscriptionStatus as status,
             toString(u.trialStartedAt) as trialStartedAt,
             toString(u.trialEndsAt) as trialEndsAt,
             toString(u.currentPeriodEnd) as currentPeriodEnd,
             u.cancelAtPeriodEnd as cancelAtPeriodEnd
      `,
      { stripeCustomerId }
    )

    if (result.records.length === 0) {
      return null
    }

    const record = result.records[0]
    return normalizeStoredSubscription({
      privyDid: record.get('privyDid'),
      stripeCustomerId: record.get('stripeCustomerId'),
      stripeSubscriptionId: record.get('stripeSubscriptionId'),
      plan: record.get('plan'),
      status: record.get('status'),
      trialStartedAt: record.get('trialStartedAt'),
      trialEndsAt: record.get('trialEndsAt'),
      currentPeriodEnd: record.get('currentPeriodEnd'),
      cancelAtPeriodEnd: record.get('cancelAtPeriodEnd') || false,
    })
  } finally {
    await session.close()
  }
}

// Ensure the application user exists without starting a paid-plan trial.
// Stripe Checkout is the only authority allowed to create a trial.
export async function ensureUserAccount(privyDid: string, email?: string): Promise<Subscription> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MERGE (u:User {privyDid: $privyDid})
      ON CREATE SET
        u.email = $email,
        u.createdAt = datetime()
      ON MATCH SET
        u.email = COALESCE(u.email, $email),
        u.updatedAt = datetime()
      RETURN u.privyDid as privyDid,
             u.stripeCustomerId as stripeCustomerId,
             u.stripeSubscriptionId as stripeSubscriptionId,
             u.plan as plan,
             u.subscriptionStatus as status,
             toString(u.trialStartedAt) as trialStartedAt,
             toString(u.trialEndsAt) as trialEndsAt,
             toString(u.currentPeriodEnd) as currentPeriodEnd,
             u.cancelAtPeriodEnd as cancelAtPeriodEnd
      `,
      {
        privyDid,
        email: email || null,
      }
    )

    const record = result.records[0]
    return normalizeStoredSubscription({
      privyDid: record.get('privyDid'),
      stripeCustomerId: record.get('stripeCustomerId'),
      stripeSubscriptionId: record.get('stripeSubscriptionId'),
      plan: record.get('plan'),
      status: record.get('status'),
      trialStartedAt: record.get('trialStartedAt'),
      trialEndsAt: record.get('trialEndsAt'),
      currentPeriodEnd: record.get('currentPeriodEnd'),
      cancelAtPeriodEnd: record.get('cancelAtPeriodEnd') || false,
    })
  } finally {
    await session.close()
  }
}

// Update subscription from Stripe webhook
export async function updateSubscriptionFromStripe(
  stripeCustomerId: string,
  data: {
    stripeSubscriptionId?: string
    plan?: PlanType
    status?: SubscriptionStatus
    trialStartedAt?: string | null
    trialEndsAt?: string | null
    currentPeriodEnd?: string
    cancelAtPeriodEnd?: boolean
  }
): Promise<void> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    await session.run(
      `
      MATCH (u:User {stripeCustomerId: $stripeCustomerId})
      SET u.stripeSubscriptionId = COALESCE($stripeSubscriptionId, u.stripeSubscriptionId),
          u.plan = COALESCE($plan, u.plan),
          u.subscriptionStatus = COALESCE($status, u.subscriptionStatus),
          u.trialStartedAt = CASE WHEN $trialStartedAt IS NOT NULL THEN datetime($trialStartedAt) ELSE u.trialStartedAt END,
          u.trialEndsAt = CASE WHEN $trialEndsAt IS NOT NULL THEN datetime($trialEndsAt) ELSE u.trialEndsAt END,
          u.currentPeriodEnd = CASE WHEN $currentPeriodEnd IS NOT NULL THEN datetime($currentPeriodEnd) ELSE u.currentPeriodEnd END,
          u.cancelAtPeriodEnd = COALESCE($cancelAtPeriodEnd, u.cancelAtPeriodEnd),
          u.updatedAt = datetime()
      `,
      {
        stripeCustomerId,
        stripeSubscriptionId: data.stripeSubscriptionId || null,
        plan: data.plan || null,
        status: data.status || null,
        trialStartedAt: data.trialStartedAt || null,
        trialEndsAt: data.trialEndsAt || null,
        currentPeriodEnd: data.currentPeriodEnd || null,
        cancelAtPeriodEnd: data.cancelAtPeriodEnd ?? null,
      }
    )
  } finally {
    await session.close()
  }
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
  const driver = await getDriver()
  const session = driver.session()

  try {
    await session.run(
      `
      MATCH (u:User {privyDid: $privyDid})
      SET u.stripeCustomerId = $stripeCustomerId,
          u.updatedAt = datetime()
      `,
      { privyDid, stripeCustomerId }
    )
  } finally {
    await session.close()
  }
}

// Expire trials that have ended
export async function expireTrials(): Promise<number> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.subscriptionStatus = 'trialing'
        AND u.trialEndsAt < datetime()
      SET u.subscriptionStatus = 'expired',
          u.updatedAt = datetime()
      RETURN count(u) as expired
      `
    )

    return result.records[0]?.get('expired')?.toNumber() || 0
  } finally {
    await session.close()
  }
}

// Get users with expiring trials (for reminder emails)
export async function getExpiringTrials(daysLeft: number = 3): Promise<{ privyDid: string; email: string | null; trialEndsAt: string }[]> {
  const driver = await getDriver()
  const session = driver.session()

  try {
    const result = await session.run(
      `
      MATCH (u:User)
      WHERE u.subscriptionStatus = 'trialing'
        AND u.trialEndsAt < datetime() + duration({days: $daysLeft})
        AND u.trialEndsAt > datetime()
      RETURN u.privyDid as privyDid,
             u.email as email,
             toString(u.trialEndsAt) as trialEndsAt
      `,
      { daysLeft }
    )

    return result.records.map(record => ({
      privyDid: record.get('privyDid'),
      email: record.get('email'),
      trialEndsAt: record.get('trialEndsAt'),
    }))
  } finally {
    await session.close()
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
