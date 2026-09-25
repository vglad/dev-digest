# API insights

- The server can boot without provider keys; users may configure them later.
- `GITHUB_TOKEN` is canonical and `GITHUB_PAT` is a fallback.
- Global rate limiting is disabled in tests; expensive production routes may have tighter local caps.
- Repo-intel and reviewer-core are wired into review execution through `modules/reviews/run-executor.ts`.
- `server/package.json` may be locally marked `skip-worktree`; CI invokes explicit Vitest commands rather than assuming extra scripts exist.
- `server/clones` is runtime data, not source code.
