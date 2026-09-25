# Review engine guide

Inherits [repository guidance](../AGENTS.md). This package is pure review logic; its only intended side effect is the injected LLM call.

## Read first

- [Pipeline and public API](./README.md)
- [Local documentation](./docs/README.md)
- [Engine invariants](./specs/README.md)
- [Known constraints](./INSIGHTS.md)
- [Prompt authoring](../docs/agent-prompts/README.md)

## Local rules

- Keep database, filesystem, GitHub, and server-framework concerns out of this package.
- Preserve the untrusted-content wrappers and fixed injection guard.
- Validate model output through structured schemas and mechanically ground every finding against the diff.
- Recompute derived scores from grounded findings; do not trust model arithmetic.
- Add focused unit tests for prompt assembly, parsing/repair, grounding, and reduction changes.

## Validate

```sh
npm run typecheck
npm test
```
