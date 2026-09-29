# Browser flow contracts

## Flow format and execution

Each `NN-name.flow.json` has a human-readable `name`, optional `description`, and
ordered `steps`. Each step supplies a `cmd: string[]`, optional log `label`, and
optional `assert.stdoutIncludes`. The runner performs JSON parsing and assumes
this shape; it does not provide runtime schema validation.

- `{BASE}` is replaced in every argument with the base URL stripped of trailing
  slashes. The default URL is `http://localhost:3000`.
- Filename order defines execution order. Steps and flows share one session.
- A nonzero command exit or timeout fails the step and ends that flow. A missing
  stdout substring does the same; matching is case-sensitive.
- Failure in one flow does not skip later flows. All flows must pass for exit 0.
  No discovered flows is a failure. Browser cleanup is attempted after the loop.
- Command exceptions attempt `<flow-id>-fail.png` in `test-results/`. Screenshot
  failure must not replace the original failure. Substring assertion failures
  currently do not capture a screenshot.
- Deterministic URL/text/role/label operations and seeded data keep these journeys
  free of model calls. Submitting an import or starting a review is outside the
  current read-only suite.

Implementation: [`run.ts`](../run.ts), [`lib/assert.ts`](../lib/assert.ts).
Environment variables and local/hermetic invocation are in [README](../README.md).

## Existing acceptance journeys

| Executable flow | Preconditions and observable result |
|---|---|
| [01 app boot](./01-app-boot.flow.json) | At least one repository exists; `/` redirects to `/pulls` and displays Pull Requests. |
| [02 PR navigation](./02-repo-pulls-detail.flow.json) | Seeded demo repo is first; clicking its PR title reaches `/pulls/482` and displays that title. |
| [03 agents](./03-agents.flow.json) | Seeded Security Reviewer is visible on `/agents`. |
| [04 findings](./04-pr-findings.flow.json) | PR #482 → Agent runs sets `tab=findings`; the seeded request-changes verdict, two-finding count, and hardcoded-key finding are visible. The newest accordion is already open. |
| [05 diff](./05-pr-diff.flow.json) | PR #482 → Files changed sets `tab=diff` and displays `src/config.ts`. |
| [06 onboarding](./06-onboarding.flow.json) | `/onboarding` renders Add a repository and Repository URL, without submitting the form. |
| [07 settings](./07-settings.flow.json) | API Keys and Feature Models sections render on their respective settings routes. |

These checks establish representative rendering and navigation, not exhaustive
coverage of each control. Cost formatting, severity filters, and popover actions
have focused [client component tests](../../client/specs/pages.md); the current
JSON journeys do not independently assert every lab criterion.

## Isolation requirement

Seed-dependent journeys run against a freshly seeded disposable stack. The
hermetic wrapper's default ports are Postgres 5433, API 3101, and web 3100.
Overrides must remain isolated from the developer stack. Do not delete a
persistent developer database to satisfy a seed precondition.
