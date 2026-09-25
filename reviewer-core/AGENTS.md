# Review engine guide

Inherits [repository guidance](../AGENTS.md). This package is pure review logic; its only intended side effect is the injected LLM call.

## Read first

- [Pipeline and public API](./README.md)
- [Review-engine deep dives](./docs/README.md) for pipeline and design notes
- [Review-engine specifications](./specs/README.md) for behavioral contracts and acceptance criteria
- [Prompt authoring](../docs/agent-prompts/README.md)
- [Repository test strategy](../TESTING.md) when changing coverage or CI
- [Durable package insights](./INSIGHTS.md)

## Local rules

- Keep database, filesystem, GitHub, and server-framework concerns out of this package.
- Accept skills, memory, specifications, and caller context as resolved strings; lookup and persistence belong to the calling package.
- Preserve the untrusted-content wrappers and fixed injection guard.
- Validate model output through structured schemas and mechanically ground every finding against the diff.
- Recompute derived scores from grounded findings; do not trust model arithmetic.
- Add focused unit tests for prompt assembly, parsing/repair, grounding, and reduction changes.

## Validate

```sh
npm run typecheck
npm test
```
