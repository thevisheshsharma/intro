# Testing strategy

The repository currently has no automated test harness or coverage baseline. Establish tests before large refactors.

## Proposed layers

### Unit tests

Use Vitest for pure domain behavior, normalization, entitlement decisions, plan mapping, transformation, and validation. Provider payloads should use redacted synthetic fixtures.

### API integration tests

Exercise route handlers with:

- valid, missing, expired, and malformed Privy tokens;
- active, trialing, expired, and wrong-plan subscriptions;
- rate-limit and quota boundaries;
- malformed and oversized requests;
- mocked SocialAPI, xAI, Privy, and Stripe adapters;
- a disposable Neo4j database or repository contract fakes;
- provider timeouts, pagination, partial data, and retryable failures.

Maintain an authorization matrix for every API route. Public, authenticated, entitled, admin, webhook, and cron access must be explicit.

### Browser tests

Use Playwright for:

1. Marketing CTA opens authentication.
2. New user completes and can resume onboarding.
3. Completed user reaches Pathfinder.
4. Pathfinder success, no-path, provider-failure, and quota states.
5. Checkout success/cancel and billing portal navigation using Stripe test mode.
6. Expired trial and upgrade behavior.

### Security and dependency checks

- Dependency audit and dependency review.
- Secret scanning.
- Static analysis appropriate for TypeScript/Next.js.
- Tests proving maintenance and cost-bearing routes fail closed.

## Required scripts

When the harness is introduced, standardize scripts such as:

- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:e2e`
- `pnpm test:coverage`

Do not use a global coverage percentage as the only gate. Require strong branch coverage for authentication, entitlement, billing, job ownership, and provider-failure logic.

## Pull-request gate

The intended CI order is install, lint, type-check, unit/integration tests, build, dependency/security checks, then preview smoke tests. A failing baseline must be documented and assigned rather than silently ignored.
