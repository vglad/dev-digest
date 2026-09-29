# Browser runner architecture

## Process boundary

[`run.ts`](../run.ts) is a Node/tsx orchestrator around the external
`agent-browser` executable. It loads `specs/*.flow.json`, sorts filenames, and
executes each flow and its steps sequentially. All flows share the CLI's browser
session; the runner closes it in a `finally` block after the flow loop.

A step's `cmd` is an argument array passed to `execFile`, not a shell command.
[`lib/assert.ts`](../lib/assert.ts) substitutes `{BASE}`, performs optional stdout
substring assertions, and formats results. There is no test framework or LLM
involved. Browser waits are assertions because a timeout produces a failing
process exit.

Each flow stops at its first failure. Later flows still run, so the final report
can contain several failures. A command exception triggers a best-effort
screenshot under `test-results/`; a stdout substring mismatch records an
assertion failure without taking that screenshot. The suite exits nonzero if
any flow failed, if no flows were found, or if orchestration crashes.

## Stack ownership

`npm test` runs only the browser orchestrator against an already running stack.
For local isolation, [`scripts/e2e.sh`](../../scripts/e2e.sh) owns an ephemeral
Postgres container, migrations, seed data, the API process, and the Next.js
process. It uses alternate ports and exports the API/web/database configuration
before starting them. Its exit trap removes the isolated database and stops its
child processes. Choose unused alternate ports and a dedicated container name.

CI provisions its own fresh stack and calls the pure runner directly. Both paths
need `agent-browser` and its browser installed separately. The local wrapper
checks/installs package dependencies; the underlying runner does not provision
the application or reset any database.

## Fixtures and scope

Seeded PR navigation depends on `acme/payments-api` being the first/only repo.
The boot smoke itself checks only that some repository redirects to a PR list;
later flows expect PR #482 and its seeded review/diff. Those distinctions explain
why an ordinary developer database can pass boot and fail seeded navigation.

The suite exercises read-only rendering/navigation over real client/API/database
boundaries. It does not prove provider behavior or review generation. Those
belong to engine tests and server tests with injected adapters. Failures and
screenshots are diagnostic artifacts, not source fixtures.

See [runner and journey contracts](../specs/browser-flows.md),
[setup commands](../README.md), and [test lanes](../../TESTING.md).
