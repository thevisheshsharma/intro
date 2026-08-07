# Contributing

## Scope

Keep changes small, reviewable, and tied to explicit acceptance criteria. Do not combine security stabilization, broad refactoring, dependency upgrades, and new product behavior in one pull request.

## Branches

Use a focused prefix such as `codex/`, `fix/`, `feat/`, or `docs/`. Do not work directly on `main`.

## Before editing

- Read `AGENTS.md` and the relevant document under `docs/`.
- Inspect the current implementation and git status.
- For auth, billing, Neo4j data-model, background jobs, dependencies, or cross-cutting work, write a plan first.
- Confirm the target environment before any mutating provider or database operation.

## Pull-request checklist

- [ ] Acceptance criteria are stated and met.
- [ ] The diff contains no secrets, environment files, personal data, or sensitive logs.
- [ ] Authentication and authorization were evaluated.
- [ ] Entitlement, quota, rate-limit, and provider-cost implications were evaluated.
- [ ] Inputs and provider outputs are validated and bounded.
- [ ] Tests cover changed behavior, or the absent-harness baseline and manual checks are explicit.
- [ ] `pnpm lint` passes.
- [ ] `pnpm type-check` passes.
- [ ] `pnpm build` passes in an appropriate non-production environment, or the exact blocker is documented.
- [ ] Product status, environment inventory, architecture docs, or ADRs were updated when relevant.
- [ ] Preview browser QA covers the affected journey.
- [ ] Deployment, migration, and rollback steps are explicit when relevant.

## Review expectations

Risky changes should receive an independent review focused on correctness, security, data integrity, test adequacy, and operational failure modes. Review comments should identify the concrete scenario and affected file/line rather than request vague cleanup.

## Production

Do not deploy to production, rotate a live credential, run a production migration, or invoke a destructive/admin operation without explicit operator authorization.
