# Review API and persistence contracts

## Start and observe

1. `POST /pulls/:id/review` takes an explicit `agentId` or `all: true`.
   “All” selects enabled agents; an explicit agent must exist in the workspace.
   Omitting both returns `invalid_run_request` (400). The PR must exist.
2. The response contains `pr_id`, created run identities, and an initially empty
   `reviews` array. Slow model execution continues in the background.
3. `GET /pulls/:id/runs` returns persisted history across all lifecycle statuses;
   `/runs/active` returns the active subset. `GET /pulls/:id/reviews` returns
   persisted review records with their own findings.
4. `GET /runs/:id/events` replays buffered events and streams new ones. Completion
   closes the subscription. `GET /runs/:id/trace` returns the saved trace or 404
   when none exists. SSE is live process state, not a durable event store.

The route definitions are in [`reviews/routes.ts`](../src/modules/reviews/routes.ts).

## Lifecycle outcomes

| Condition | Required result |
|---|---|
| Successful engine outcome | Save grounded findings with the review, update reviewed head, save trace, then mark run `done` and complete its bus. |
| Diff loading fails | Mark all queued runs failed and attempt to preserve their buffered logs. |
| One agent fails | Persist its error and failure trace where possible; continue to later agents. |
| Cancellation requested | Signal the bus, mark a currently running row cancelled, and close the bus. Engine work checks cancellation before its next chunk call; an in-flight provider call is not synchronously aborted. |
| API restart | Reap orphaned running rows before accepting new review requests. |

`ReviewRunExecutor` delegates mandatory grounding and score calculation to the
core. It derives the run's blocker count from grounded severities and the agent's
`ciFailOn` policy, rather than trusting the model verdict for that count.
Repo-intel disabled by configuration, opted out per agent, unavailable, or empty
must allow review execution with less context.

## Costs and findings

- Individual run `cost_usd` is trace-backed and may be null. Unknown cost is not
  a known zero.
- PR `total_run_cost_usd` sums finite, nonnegative numeric costs for workspace
  runs whose status is `done`. No known successful cost means null; a known zero
  contributes zero. Running/failed/cancelled/unknown-cost runs add nothing and
  do not hide prior successful spend. Deleting a successful run removes its cost.
- Latest-review finding summaries and successful-run cost totals use different
  selection rules; the latest review does not define the cost total.
- Accept/dismiss endpoints mutate persisted finding state. These actions and
  read endpoints do not rerun the model.
- Deleting a review removes its findings; deleting an agent run removes its
  trace and associated review.

## Validation seams

[`reviews.it.test.ts`](../test/reviews.it.test.ts) exercises review lifecycle and
persisted output against test Postgres with mocked external adapters.
[`pulls-cost.it.test.ts`](../test/pulls-cost.it.test.ts) covers successful-run totals.
[`repo-intel-facade-degraded.test.ts`](../test/repo-intel-facade-degraded.test.ts)
covers degraded context behavior without Docker. Use the separate unit and
integration lanes in [TESTING.md](../../TESTING.md).
