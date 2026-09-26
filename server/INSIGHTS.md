# API insights

Non-obvious findings and gotchas that should survive across sessions. Add an entry when a discovery would otherwise need to be relearned.

## What Works

- The server can boot without provider keys; users may configure them later.
- Repo-intel has both a global configuration gate and a per-agent gate; disabled or unavailable indexing degrades review execution to less context rather than preventing a review.

## What Doesn't Work

## Codebase Patterns

- Repo-intel and reviewer-core are wired into review execution through `modules/reviews/run-executor.ts`.
- `server/clones` is runtime data, not source code.

## Tool & Library Notes

- `GITHUB_TOKEN` is canonical and `GITHUB_PAT` is a fallback.
- Global rate limiting is disabled in tests; expensive production routes may have tighter local caps.

## Recurring Errors & Fixes

## Session Notes

## Open Questions
