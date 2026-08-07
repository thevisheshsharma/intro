# Local baseline

Captured on 2026-08-08 from commit `2aa555611f42e18f6948014f06b1040a65ff3645` on macOS using the Codex bundled Node.js runtime and pnpm 11.16.0.

## Results

| Check | Result | Notes |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | Pass | Lockfile verified. Transitive install scripts listed in `pnpm-workspace.yaml` are explicitly disabled pending review. |
| `pnpm lint` | Pass | No ESLint warnings or errors. |
| `pnpm type-check` | Pass | `tsc --noEmit` completed successfully. |
| `pnpm build` | Blocked | Compilation, lint, and type validation pass; prerender fails because no valid development `NEXT_PUBLIC_PRIVY_APP_ID` is configured. |
| Automated tests | Unavailable | No test harness or test script exists. |

## Interpretation

The build failure is a reproducibility baseline, not permission to use production credentials locally. Resolve it with an isolated Privy development app or a documented provider-safe build strategy.

Re-run and update this baseline after the dependency/security upgrade, environment validation, or test-harness work changes the result.
