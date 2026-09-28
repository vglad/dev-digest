# Web insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

## What Works

- Client tests are intended to be hermetic and do not require the server, database, or browser.

## What Doesn't Work

## Codebase Patterns

- Shared contracts and UI primitives are vendored under `src/vendor`; the shared-contract tree overlaps with, but is not identical to, the server copy.
- The app shell owns navigation, breadcrumbs, and global `g`-then-key shortcuts.
- The real browser journeys are maintained separately in `../e2e`.
- 2026-09-27 — When `usePrRuns` refreshes the pulls list after a run lifecycle change, pass the route's `repoId` into the hook and invalidate `["pulls", repoId]`; invalidating the `["pulls"]` prefix affects every repository's cached list. This scoped behavior applies to `usePrRuns`; the start/delete mutation hooks currently use broader invalidation. Evidence: `client/src/lib/hooks/reviews.ts:58` (`usePrRuns`), `client/src/components/RunCost.test.tsx:196`, and `client/src/lib/hooks/reviews.ts:85` (`useDeleteRun`) and `:154` (`useRunReview`).
- 2026-09-28 — Refinement of the 2026-09-27 lifecycle-invalidation entry: keep `usePrRuns` mounted at the PR page level and refresh dependent queries when run IDs/statuses change. The Findings tab's `onRunDone` callback is unavailable while Overview or Diff is selected, so relying on it alone leaves cost metadata stale after a run settles. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/page.tsx:46` and `:139`, `client/src/lib/hooks/reviews.ts:54` (`usePrRuns`), and `client/src/components/RunCost.test.tsx:117` (done/failed lifecycle coverage with Overview selected).

- 2026-09-29 — Scope finding action shortcuts to the panel containing keyboard focus: multiple review accordions can remain expanded, so an unscoped window listener in each panel can accept or dismiss findings in several reviews from one keypress. Reset the selected finding when visible IDs change. Evidence: `client/src/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/FindingsPanel.tsx:38` (`FindingsPanel`) and `client/src/components/severity-findings/SeverityBadges.test.tsx:123` (keyboard selection and panel isolation regression).

## Tool & Library Notes

- `NEXT_PUBLIC_API_BASE` defaults to `http://localhost:3001`.

## Recurring Errors & Fixes

## Session Notes

## Open Questions
