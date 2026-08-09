# Stripe billing ownership and Neo4j entitlement projection

- Status: accepted
- Date: 2026-08-09

## Context

Berri's initial billing implementation stored Stripe customer, subscription, plan, and lifecycle properties directly on the same Neo4j `User` nodes used for Privy identities and X/Twitter people. Onboarding merge paths could therefore move billing properties according to a social-handle match. Webhook receipts were durable, but subscription updates trusted event snapshots even though Stripe does not guarantee delivery order.

Berri is launching one individual, self-serve Founder subscription. Organization, seat, usage, and multi-provider billing are explicitly out of scope until customer demand validates them.

## Decision

- Stripe is Berri's only payment and subscription provider.
- Stripe owns payment, trial, renewal, cancellation, and recovery state.
- A `BillingAccount`, uniquely keyed by verified Privy DID, owns the Stripe customer identifier.
- A `StripeSubscription`, uniquely keyed by Stripe subscription ID, stores the local entitlement projection.
- Social `User` identity merges never read, write, or transfer billing properties.
- Webhook processing verifies signatures, deduplicates event IDs, retrieves current subscription state from Stripe, and ignores projection updates older than the billing account's latest Stripe synchronization.
- Checkout and portal routes derive billing ownership from the verified Privy bearer token.
- Only `trialing` and `active` subscriptions grant paid access. Other and unknown states fail closed.
- A bounded scheduled reconciliation refreshes current Stripe subscriptions. Local time never independently changes a Stripe subscription's status.

## Alternatives considered

- **Continue storing billing properties on `User`:** rejected because application and social identities are not yet cleanly separated.
- **Introduce Postgres now:** deferred because the individual Founder subscription does not require a second datastore. Reconsider before organization, seat, usage, credit, or finance-ledger requirements ship.
- **Support multiple billing providers:** rejected as unnecessary launch complexity.
- **Let a local cron expire trials:** rejected because it creates a second subscription authority and can race provider webhooks.

## Security and privacy impact

- Billing ownership is keyed by a verified, server-side Privy DID rather than a client-supplied social identity.
- Stripe continues to collect payment details; Berri stores only provider identifiers and entitlement fields.
- Full webhook bodies and billing PII are not persisted or logged.
- Unique constraints protect billing-account, customer, subscription, and event identities after their reviewed rollout.

## Operational impact

Operators must configure only Stripe test/live resources for the corresponding environment, register the documented webhook events, enable the customer portal, and schedule the reconciliation route with a unique cron secret. Dodo credentials and dependencies are not part of the application inventory.

## Migration and rollback

New accounts and webhook updates write the dedicated billing model. Reads temporarily fall back to legacy `User` billing properties so existing Stripe subscriptions remain usable. A verified Stripe webhook automatically creates the new projection when its subscription metadata contains the Privy DID.

Before removing the legacy fallback, operators must apply the new constraints in an isolated database, reconcile existing Stripe subscriptions, compare account and entitlement counts, and obtain explicit approval for production mutation. Rollback restores the previous read path but must not restore application-owned trial expiry.

## Consequences and follow-up work

- Add mocked checkout, portal, webhook replay, concurrency, and out-of-order integration coverage.
- Verify preview checkout, trial conversion, failed payment recovery, cancellation, and portal return behaviour in Stripe test mode.
- Remove legacy billing properties only through a separately reviewed migration.
- Revisit the datastore and ownership model only when organization or more complex billing demand is demonstrated.
