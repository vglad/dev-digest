# Web insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

Previously undated entries were verified on 2026-09-29 and use that date; existing entry dates are preserved.

## What Works

- 2026-09-29 — Client tests are intended to be hermetic and do not require the server, database, or browser. Evidence: `client/vitest.config.ts:15` (jsdom environment) and `client/src/components/RunCost.test.tsx:124` (mocked fetch).

## What Doesn't Work

## Codebase Patterns

- 2026-09-29 — Shared contracts and UI primitives are vendored under `src/vendor`; the shared-contract tree overlaps with, but is not identical to, the server copy. Evidence: `client/tsconfig.json:24` (vendored aliases), `client/src/vendor/shared/adapters.ts:77` and `server/src/vendor/shared/adapters.ts:83` (`LLMProvider` supports different provider IDs).
- 2026-09-29 — The app shell owns navigation, breadcrumbs, and global `g`-then-key shortcuts. Evidence: `client/src/components/app-shell/AppShell.tsx:18` (shell wiring), `client/src/components/app-shell/AppShell.tsx:24` (breadcrumbs), and `client/src/components/app-shell/hooks/useGlobalShortcuts.ts:37` (`g` navigation).
- 2026-09-29 — The real browser journeys are maintained separately in `../e2e`. Evidence: `e2e/run.ts:53` (`loadFlows`) and `e2e/specs/02-repo-pulls-detail.flow.json:4` (PR navigation journey).
- 2026-09-27 — When `usePrRuns` refreshes the pulls list after a run lifecycle change, pass the route's `repoId` into the hook and invalidate `["pulls", repoId]`; invalidating the `["pulls"]` prefix affects every repository's cached list. This scoped behavior applies to `usePrRuns`; the start/delete mutation hooks currently use broader invalidation. Evidence: `client/src/lib/hooks/reviews.ts:58` (`usePrRuns`), `client/src/components/RunCost.test.tsx:197`, and `client/src/lib/hooks/reviews.ts:85` (`useDeleteRun`) and `client/src/lib/hooks/reviews.ts:158` (`useRunReview`).
- 2026-09-28 — Refinement of the 2026-09-27 lifecycle-invalidation entry: keep `usePrRuns` mounted at the PR page level and refresh dependent queries when run IDs/statuses change. The Findings tab's `onRunDone` callback is unavailable while Overview or Diff is selected, so relying on it alone leaves cost metadata stale after a run settles. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/page.tsx:47` and `client/src/app/repos/[repoId]/pulls/[number]/page.tsx:150`, `client/src/lib/hooks/reviews.ts:54` (`usePrRuns`), and `client/src/components/RunCost.test.tsx:118` (done/failed lifecycle coverage with Overview selected).

- 2026-09-29 — Scope finding action shortcuts to the panel containing keyboard focus: multiple review accordions can remain expanded, so an unscoped window listener in each panel can accept or dismiss findings in several reviews from one keypress. Reset the selected finding when visible IDs change. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/FindingsPanel.tsx:48` (`FindingsPanel`) and `client/src/components/severity-findings/SeverityBadges.test.tsx:122` (keyboard selection and panel isolation regression).

## Tool & Library Notes

- 2026-09-29 — `NEXT_PUBLIC_API_BASE` defaults to `http://localhost:3001`. Evidence: `client/src/lib/api.ts:5` (`API_BASE`).

## Recurring Errors & Fixes

## Session Notes

## Open Questions
