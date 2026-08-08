# Testing strategy

The repository now has a Vitest unit-test harness, an executable API authorization
matrix, and Playwright configuration. Browser journeys and provider-backed API
integration fixtures remain to be implemented before large feature refactors.

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
2. New user connects X, resumes analysis, and sees a personalized preview without a trial subscription.
3. Explorer continues to a read-only dashboard and does not trigger follower synchronization.
4. **Start my 14-day trial** opens Stripe Checkout with a required payment method and the correct first charge.
5. Checkout cancellation returns to the preview without starting a trial or losing the preview result.
6. Checkout completion returns to Billing, persists the Stripe trial through webhooks, and exposes **Manage Trial**.
7. Portal cancellation preserves access to trial end, displays the no-charge state, and then returns to Explorer.
8. Pathfinder success, no-path, provider-failure, and rate-limit states.

Until the mocked provider journey exists, manually verify steps 2–7 in an isolated preview environment using a development Privy app, Stripe test mode, a disposable Neo4j database, and a test X account. Confirm the Stripe subscription—not account creation or onboarding—owns `trial_start` and `trial_end`. Replay each webhook once to verify idempotency. Never run this journey against production without explicit authorization.

### Security and dependency checks

- Dependency audit and dependency review.
- Secret scanning.
- Static analysis appropriate for TypeScript/Next.js.
- Tests proving maintenance and cost-bearing routes fail closed.

## Scripts

- `pnpm test`
- `pnpm test:unit`
- `pnpm test:e2e`
- `pnpm test:coverage`

`test:integration` will be added with the provider and Neo4j contract fixtures.

Do not use a global coverage percentage as the only gate. Require strong branch coverage for authentication, entitlement, billing, job ownership, and provider-failure logic.

## Pull-request gate

The intended CI order is install, lint, type-check, unit/integration tests, build, dependency/security checks, then preview smoke tests. A failing baseline must be documented and assigned rather than silently ignored.
