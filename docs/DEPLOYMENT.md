# Deployment

## Current platform

The application is deployed through Vercel. `vercel.json` currently schedules only `/api/cron/reconcile-subscriptions` at midnight daily. This route refreshes a bounded set of local entitlement projections from Stripe; it does not independently expire trials.

The repository now defines CI for frozen install, lint, type-check, unit/security coverage, production build, dependency audit, and secret scanning. Preview smoke tests, monitoring, a promotion policy, and a rollback runbook remain incomplete. This document describes the required operating model and calls out remaining gaps.

## Intended environments

- **Local**: isolated development providers and database.
- **Preview**: one Vercel preview per pull request, using staging/test providers.
- **Production**: protected canonical deployment using production-only credentials.

Preview deployments must never point to the production Neo4j database or use Stripe live mode.

## Promotion gate

Before production promotion:

1. CI install, lint, type-check, tests, build, and security checks pass.
2. Database and provider migrations have an approved ADR and rollback plan.
3. Preview smoke tests cover authentication, onboarding, Pathfinder, and billing changes in scope.
4. Logs and screenshots contain no credentials or sensitive provider payloads.
5. Environment variables are validated and owned.
6. The operator records the commit SHA and confirms rollback availability.

## Cron and background work

- Cron routes must fail closed when `CRON_SECRET` is missing.
- Every scheduled route must be declared in deployment configuration or explicitly documented as externally scheduled.
- `/api/cron/reconcile-subscriptions` must use Stripe test mode and an isolated Neo4j database in previews. Production execution requires the approved live configuration and schema rollout.
- `/api/cron/llama-sync` is currently not scheduled in `vercel.json`.
- Long-running onboarding or synchronization should move to a durable job system with ownership, retries, idempotency, and observability.

## Observability requirements

- Structured, redacted application errors.
- Provider latency/error/cost metrics without raw payload logging.
- Authentication and authorization failure counts.
- Rate-limit, quota, background-job, and webhook health metrics.
- Alerting for elevated failures, stalled jobs, webhook failures, and cost anomalies.

## Rollback and recovery backlog

- Document Vercel rollback procedure and responsible operator.
- Define Neo4j backup frequency, retention, restore test, and recovery owner.
- Store a private inventory of provider accounts and rotation owners.
- Test rollback before the first production-ready release.
