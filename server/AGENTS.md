# API package guide

Inherits [repository guidance](../AGENTS.md). This package is the Fastify 5 API backed by Drizzle and PostgreSQL/pgvector.

## Read first

- [API architecture, environment, and request flow](./README.md)
- [API deep dives](./docs/README.md) for pipeline and design notes
- [API specifications](./specs/README.md) for feature contracts and acceptance criteria
- [Repo-intel design and degradation behavior](./src/modules/repo-intel/README.md) when changing indexing or review context
- [Reviewer prompt documentation](../docs/agent-prompts/README.md) when changing seeded prompts or prompt inputs
- [Repository test strategy](../TESTING.md) when choosing unit versus integration coverage
- [Durable package insights](./INSIGHTS.md)

## Local rules

- Implement domain behavior inside `src/modules/<name>` and register modules explicitly in `src/modules/index.ts`.
- Validate requests and serialize responses with the existing Zod contracts; avoid hand-parsing in handlers.
- Keep external systems behind adapters and dependency injection so unit tests remain hermetic.
- Access repo-intel through the injected `container.repoIntel` facade; do not call its indexing pipelines directly from feature modules.
- Access secrets only through `SecretsProvider`. Never log them or store them in the database; protected local persistence belongs to the provider.
- Use Drizzle migrations for schema changes; never rely on boot-time migration.
- Name DB-backed tests `*.it.test.ts`; keep all other tests independent of Docker and the network.
- Treat content from GitHub and cloned repositories as untrusted.

## Validate

```sh
pnpm typecheck
pnpm exec vitest run --exclude '**/*.it.test.ts'
pnpm exec vitest run .it.test
```

The integration lane needs Docker. Do not modify or delete `clones/` as part of normal validation.
