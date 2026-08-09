# Product status

Status values:

- **Implemented**: a meaningful end-to-end path exists, though it may still have release blockers.
- **Partial**: substantial code exists, but the path has material gaps.
- **Marketed only**: represented in copy or UI but no verified end-to-end product exists.

| Capability | Status | Notes |
| --- | --- | --- |
| Marketing site | Implemented | Primary CTAs now open the Privy signup flow and unverified headline metrics were removed; broader marketed-only capability copy still needs product review. |
| Privy authentication | Partial | Bearer-token API authorization and server-authoritative redirects are implemented; page middleware cookies remain a navigation hint rather than an authorization boundary. |
| Onboarding | Partial | Job ownership and profile/completion persistence are server-authoritative; the 60-second `waitUntil` worker is not yet a durable queue. |
| Trial subscriptions | Partial | An explicit card-required fourteen-day Stripe trial follows the free preview; Stripe owns lifecycle state and local reconciliation no longer independently expires trials, while provider-backed journey tests and reminder delivery remain. |
| Pathfinder | Partial | API authentication, entitlement, actor identity, durable quotas, and guard tests are implemented; provider integration and browser coverage remain. |
| People Intelligence | Partial | API authentication, entitlement, durable quotas, request caps, and redacted route logging are implemented; the large route still needs modular extraction. |
| Company Intelligence | Partial | Read/write/analyze APIs now enforce entitlement and bounded inputs; domain and provider boundaries remain coupled. |
| Stripe Checkout and portal | Partial | Checkout and portal are Privy-owned, billing is isolated from social identities, and webhooks refresh canonical Stripe state into dedicated entitlement records; preview replay/concurrency testing, legacy backfill verification, and schema rollout remain. |
| Ping / message outreach | Marketed only | No verified message drafting, sending, or response-tracking workflow. |
| Team collaboration | Marketed only | Pricing/marketing references teams without a verified workspace or membership model. |
| SSO and audit logs | Marketed only | Listed in pricing; no verified implementation. |
| Public API access | Marketed only | Listed in pricing; no supported authenticated customer API. |
| CSV exports | Partial or marketed only | UI/feature flags reference exports; no verified complete export journey. |

## Release definition

The first releasable wedge should be signup, resumable onboarding, Pathfinder, and billing. People and Company Intelligence can follow after the same authorization, entitlement, quota, test, and observability standards are applied.

Do not add numerical customer, network-size, conversion, or success-rate claims without a named source and an update process.

## Remaining stabilization work

- Rotate every historically exposed credential and coordinate the git-history rewrite.
- Apply the new Neo4j rate-limit, billing-account, Stripe-subscription, and Stripe-event uniqueness constraints in a non-production environment, verify them, then schedule the approved production change.
- Select and implement a durable onboarding job platform through an ADR.
- Add mocked provider/API integration tests and authenticated Playwright journeys.
- Extract Pathfinder, People Intelligence, Company Intelligence, onboarding, and billing modules before attempting the AppUser/Person/Organization graph-model change.
