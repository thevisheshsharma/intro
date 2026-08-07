# Security policy

## Current status

This repository is not yet production-ready. The current stabilization priorities include credential rotation, API authorization, server-side entitlements, rate limiting, dependency upgrades, test coverage, and safe operational controls.

Do not include vulnerability details, credentials, personal data, or proof-of-concept exploit traffic in a public issue.

## Reporting

For now, report a suspected vulnerability privately to the repository owner through an agreed private channel. Add a dedicated security contact or GitHub private vulnerability reporting process before inviting external testing.

Include:

- affected route or component;
- impact and preconditions;
- minimal reproduction using synthetic data;
- affected commit or deployment;
- recommended containment if known.

Never test destructive, expensive, or mutating production paths without explicit authorization.

## Engineering requirements

- Verify Privy tokens server-side for user APIs.
- Enforce entitlements and quotas server-side.
- Rate-limit cost-bearing and graph-expansion operations.
- Fail closed for missing webhook, cron, and admin secrets.
- Validate and bound all external input and provider output.
- Redact credentials, PII, request bodies, and provider payloads from logs.
- Use replay-safe Stripe webhook handling.
- Keep maintenance routes unavailable to public callers.
- Review dependencies and secrets in CI.

## Historical credential exposure

An environment file existed in git history. All credentials that appeared there must be rotated, verified, and recorded privately. Removing a file from the current tree does not invalidate historical credentials. Any history rewrite must be coordinated because it changes commit identities and requires existing clones to be replaced or carefully repaired.
