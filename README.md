# Berri (`intro`)

Berri is a Next.js application for Web3 relationship intelligence. It combines X/Twitter network data, graph analysis, and AI-assisted classification to help users research people and organizations and find potential warm introduction paths.

The repository is currently a **pre-production beta**. A live deployment exists, but credential rotation, durable jobs, provider-backed tests, and operational rollout work are still required before it should be considered production-ready.

## Current capabilities

- Privy-based authentication and X/Twitter account linking
- AI-assisted onboarding and profile classification
- Pathfinder relationship and introducer discovery
- People Intelligence for organization-affiliated people
- Company/ICP Intelligence
- Neo4j relationship and organization storage
- Stripe trials, Checkout, billing portal, and webhook integration
- Vercel deployment and trial-expiration cron

See [`docs/PRODUCT_STATUS.md`](docs/PRODUCT_STATUS.md) for implemented, partial, and marketed-only capabilities. Do not infer implementation from marketing copy.

The latest clean-checkout verification is recorded in [`docs/BASELINE.md`](docs/BASELINE.md).

## Stack

- Next.js 15 App Router, React 19, and strict TypeScript
- Tailwind CSS, Radix UI, Framer Motion, and Lucide
- Privy authentication
- Neo4j
- xAI/Grok through the AI SDK
- SocialAPI for X/Twitter data
- Stripe subscriptions
- Vercel functions and cron
- pnpm

## Before local setup

An `.env.local` file existed in historical commits. Do not reuse old credentials or copy environment files from an old device. Confirm that exposed credentials have been rotated and obtain development-only values through the approved private channel.

Read:

- [`AGENTS.md`](AGENTS.md) for repository working agreements
- [`SECURITY.md`](SECURITY.md) for security constraints
- [`docs/ENVIRONMENT.md`](docs/ENVIRONMENT.md) for environment separation
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for current and target boundaries

## Local setup

Requirements:

- A current Node.js runtime compatible with the repository
- pnpm
- Isolated development credentials for Privy, Neo4j, SocialAPI, xAI, and Stripe test mode

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

Create local environment configuration:

```bash
cp .env.example .env.local
```

Replace placeholders with development values. Never commit `.env.local`.

Start development:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Available checks

```bash
pnpm lint
pnpm type-check
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm build
```

Vitest covers security primitives and the API authorization matrix. Playwright is configured, but authenticated provider-backed journeys still require preview credentials and fixtures. See [`docs/TESTING.md`](docs/TESTING.md).

The existing `db:migrate` script is stale and references a missing PostgreSQL migrations directory even though the current application uses Neo4j. Do not run it until a migration ADR replaces it.

## Repository structure

```text
src/
  app/
    (marketing)/          Public pages
    app/(dashboard)/      Product pages
    onboarding/           Onboarding UI
    api/                  Next.js route handlers
  components/             Shared and feature UI
  lib/                    Auth, providers, domain helpers, validation
  services/               Neo4j-backed operations
docs/                     Architecture, flows, operations, and ADRs
```

## Development workflow

1. Start from an issue or written task with acceptance criteria.
2. Work on a focused branch or isolated worktree.
3. Plan auth, billing, data-model, dependency, or background-job changes before editing.
4. Add or update tests as the harness is established.
5. Run relevant checks and review the diff for secrets, PII, and authorization regressions.
6. Test the affected journey on a Vercel preview.
7. Require explicit authorization before production deployment.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for the review checklist and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the intended release gate.

## Immediate roadmap

1. Rotate historically exposed credentials and coordinate history cleanup.
2. Roll out and verify the Neo4j rate-limit and Stripe webhook constraints.
3. Move onboarding work to a durable job platform.
4. Add provider-backed API integration and authenticated browser tests.
5. Split the large intelligence routes and define the graph identity invariant in an ADR.
6. Refactor large feature routes/services one tested vertical slice at a time.

New product features should wait until the security and reproducibility baseline is established.
