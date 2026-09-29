# API insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

Previously undated entries were verified on 2026-09-29 and use that date; existing entry dates are preserved.

## What Works

- 2026-09-29 — The server can boot without provider keys; users may configure them later. Evidence: `server/src/platform/config.ts:9` (secrets excluded from startup config), `server/src/platform/container.ts:163` (lazy LLM resolution), and `server/src/modules/settings/routes.ts:79` (runtime key persistence).
- 2026-09-29 — Repo-intel has both a global configuration gate and a per-agent gate; disabled or unavailable indexing degrades review execution to less context rather than preventing a review. Evidence: `server/src/modules/repo-intel/service.ts:406` (global gate and missing-index fallback), `server/src/modules/reviews/run-executor.ts:168` (per-agent gate), and `server/test/repo-intel-facade-degraded.test.ts:43` (degraded facade contract).

## What Doesn't Work

## Codebase Patterns

- 2026-09-29 — Repo-intel and reviewer-core are wired into review execution through `modules/reviews/run-executor.ts`. Evidence: `server/src/modules/reviews/run-executor.ts:174` (context enrichment) and `server/src/modules/reviews/run-executor.ts:190` (`reviewPullRequest`).
- 2026-09-29 — `server/clones` is runtime data, not source code. Evidence: `.gitignore:20` (`clones/` exclusion) and `server/src/platform/container.ts:91` (`SimpleGitClient` uses the configured clone directory).
- 2026-09-27 — Persist successful review traces before marking `agent_runs` done: client history polling stops when no runs remain running, and the integration helper waits for all runs (or the requested count) to reach terminal status. Publishing done first can leave trace-backed metadata stale or let test assertions run before the trace is saved. Evidence: `server/src/modules/reviews/run-executor.ts:275` (`runOneAgent`), `client/src/lib/hooks/reviews.ts:49` (`usePrRuns`), and `server/test/helpers/runs.ts:23` (`waitForPrRuns`).
- 2026-09-28 — When querying a PR's latest run cost, select the newest workspace-scoped `agent_runs` row before left-joining its trace; filtering for successful runs or known costs first would incorrectly resurrect an older run's cost. A running, failed, or historical run with no valid cost must mask the preceding cost with `null`; deleting that newest run exposes the preceding run again. Preserve ordering by `ran_at DESC NULLS LAST`, then run ID descending for timestamp ties. Evidence: `server/src/modules/pulls/latest-run-cost.ts:8` (`latestRunCosts`) and `server/test/pulls-cost.it.test.ts:65`, `server/test/pulls-cost.it.test.ts:85`, and `server/test/pulls-cost.it.test.ts:101`.

- 2026-09-29 — Supersedes the 2026-09-28 latest-run-cost entry: PR cost now sums known nonnegative costs from all workspace-scoped successful (`done`) runs. New running, failed, cancelled, or unknown-cost runs must preserve earlier successful spend; deletion subtracts only the deleted successful cost. The API field is `total_run_cost_usd` in both shared-contract copies. Evidence: `server/src/modules/pulls/successful-run-cost.ts:14` (`successfulRunCosts`) and `server/test/pulls-cost.it.test.ts:65` (integration regression).

## Tool & Library Notes

- 2026-09-29 — `GITHUB_TOKEN` is canonical and `GITHUB_PAT` is a fallback. Evidence: `server/src/adapters/secrets/local.ts:40` (`LocalSecretsProvider` environment fallback).
- 2026-09-29 — Global rate limiting is disabled in tests; expensive production routes may have tighter local caps. Evidence: `server/src/app.ts:95` (test-environment gate) and `server/src/modules/reviews/routes.ts:29` (review route cap).

## Recurring Errors & Fixes

## Session Notes

## Open Questions
