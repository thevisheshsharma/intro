# Environment management

## Principles

- Local, preview, and production must use separate Privy apps, Neo4j databases, Stripe modes/resources, provider credentials, cron secrets, and admin secrets.
- Secrets live in `.env.local`, Vercel, or an approved password manager. They never live in git.
- `.env.example` is an inventory, not a source of working credentials.
- Rotate every credential found in historical `.env.local` commits before treating any environment as safe.

## Environment matrix

| Concern | Local | Preview | Production |
| --- | --- | --- | --- |
| Privy | Development app | Development/staging app | Production app |
| Neo4j | Local or isolated development DB | Staging DB | Production DB |
| Stripe | Test mode | Test mode | Live mode |
| SocialAPI/xAI | Development-limited keys | Staging-limited keys | Production keys with budgets |
| App URL | `http://localhost:3000` | Vercel preview URL | Canonical production URL |
| Cron/admin secrets | Development-only | Preview-only | Unique production values |

## Setup

1. Use Node.js 22 or newer.
2. Copy `.env.example` to `.env.local`.
3. Retrieve development values from the approved owner after historical credentials are rotated.
4. Never reuse production secrets locally.
5. Start with `pnpm dev` and perform only read-safe checks until the target database is confirmed.

## Stripe trial configuration

- Stripe is the only supported billing provider. Do not add unused payment-provider keys to application environments.
- Founder monthly and annual Price IDs must belong to the same Stripe mode as `STRIPE_SECRET_KEY`.
- `STRIPE_BILLING_PORTAL_CONFIGURATION_ID` must identify the test/live portal configuration for the same Stripe account and mode.
- Checkout creates the fourteen-day trial in code and always collects a payment method.
- `NEXT_PUBLIC_APP_URL` is required for billing routes and must be HTTPS outside local development.
- Configure the Stripe customer portal to allow subscription cancellation and payment-method updates.
- Configure trial-ending and failed-payment notifications in Stripe before launch.
- Register the webhook endpoint for `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `customer.subscription.paused`, `customer.subscription.resumed`, `customer.subscription.trial_will_end`, `invoice.paid`, and `invoice.payment_failed`.
- Test cancellation during trial, automatic conversion, failed first payment and recovery, duplicate/out-of-order webhook delivery, reconciliation, and portal return URLs in Stripe test mode.
- Use `pnpm stripe:setup:test` and `pnpm stripe:verify` for safe test-mode resource setup and validation. See `docs/STRIPE_TESTING.md` for the complete local and preview workflow.

## Variable cleanup backlog

- `XAI_API_KEY` is the single server-only credential for xAI/Grok.
- Consolidate `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BASE_URL`.
- Add startup validation that distinguishes required, optional, public, and server-only variables.
- Provide a non-secret CI configuration or provider mocks so the application can build without production services.

## Rotation record

Keep dates, owners, affected environments, and verification evidence in a private security record—not in this public repository. A public issue may state that rotation was completed without naming or showing values.
