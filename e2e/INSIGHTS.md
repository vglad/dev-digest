# E2E insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

Previously undated entries were verified on 2026-09-29 and use that date; existing entry dates are preserved.

## What Works

- 2026-09-29 — The hermetic runner uses alternate ports and an ephemeral database, so it can coexist with normal development. Evidence: `scripts/e2e.sh:27` (database port), `scripts/e2e.sh:32` (API/web ports), and `scripts/e2e.sh:87` (ephemeral Postgres container).

## What Doesn't Work

## Codebase Patterns

- 2026-09-29 — The flows share one browser session per run. Evidence: `e2e/run.ts:105` (sequential flows) and `e2e/run.ts:110` (close the shared browser after all flows).
- 2026-09-29 — Several journeys assume the seeded demo repository is the first and only repository. Evidence: `e2e/specs/02-repo-pulls-detail.flow.json:3` (seeded-repository precondition) and `e2e/specs/04-pr-findings.flow.json:3` (seeded findings precondition).
- 2026-09-29 — Failure screenshots are CI artifacts, not tracked source. Evidence: `e2e/run.ts:86` (failure screenshot), `.github/workflows/e2e-web.yml:124` (artifact upload), and `.gitignore:22` (`test-results/` exclusion).
- 2026-09-29 — The suite uses browser automation but no LLM. Evidence: `e2e/run.ts:44` (direct CLI invocation) and `e2e/specs/04-pr-findings.flow.json:4` (deterministic commands over seeded findings).

## Tool & Library Notes

## Recurring Errors & Fixes

## Session Notes

## Open Questions
