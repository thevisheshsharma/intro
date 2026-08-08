# Local baseline

Originally captured on 2026-08-08 from commit `2aa555611f42e18f6948014f06b1040a65ff3645` on macOS using the Codex bundled Node.js runtime and pnpm 11.16.0. Updated on the P0 stabilization branch after the Next.js 15 migration and test-harness work.

## Results

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Pass | Lockfile verified. Transitive install scripts listed in `pnpm-workspace.yaml` are explicitly disabled pending review. |
| `pnpm lint` | Pass | No ESLint warnings or errors. |
| `pnpm type-check` | Pass | `tsc --noEmit` completed successfully. |
| `pnpm build` | Pass | Missing public Privy configuration now renders a fail-closed configuration screen instead of breaking prerender. |
| `pnpm test` | Pass | Vitest authorization/security suite passes. |
| `pnpm audit --prod --audit-level=high` | Pass | No high or critical production advisories after the Next.js upgrade and patched transitive overrides; moderate/low findings remain. |

## Interpretation

Build reproducibility no longer requires production credentials. Interactive local QA still requires isolated development credentials; production credentials must never be used as a build workaround.

Re-run and update this baseline after the dependency/security upgrade, environment validation, or test-harness work changes the result.
