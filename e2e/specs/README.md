# E2E flow specifications

The `*.flow.json` files in this directory are executable acceptance journeys run in filename order by `run.ts` in one shared browser session. Use deterministic URL, text, role, or label locators; keep flows read-only against seeded data, and never use the AI `chat` command.

Current coverage includes app boot, pull-request navigation, agents, findings, diff rendering, onboarding, and settings. See the [package guide](../README.md#coverage-typological-not-exhaustive) for the catalog, flow schema, prerequisites, and run commands.
