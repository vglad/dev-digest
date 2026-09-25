# Browser E2E guide

Inherits [repository guidance](../AGENTS.md). This package contains deterministic `agent-browser` flows.

## Read first

- [Runner, flow format, and preconditions](./README.md)
- [Local documentation](./docs/README.md)
- [Flow contract](./specs/README.md)
- [Known constraints](./INSIGHTS.md)

## Local rules

- Keep flows as ordered JSON command lists under `specs/`.
- Use deterministic URL, text, role, and label locators. Never use the AI `chat` command.
- Target seeded, non-destructive data and avoid real model calls.
- Prefer the hermetic runner; do not reset the developer database to make a flow pass.
- Keep runner behavior in `run.ts` and reusable process helpers in `lib/`.

## Validate

```sh
npm run typecheck
npm run e2e:hermetic
```
