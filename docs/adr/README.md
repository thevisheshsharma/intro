# Architecture decision records

Use ADRs for decisions that change trust boundaries, data ownership, deployment behavior, or long-lived dependencies.

## Format

Create `NNNN-short-title.md` with:

- Status: proposed, accepted, superseded, or rejected
- Date
- Context
- Decision
- Alternatives considered
- Security and privacy impact
- Operational impact
- Migration and rollback
- Consequences and follow-up work

## Initial ADR backlog

1. Canonical identity model for Privy users, social people, and organizations in Neo4j.
2. Central API authentication, entitlement, quota, and rate-limiting policy.
3. Durable onboarding and synchronization job system.
4. Neo4j schema migration and rollback strategy.
5. xAI and SocialAPI adapter, budget, retry, and caching policy.
6. Stripe webhook event ledger and idempotency policy. See `0002-stripe-billing-projection.md`.
7. Logging, telemetry, PII classification, and retention.
