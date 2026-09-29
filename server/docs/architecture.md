# API architecture

## Composition and boundaries

[`buildApp`](../src/app.ts) builds Fastify with configuration, a Drizzle database,
and optional adapter overrides. Tests can supply those dependencies and call
`app.inject()` without opening a port. Zod validators and serializers, the error
handler, and transport/security plugins are installed before the statically
registered [feature modules](../src/modules/index.ts).

A route obtains request context and validates inputs, then calls its feature
service. Services coordinate adapters and repositories; repositories own SQL.
The [`Container`](../src/platform/container.ts) exposes database access, agent
repositories, the run bus, and lazy external adapters for git, GitHub, LLMs,
indexing, and related tooling. `ContainerOverrides` provides the test seam.
Feature modules access repo-intel through `container.repoIntel`, allowing the
facade to degrade gracefully when indexing is unavailable.

Secrets are resolved through `SecretsProvider` rather than stored in database
rows or configuration DTOs. Lazy provider resolution lets the API boot before
keys are configured. The API requires explicit migration commands; app startup
does not apply migrations.

## Review execution data flow

[`ReviewService`](../src/modules/reviews/service.ts) resolves agents, checks the
PR/repository, and creates an `agent_runs` row per target before returning run
IDs. Background [`ReviewRunExecutor`](../src/modules/reviews/run-executor.ts)
loads the diff once and processes the selected agents sequentially. A diff-load
failure affects every queued run; an individual agent failure is isolated so
later agents can still execute.

For each agent the executor resolves its LLM adapter, optionally gathers callers
and a repository map through repo-intel, and invokes
`reviewer-core.reviewPullRequest`. The core owns prompt construction, strategy,
reduction, and grounding. The server owns external reads, cancellation state,
persistence, and event delivery. Skills/memory/spec slots in the core do not
imply that this executor currently retrieves those inputs.

A successful outcome is persisted as a review plus grounded findings. The PR's
reviewed head is updated, and one trace captures prompt assembly, chunk metadata,
raw output, usage, cost, and logs. The trace is saved before the run is marked
`done`, ensuring polling clients cannot observe completion before cost exists.
Failures/cancellations attempt to persist terminal state and a buffered trace.

## Live versus durable state

The in-memory run bus replays buffered events to SSE subscribers, streams new
events, and closes when a run completes. Persisted run rows, reviews, findings,
and trace documents support reloads after the process or browser has restarted.
Startup reaps orphaned running rows before serving requests. This reaper assumes
one API process per database; it is not distributed worker coordination.

PR metadata combines different summaries: latest-review finding counts and
[successful-run cost aggregation](../src/modules/pulls/successful-run-cost.ts).
Cost totals include only known nonnegative costs from successful runs in the
workspace. A failed or unknown-cost later run cannot erase earlier spend.

See [review-flow contracts](../specs/review-flow.md), the
[repo-intel design](../src/modules/repo-intel/README.md), and
[testing lanes](../../TESTING.md).
