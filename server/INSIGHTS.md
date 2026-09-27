# API insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

## What Works

- The server can boot without provider keys; users may configure them later.
- Repo-intel has both a global configuration gate and a per-agent gate; disabled or unavailable indexing degrades review execution to less context rather than preventing a review.

## What Doesn't Work

## Codebase Patterns

- Repo-intel and reviewer-core are wired into review execution through `modules/reviews/run-executor.ts`.
- `server/clones` is runtime data, not source code.
- 2026-09-27 — Persist successful review traces before marking `agent_runs` done: client history polling stops when no runs remain running, and the integration helper waits for all runs (or the requested count) to reach terminal status. Publishing done first can leave trace-backed metadata stale or let test assertions run before the trace is saved. Evidence: `server/src/modules/reviews/run-executor.ts:275` (`runOneAgent`), `client/src/lib/hooks/reviews.ts:49` (`usePrRuns`), and `server/test/helpers/runs.ts:23` (`waitForPrRuns`).
- 2026-09-28 — When querying a PR's latest run cost, select the newest workspace-scoped `agent_runs` row before left-joining its trace; filtering for successful runs or known costs first would incorrectly resurrect an older run's cost. A running, failed, or historical run with no valid cost must mask the preceding cost with `null`; deleting that newest run exposes the preceding run again. Preserve ordering by `ran_at DESC NULLS LAST`, then run ID descending for timestamp ties. Evidence: `server/src/modules/pulls/latest-run-cost.ts:8` (`latestRunCosts`) and `server/test/pulls-cost.it.test.ts:65`, `:85`, and `:101`.

## Tool & Library Notes

- `GITHUB_TOKEN` is canonical and `GITHUB_PAT` is a fallback.
- Global rate limiting is disabled in tests; expensive production routes may have tighter local caps.

## Recurring Errors & Fixes

## Session Notes

## Open Questions
