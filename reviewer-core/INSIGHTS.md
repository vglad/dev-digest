# Review engine insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

Previously undated entries were verified on 2026-09-29 and use that date; existing entry dates are preserved.

## What Works

## What Doesn't Work

## Codebase Patterns

- 2026-09-29 — Prompt slots for skills, memory, specs, and callers already exist even when the starter does not populate all of them. Evidence: `reviewer-core/src/prompt.ts:43` (`PromptParts` optional inputs), `reviewer-core/src/prompt.ts:109` (conditional sections), and `server/src/modules/reviews/run-executor.ts:190` (caller inputs).
- 2026-09-29 — Grounding can change the finding list and score after the model returns. Evidence: `reviewer-core/src/review/run.ts:197` (`groundFindings`) and `reviewer-core/src/review/run.ts:208` (return kept findings with a recomputed score).
- 2026-09-29 — Verdict currently passes through from the model (the worst model verdict wins for multiple chunks), unlike score; prompt verdict semantics are therefore load-bearing. Evidence: `reviewer-core/src/review/reduce.ts:43` (`reduceReviews`) and `reviewer-core/src/review/run.ts:208` (grounding preserves the merged verdict).

## Tool & Library Notes

- 2026-09-29 — The server consumes TypeScript source through a path alias; this package does not emit JavaScript. Evidence: `server/tsconfig.json:24` (`@devdigest/reviewer-core` source alias) and `reviewer-core/tsconfig.json:18` (`noEmit`).
- 2026-09-29 — Structured output constraints are provider parameters, not prose in agent prompts. Evidence: `reviewer-core/src/review/run.ts:174` (schema passed to `completeStructured`) and `reviewer-core/src/llm/openrouter.ts:73` (`response_format` with strict JSON Schema).

## Recurring Errors & Fixes

## Session Notes

## Open Questions
