# Stripe-owned paid-plan trials

- Status: accepted
- Date: 2026-08-08

## Context

Berri previously created a ten-day Founder trial when an authenticated session or onboarding analysis first touched the subscription service. That started the clock before the user intentionally chose a trial. Stripe Checkout then created an immediately billable subscription without a trial, so the product copy, Neo4j state, and Stripe state could disagree.

The launch flow now offers a limited Explorer preview before asking for a payment method. Paid plans intentionally avoid a customer-facing usage meter during the launch learning period.

## Decision

- Connecting X, onboarding analysis, and Explorer access never create a paid-plan trial.
- A user starts a trial only by clicking **Start my 14-day trial** and completing Stripe Checkout.
- Checkout requires a payment method, creates a fourteen-day Stripe subscription trial, and discloses the first charge and date.
- Stripe subscription webhooks are the source of truth for trial, active, past-due, canceled, renewal, and cancel-at-period-end state.
- The Stripe customer portal is the supported cancellation and payment-management surface.
- Founder is the only self-serve checkout plan at launch. Growth remains a private rollout until team controls exist.
- Explorer is represented by a missing paid plan/status and receives only the limited preview/read-only experience.
- Paid-plan provider costs remain protected by server-side rate and abuse controls, not a customer-facing credit wallet.

## Alternatives considered

- **Automatically start a trial at signup:** rejected because it spends trial time before activation and contradicts deliberate card collection.
- **No-card trial:** rejected for the initial launch because cost-bearing network and AI work is susceptible to abuse; the free preview supplies a lower-friction entry instead.
- **Customer-facing credits:** rejected for core product exploration because it increases cognitive load and discourages use. CRM and API usage may be metered by successful outcomes after those products ship.

## Security and privacy impact

- Checkout continues to require a verified Privy bearer token.
- Stripe, rather than Berri, collects payment details.
- Checkout return destinations are selected from a closed enum; callers cannot supply an open redirect.
- Existing cost-bearing routes retain durable rate limits even when paid plans show no usage meter.
- Legacy Neo4j trials without a Stripe subscription ID are treated as Explorer at read time and are not silently mutated.

## Operational impact

Operators must:

1. Configure Founder monthly and annual Stripe Price IDs in each environment.
2. Enable customer cancellation in the Stripe customer portal.
3. Enable Stripe trial-ending and payment notifications, or provide an equivalent verified reminder service.
4. Subscribe the webhook endpoint to checkout and customer subscription lifecycle events.
5. Verify the flow in Stripe test mode before any production rollout.

## Migration and rollback

No production data migration is performed by this change. Legacy application-created trials remain stored but are normalized to Explorer when no Stripe subscription ID exists. A future reviewed migration can remove obsolete trial fields after backups and rollout approval.

Rollback requires reverting the application flow and Stripe Checkout trial configuration together. Restoring implicit trials alone would recreate split-brain billing state and is not supported.

## Consequences and follow-up work

- Add authenticated browser coverage for preview → Checkout → webhook → portal cancellation.
- Deliver and verify trial-ending reminders.
- Validate plan prices and paid usage behavior using retained-customer and provider-cost data.
- Decide whether early paid customers will be grandfathered if customer-facing usage policies are introduced later.
