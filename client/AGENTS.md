# Web package guide

Inherits [repository guidance](../AGENTS.md). This package is the Next.js 15/React 19 studio.

## Read first

- [Web architecture and route map](./README.md)
- [Web deep dives](./docs/README.md) for design notes and diagrams
- [Web specifications](./specs/README.md) for UI flows and acceptance criteria
- [UI design-system usage and conventions](./src/vendor/ui/README.md) when changing shared UI
- [Repository test strategy](../TESTING.md) when changing test coverage or CI
- [Durable package insights](./INSIGHTS.md)

## Local rules

- Keep App Router pages thin; place feature behavior in colocated components and data access in `src/lib/hooks` over `src/lib/api.ts`.
- Respect Server/Client Component boundaries and existing `next-intl` message files.
- Reuse `src/vendor/ui` primitives and shared Zod contracts before adding local equivalents.
- When an API contract changes, inspect the corresponding definition under `../server/src/vendor/shared`; the two vendored trees overlap but are not identical.
- Test behavior with React Testing Library and user-facing queries; mock `fetch`, not internal hooks.
- Do not edit `.next` or `node_modules`.

## Validate

```sh
pnpm typecheck
pnpm test
pnpm build
```

Run `build` when routing, rendering boundaries, configuration, or production bundling may be affected.
