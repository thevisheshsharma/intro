# Repository instructions

## Product and status

- The product is currently branded **Berri**. The repository name is `intro`.
- Berri maps X/Twitter relationships and uses AI to produce people, company, and warm-introduction intelligence for Web3 go-to-market teams.
- Treat the repository as a pre-production beta. Security hardening, reproducible builds, and automated tests take priority over new features.
- `docs/PRODUCT_STATUS.md` is the authority for what is implemented, partial, or only marketed.

## Current stack

- Next.js 13 App Router, React 18, TypeScript strict mode, Tailwind CSS, Radix UI, and Framer Motion.
- Privy for authentication; Stripe for subscriptions and billing.
- Neo4j for users, organizations, relationships, subscriptions, and onboarding-job state.
- SocialAPI for X/Twitter data and xAI/Grok through the AI SDK for classification and analysis.
- Vercel for deployment and cron execution.
- Package manager: pnpm. Do not introduce another lockfile.

## Repository map

- `src/app/(marketing)`: public marketing pages.
- `src/app/app/(dashboard)`: authenticated application pages.
- `src/app/onboarding`: authentication-linked onboarding flow.
- `src/app/api`: HTTP route handlers.
- `src/components`: shared and feature UI.
- `src/lib`: provider clients, domain helpers, auth, subscriptions, caches, and validation.
- `src/services`: Neo4j-backed data access and domain operations.
- `docs`: architecture, flows, operational guidance, and decisions.

## Commands

- Install: `pnpm install --frozen-lockfile`
- Develop: `pnpm dev`
- Lint: `pnpm lint`
- Type-check: `pnpm type-check`
- Build: `pnpm build`
- Start production build: `pnpm start`
- Tests: no test command exists yet. Follow `docs/TESTING.md` when establishing the test stack; never claim tests passed until a real command runs.
- The existing `db:migrate` script is stale and must not be used until an ADR defines the migration strategy.

## Environment and secrets

- Use `.env.example` as the variable inventory and `docs/ENVIRONMENT.md` for environment responsibilities.
- Keep real values in `.env.local`, Vercel, or an approved password manager. Never commit them.
- Never print, paste, snapshot, or include secrets in fixtures, logs, issues, prompts, screenshots, or generated documentation.
- Assume credentials present in historical `.env.local` commits are compromised until rotation is documented.
- Do not create a production connection or run a mutating production command without explicit user authorization.

## Security invariants

- API routes are deny-by-default. Do not rely on `src/middleware.ts` or client cookies for API authorization.
- User-facing APIs must verify a Privy bearer token on the server and use the verified DID, not a claimed username, as the actor identity.
- Paid features must enforce subscription status, plan entitlement, and usage quota on the server.
- Cost-bearing SocialAPI, xAI, synchronization, and graph-expansion routes require rate limits and bounded pagination/concurrency.
- Webhooks and cron routes must fail closed when their secrets are absent. Never add a fallback secret.
- Schema initialization, cleanup, migration, and bulk-sync routes must be admin-only or removed from the public deployment.
- Validate request bodies with Zod, cap payload size and collection counts, and return safe errors.
- Do not log request bodies, provider payloads, tokens, email addresses, network graphs, or other sensitive user data.
- Stripe webhook processing must be idempotent before it can be considered production-ready.

## Architecture boundaries

- Keep route handlers thin: parse, validate, authenticate, authorize, invoke a use case, and map the result to HTTP.
- Put product behavior in feature/domain modules and provider-specific code behind typed adapters.
- Keep Neo4j queries in repositories or focused data-access modules, not React components or large route handlers.
- Model application users, social people, and organizations as distinct identities or document and test an explicit graph invariant.
- Avoid module-level state for correctness in serverless code. Caches must be disposable; durable jobs need durable ownership and state.
- When touching a file over roughly 400 lines, avoid extending its responsibilities and propose a safe extraction when practical.
- Prefer explicit types and schemas over `any`. Do not add new unchecked provider payloads.

## Change workflow

- Work from an issue or written task with acceptance criteria.
- Use a focused branch (`codex/`, `fix/`, `feat/`, or `docs/`) and keep unrelated changes out.
- For auth, billing, data-model, background-job, dependency, or cross-cutting work: inspect first and present a plan before editing.
- Add or update tests for changed behavior once the test harness exists. Until then, document exact manual verification.
- Run the relevant lint, type-check, tests, and build checks before requesting review.
- Review the diff for secrets, PII logging, authorization regressions, and accidental product-copy changes.
- Use a Vercel preview for browser QA. Production deployment requires explicit authorization.
- Record durable architectural decisions in `docs/adr/`; do not rely on agent chat or machine-local memory.

## Definition of done

- Acceptance criteria are met and failure states are handled.
- Authentication, authorization, entitlement, and rate-limit implications were considered.
- Relevant automated checks pass, or a clearly labelled baseline blocker is documented.
- Documentation and environment inventory match the changed behavior.
- The final handoff lists changed files, verification performed, residual risks, and any manual operator action.

## Current release blockers

- Historical secrets require verified rotation and coordinated history cleanup.
- Several cost-bearing or mutating APIs lack server authentication, entitlement checks, and rate limits.
- The pinned Next.js version and transitive dependencies have significant advisories.
- Automated tests and CI are absent.
- Signup/onboarding integration contains broken or non-authoritative transitions.

Do not quietly work around these blockers. Surface them when they affect a task.
