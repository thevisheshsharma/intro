# Architecture

## Purpose

Berri helps Web3 go-to-market users inspect X/Twitter identities and relationship graphs, discover people associated with organizations, analyze companies, and find warm introduction paths.

This document describes the current system and the intended boundaries for stabilization. It is not a claim that every boundary is already implemented.

## System context

1. The browser renders Next.js marketing, onboarding, and dashboard views.
2. Privy authenticates the user and supplies a bearer token for protected APIs.
3. Next.js route handlers call domain services.
4. SocialAPI supplies X/Twitter profiles, followers, and following lists.
5. xAI/Grok classifies profiles and synthesizes organization/ICP information.
6. Neo4j stores identities, organizations, relationships, subscriptions, and onboarding-job state.
7. Stripe manages checkout, subscriptions, the customer portal, and webhook events.
8. Vercel hosts the application and invokes configured cron routes.

## Current code organization

- Marketing routes: `src/app/(marketing)`
- Dashboard routes: `src/app/app/(dashboard)`
- Onboarding: `src/app/onboarding` and `src/app/api/onboarding`
- HTTP APIs: `src/app/api`
- Provider/domain helpers: `src/lib`
- Neo4j services: `src/services`
- UI: `src/components`

The organization is recognizable, but boundaries leak. Large API and service files currently combine transport, provider calls, graph queries, classification, caching, and presentation transformations.

## Target request path

Every protected request should follow this sequence:

1. Parse and validate input with a schema.
2. Verify the Privy bearer token.
3. Load the actor and subscription from trusted server state.
4. Enforce entitlement, quota, and rate limit.
5. Call a feature use case.
6. Use typed provider adapters and repositories.
7. Return a minimal response and emit redacted structured telemetry.

Route handlers must not trust usernames, plan names, onboarding cookies, or organization ownership supplied by the client.

## Proposed feature modules

- `src/modules/auth`
- `src/modules/onboarding`
- `src/modules/pathfinder`
- `src/modules/people-intelligence`
- `src/modules/company-intelligence`
- `src/modules/billing`
- `src/modules/admin`
- `src/integrations/privy`
- `src/integrations/socialapi`
- `src/integrations/xai`
- `src/integrations/stripe`
- `src/repositories/neo4j`

This is a migration direction, not permission for a broad rewrite. Extract one tested vertical slice at a time.

## Data-model concerns

Current Neo4j code uses `User` for multiple concepts. Before significant graph changes, define whether the durable model uses separate labels such as `AppUser`, `Person`, and `Organization`, how social handles are normalized, and which identifier owns subscriptions and onboarding state.

Any migration must be backward-compatible, observable, and reversible. Record the decision in an ADR before implementation.

## Serverless constraints

- Module-level maps and indexes may disappear or diverge across Vercel instances.
- Background work may be terminated when function duration expires.
- Jobs need durable state, explicit ownership, idempotency, retry policy, and timeout behavior.
- Provider calls need bounded concurrency, pagination, and budgets.

## Trust boundaries

- Browser input and cookies are untrusted.
- Provider responses are untrusted and must be validated.
- Privy verification establishes actor identity, not feature entitlement.
- Stripe webhook signatures establish event origin; idempotency is still required.
- Cron/admin secrets authorize operations only when present and compared safely.
- Neo4j contains user and relationship data and must not be exposed through public maintenance APIs.
