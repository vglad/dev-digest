# Browser E2E guide

Inherits [repository guidance](../AGENTS.md). This package contains deterministic `agent-browser` flows.

## Read When

- [Runner, flow format, and preconditions](./README.md)
- [E2E design notes](./docs/README.md)
- [Flow catalog and authoring rules](./specs/README.md)
- [Repository test strategy](../TESTING.md) when changing suite coverage or CI
- `specs/*.flow.json` for the executable browser journeys
- [Durable package insights](./INSIGHTS.md)

## Local rules

- Keep flows as ordered JSON command lists under `specs/`.
- Use deterministic URL, text, role, and label locators. Never use the AI `chat` command.
- Target seeded, non-destructive data and avoid real model calls.
- Prefer the hermetic runner; do not reset the developer database to make a flow pass.
- Keep runner behavior in `run.ts` and reusable process helpers in `lib/`.

## Naming conventions

- Name flows `specs/NN-kebab-case.flow.json`; the two-digit prefix sets execution order in the shared browser session.
- Use descriptive human-readable `name` and step `label` fields; name TypeScript helpers in `kebab-case` under `lib/`.

## Validate

```sh
npm run lint
npm run typecheck
npm run e2e:hermetic
```
