import { runQuery } from './neo4j'
import type { PlanType, Subscription, SubscriptionStatus } from './subscription'

interface BillingProjectionRecord {
  privyDid: string
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  plan: PlanType
  status: SubscriptionStatus
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean | null
}

export interface StripeSubscriptionProjection {
  stripeCustomerId: string
  stripeSubscriptionId: string
  stripePriceId: string
  stripeStatus: string
  plan: Exclude<PlanType, null>
  status: Exclude<SubscriptionStatus, null>
  trialStartedAt: string | null
  trialEndsAt: string | null
  currentPeriodEnd: string | null
  cancelAtPeriodEnd: boolean
  stripeEventCreated: number
}

function toSubscription(record: BillingProjectionRecord): Subscription {
  return {
    privyDid: record.privyDid,
    stripeCustomerId: record.stripeCustomerId,
    stripeSubscriptionId: record.stripeSubscriptionId,
    plan: record.plan,
    status: record.status,
    trialStartedAt: record.trialStartedAt,
    trialEndsAt: record.trialEndsAt,
    currentPeriodEnd: record.currentPeriodEnd,
    cancelAtPeriodEnd: record.cancelAtPeriodEnd ?? false,
  }
}

export async function getBillingProjectionByPrivyDid(
  privyDid: string
): Promise<Subscription | null> {
  const result = await runQuery<BillingProjectionRecord>(
    `
      MATCH (account:BillingAccount {privyDid: $privyDid})
      OPTIONAL MATCH (subscription:StripeSubscription {
        stripeSubscriptionId: account.currentStripeSubscriptionId
      })
      RETURN account.privyDid AS privyDid,
             account.stripeCustomerId AS stripeCustomerId,
             subscription.stripeSubscriptionId AS stripeSubscriptionId,
             subscription.plan AS plan,
             subscription.status AS status,
             toString(subscription.trialStartedAt) AS trialStartedAt,
             toString(subscription.trialEndsAt) AS trialEndsAt,
             toString(subscription.currentPeriodEnd) AS currentPeriodEnd,
             subscription.cancelAtPeriodEnd AS cancelAtPeriodEnd
    `,
    { privyDid }
  )

  return result[0] ? toSubscription(result[0]) : null
}

export async function getBillingProjectionByCustomerId(
  stripeCustomerId: string
): Promise<Subscription | null> {
  const result = await runQuery<BillingProjectionRecord>(
    `
      MATCH (account:BillingAccount {stripeCustomerId: $stripeCustomerId})
      OPTIONAL MATCH (subscription:StripeSubscription {
        stripeSubscriptionId: account.currentStripeSubscriptionId
      })
      RETURN account.privyDid AS privyDid,
             account.stripeCustomerId AS stripeCustomerId,
             subscription.stripeSubscriptionId AS stripeSubscriptionId,
             subscription.plan AS plan,
             subscription.status AS status,
             toString(subscription.trialStartedAt) AS trialStartedAt,
             toString(subscription.trialEndsAt) AS trialEndsAt,
             toString(subscription.currentPeriodEnd) AS currentPeriodEnd,
             subscription.cancelAtPeriodEnd AS cancelAtPeriodEnd
    `,
    { stripeCustomerId }
  )

  return result[0] ? toSubscription(result[0]) : null
}

export async function getLegacyBillingProjection(
  lookup: { privyDid: string } | { stripeCustomerId: string }
): Promise<Subscription | null> {
  const isPrivyLookup = 'privyDid' in lookup
  const property = isPrivyLookup ? 'privyDid' : 'stripeCustomerId'
  const value = isPrivyLookup ? lookup.privyDid : lookup.stripeCustomerId
  const result = await runQuery<BillingProjectionRecord>(
    `
      MATCH (user:User {${property}: $value})
      RETURN user.privyDid AS privyDid,
             user.stripeCustomerId AS stripeCustomerId,
             user.stripeSubscriptionId AS stripeSubscriptionId,
             user.plan AS plan,
             user.subscriptionStatus AS status,
             toString(user.trialStartedAt) AS trialStartedAt,
             toString(user.trialEndsAt) AS trialEndsAt,
             toString(user.currentPeriodEnd) AS currentPeriodEnd,
             user.cancelAtPeriodEnd AS cancelAtPeriodEnd
      LIMIT 1
    `,
    { value }
  )

  return result[0] ? toSubscription(result[0]) : null
}

export async function ensureBillingAccount(privyDid: string): Promise<void> {
  await runQuery(
    `
      MERGE (account:BillingAccount {privyDid: $privyDid})
      ON CREATE SET account.createdAt = datetime()
      SET account.updatedAt = datetime()
    `,
    { privyDid }
  )
}

