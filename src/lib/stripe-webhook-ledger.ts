import { randomUUID } from 'node:crypto'
import { runQuery } from '@/lib/neo4j'

export interface StripeEventClaim {
  claimed: boolean
  claimToken?: string
}

export async function claimStripeEvent(
  eventId: string,
  eventType: string,
  now: Date = new Date()
): Promise<StripeEventClaim> {
  const claimToken = randomUUID()
  const staleBefore = new Date(now.getTime() - 5 * 60 * 1000)
  const result = await runQuery(
    `
      MERGE (event:StripeWebhookEvent {eventId: $eventId})
      ON CREATE SET event.status = 'new', event.createdAt = datetime($now)
      WITH event
      WHERE event.status IN ['new', 'failed']
         OR (event.status = 'processing' AND event.claimedAt < datetime($staleBefore))
      SET event.status = 'processing',
          event.eventType = $eventType,
          event.claimToken = $claimToken,
          event.claimedAt = datetime($now),
          event.attempts = coalesce(event.attempts, 0) + 1
      RETURN event.claimToken AS claimToken
    `,
    {
      eventId,
      eventType,
      claimToken,
      now: now.toISOString(),
      staleBefore: staleBefore.toISOString(),
    }
  )

  return result[0]?.claimToken === claimToken
    ? { claimed: true, claimToken }
    : { claimed: false }
}

export async function completeStripeEvent(eventId: string, claimToken: string): Promise<void> {
  await runQuery(
    `
      MATCH (event:StripeWebhookEvent {eventId: $eventId, claimToken: $claimToken})
      SET event.status = 'completed', event.completedAt = datetime(), event.lastErrorCode = null
    `,
    { eventId, claimToken }
  )
}

export async function failStripeEvent(
  eventId: string,
  claimToken: string,
  errorCode: string
): Promise<void> {
  await runQuery(
    `
      MATCH (event:StripeWebhookEvent {eventId: $eventId, claimToken: $claimToken})
      SET event.status = 'failed', event.failedAt = datetime(), event.lastErrorCode = $errorCode
    `,
    { eventId, claimToken, errorCode }
  )
}
