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

1. Copy `.env.example` to `.env.local`.
2. Retrieve development values from the approved owner after historical credentials are rotated.
3. Never reuse production secrets locally.
4. Start with `pnpm dev` and perform only read-safe checks until the target database is confirmed.

## Variable cleanup backlog

- Consolidate `GROK_API_KEY` and `XAI_API_KEY` behind one server-only variable.
- Consolidate `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_BASE_URL`.
- Add startup validation that distinguishes required, optional, public, and server-only variables.
- Provide a non-secret CI configuration or provider mocks so the application can build without production services.

## Rotation record

Keep dates, owners, affected environments, and verification evidence in a private security record—not in this public repository. A public issue may state that rotation was completed without naming or showing values.
