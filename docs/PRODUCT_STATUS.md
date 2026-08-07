# Product status

Status values:

- **Implemented**: a meaningful end-to-end path exists, though it may still have release blockers.
- **Partial**: substantial code exists, but the path has material gaps.
- **Marketed only**: represented in copy or UI but no verified end-to-end product exists.

| Capability | Status | Notes |
| --- | --- | --- |
| Marketing site | Implemented | Polished pages exist; primary signup links and some claims need correction. |
| Privy authentication | Partial | Provider integration exists; redirect and server-authoritative routing need repair. |
| Onboarding | Partial | Analysis and status UI exist; persistence, job durability, and authoritative completion are incomplete. |
| Trial subscriptions | Partial | Ten-day Founder-plan trial is implemented in server code; marketing also claims fourteen days. |
| Pathfinder | Partial | Relationship discovery is substantial; core API security, quotas, and tests are missing. |
| People Intelligence | Partial | Organization-affiliate pipeline exists; route security and maintainability are blockers. |
| Company Intelligence | Partial | ICP read/write and analysis exist; access policy and authentication are inconsistent. |
| Stripe Checkout and portal | Partial | Core integration exists; webhook idempotency and end-to-end tests are missing. |
| Ping / message outreach | Marketed only | No verified message drafting, sending, or response-tracking workflow. |
| Team collaboration | Marketed only | Pricing/marketing references teams without a verified workspace or membership model. |
| SSO and audit logs | Marketed only | Listed in pricing; no verified implementation. |
| Public API access | Marketed only | Listed in pricing; no supported authenticated customer API. |
| CSV exports | Partial or marketed only | UI/feature flags reference exports; no verified complete export journey. |

## Release definition

The first releasable wedge should be signup, resumable onboarding, Pathfinder, and billing. People and Company Intelligence can follow after the same authorization, entitlement, quota, test, and observability standards are applied.

Do not add numerical customer, network-size, conversion, or success-rate claims without a named source and an update process.