export async function setStripeCustomerId(
  privyDid: string,
  stripeCustomerId: string
): Promise<void> {
  await runQuery(
    `
      MERGE (account:BillingAccount {privyDid: $privyDid})
      ON CREATE SET account.createdAt = datetime()
      SET account.stripeCustomerId = $stripeCustomerId,
          account.updatedAt = datetime()
    `,
    { privyDid, stripeCustomerId }
  )
}

export async function upsertStripeSubscriptionProjection(
  projection: StripeSubscriptionProjection
): Promise<{ applied: boolean; privyDid: string }> {
  const result = await runQuery<{ applied: boolean; privyDid: string }>(
    `
      MATCH (account:BillingAccount {stripeCustomerId: $stripeCustomerId})
      MERGE (subscription:StripeSubscription {
        stripeSubscriptionId: $stripeSubscriptionId
      })
      ON CREATE SET subscription.createdAt = datetime()
      WITH account, subscription
      OPTIONAL MATCH (current:StripeSubscription {
        stripeSubscriptionId: account.currentStripeSubscriptionId
      })
      WITH account, subscription, current,
           $stripeEventCreated >= coalesce(subscription.lastStripeEventCreated, -1) AS shouldApply,
           account.currentStripeSubscriptionId IS NULL
             OR account.currentStripeSubscriptionId = $stripeSubscriptionId
             OR $status IN ['trialing', 'active', 'past_due']
             OR current.status IS NULL
             OR NOT (current.status IN ['trialing', 'active', 'past_due']) AS shouldSelectCurrent
      FOREACH (_ IN CASE WHEN shouldApply THEN [1] ELSE [] END |
        SET subscription.stripePriceId = $stripePriceId,
            subscription.stripeStatus = $stripeStatus,
            subscription.plan = $plan,
            subscription.status = $status,
            subscription.trialStartedAt = CASE
              WHEN $trialStartedAt IS NULL THEN null
              ELSE datetime($trialStartedAt)
            END,
            subscription.trialEndsAt = CASE
              WHEN $trialEndsAt IS NULL THEN null
              ELSE datetime($trialEndsAt)
            END,
            subscription.currentPeriodEnd = CASE
              WHEN $currentPeriodEnd IS NULL THEN null
              ELSE datetime($currentPeriodEnd)
            END,
            subscription.cancelAtPeriodEnd = $cancelAtPeriodEnd,
            subscription.lastStripeEventCreated = $stripeEventCreated,
            subscription.syncedAt = datetime()
        MERGE (account)-[:HAS_SUBSCRIPTION]->(subscription)
      )
      FOREACH (_ IN CASE WHEN shouldApply AND shouldSelectCurrent THEN [1] ELSE [] END |
        SET account.currentStripeSubscriptionId = $stripeSubscriptionId,
            account.lastStripeEventCreated = $stripeEventCreated,
            account.updatedAt = datetime()
      )
      RETURN shouldApply AS applied, account.privyDid AS privyDid
    `,
    projection
  )

  if (!result[0]) {
    throw new Error('Stripe customer is not linked to a billing account')
  }

  return result[0]
}

export async function getExpiringStripeTrials(
  daysLeft: number = 3
): Promise<Array<{ privyDid: string; trialEndsAt: string }>> {
  return runQuery(
    `
      MATCH (account:BillingAccount)-[:HAS_SUBSCRIPTION]->(subscription:StripeSubscription)
      WHERE account.currentStripeSubscriptionId = subscription.stripeSubscriptionId
        AND subscription.status = 'trialing'
        AND subscription.trialEndsAt < datetime() + duration({days: $daysLeft})
        AND subscription.trialEndsAt > datetime()
      RETURN account.privyDid AS privyDid,
             toString(subscription.trialEndsAt) AS trialEndsAt
      LIMIT 100
    `,
    { daysLeft }
  )
}

export async function listStripeSubscriptionIdsForReconciliation(
  limit: number = 25
): Promise<string[]> {
  const result = await runQuery<{ stripeSubscriptionId: string }>(
    `
      MATCH (account:BillingAccount)-[:HAS_SUBSCRIPTION]->(subscription:StripeSubscription)
      WHERE account.currentStripeSubscriptionId = subscription.stripeSubscriptionId
        AND subscription.status IN ['trialing', 'active', 'past_due']
      RETURN subscription.stripeSubscriptionId AS stripeSubscriptionId
      ORDER BY subscription.syncedAt ASC
      LIMIT $limit
    `,
    { limit }
  )

  return result.map(record => record.stripeSubscriptionId)
}
