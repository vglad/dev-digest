# Web package guide

Inherits [repository guidance](../AGENTS.md). This package is the Next.js 15/React 19 studio.

## Read first

- [Web architecture and route map](./README.md)
- [Local documentation](./docs/README.md)
- [UI contracts](./specs/README.md)
- [Known constraints](./INSIGHTS.md)

## Local rules

- Keep App Router pages thin; place feature behavior in colocated components and data access in `src/lib/hooks` over `src/lib/api.ts`.
- Respect Server/Client Component boundaries and existing `next-intl` message files.
- Reuse `src/vendor/ui` primitives and shared Zod contracts before adding local equivalents.
- Test behavior with React Testing Library and user-facing queries; mock `fetch`, not internal hooks.
- Do not edit `.next` or `node_modules`.

## Validate

```sh
pnpm typecheck
pnpm test
pnpm build
```

Run `build` when routing, rendering boundaries, configuration, or production bundling may be affected.
