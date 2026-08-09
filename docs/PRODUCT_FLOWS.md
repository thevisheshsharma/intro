# Product flows

This document defines the expected product journeys and records the main known breaks. Update it whenever route behavior or user-visible states change.

## Acquisition and authentication

Expected:

1. Visitor lands on a marketing page.
2. A primary CTA opens the Privy login/signup experience.
3. After authentication, the server determines onboarding status.
4. Incomplete users go to `/onboarding`; completed users go to `/app`.

Known gaps:

- Several primary CTAs link to nonexistent `/sign-up` or `/app/sign-up` routes.
- Marketing redirect logic calls a protected session endpoint without a bearer token.
- Client-writable cookies currently influence onboarding routing and cannot be authoritative.

## Onboarding

Expected:

1. User authenticates and links an X/Twitter identity through Privy.
2. The server creates a user and trial subscription.
3. A durable job fetches the social profile, classifies it, discovers organizations, and stores results.
4. The UI polls a job owned by the authenticated actor.
5. Profile edits are persisted and validated.
6. The server marks onboarding complete, and the dashboard becomes available.

Known gaps:

- Profile completion calls an API route that does not exist and ignores failure.
- Job ownership is inferred from the job ID string rather than stored authorization data.
- The analysis relies on a bounded serverless background promise rather than a durable worker.
- The client can fall back to an onboarding-complete cookie after server failure.

## Pathfinder

Expected:

1. An authenticated, entitled user supplies a target X/Twitter handle.
2. The server resolves the actor's trusted linked handle.
3. Bounded provider calls update relationship data.
4. Neo4j finds direct connections and potential introducers.
5. Results show evidence, freshness, and partial-failure states.

Known gaps:

- The main API accepts a client-claimed logged-in username.
- Authentication, server entitlement, quota, and rate limiting are absent from the core route.

## People Intelligence

Expected:

1. An entitled user enters an organization handle.
2. The server discovers and classifies relevant people with bounded work.
3. Results distinguish cached data, new provider data, confidence, and failures.

Known gaps:

- The route is unauthenticated and combines most of the feature in one large handler.
- External calls and graph writes are not governed by per-user usage limits.

## Company Intelligence

Expected:

1. An entitled user selects an organization.
2. Existing company intelligence is read under an explicit access policy.
3. Authorized analysis uses current Web/X research and replaces the canonical flat ICP snapshot with a timestamp.

Known gaps:

- Some reads ignore failed authentication and return globally stored organization information.
- Ownership and sharing policy for organization analyses is not documented.

## Billing

Expected:

1. An authenticated user selects a plan and billing interval.
2. Stripe Checkout creates the subscription for the billing account owned by the verified Privy DID.
3. Signed, replay-safe webhooks retrieve current Stripe state and update the dedicated Neo4j entitlement projection.
4. APIs enforce the current server-side entitlement.
5. The billing portal lets the customer manage the subscription.

Known gaps:

- Provider-backed checkout, portal, replay/concurrency, and reconciliation journeys still need preview verification.
- The legacy `User` billing-property read fallback remains until a reviewed migration verifies the dedicated billing projection.

## Marketed but not complete

Ping/outreach execution, team collaboration, SSO, public API access, and some exports are not complete end-to-end product flows. See `docs/PRODUCT_STATUS.md` before changing marketing or pricing claims.
