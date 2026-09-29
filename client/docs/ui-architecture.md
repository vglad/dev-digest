# Studio UI architecture

## Rendering and application state

[`RootLayout`](../src/app/layout.tsx) is an async Server Component. It loads
locale/messages, sets metadata, and wraps the route in `NextIntlClientProvider`
and the client [`Providers`](../src/lib/providers.tsx) boundary. The provider
stack owns a stable QueryClient, theme, toast notifications, and the active
repository. Interactive pages use Client Components; database access and model
execution belong to the API, not to the Next.js render tree.

[`AppShell`](../src/components/app-shell/AppShell.tsx) supplies navigation,
breadcrumbs, and global shortcuts. Route files under `src/app` compose the page;
PR-specific behavior lives in their `_components` directories. Reusable visual
primitives come from `src/vendor/ui`, while API types come from the separately
vendored `src/vendor/shared` tree.

## Data path and lifecycle

Page → feature hook in `src/lib/hooks` → [`api.ts`](../src/lib/api.ts) → Fastify.
The fetch wrapper sets JSON content type only when sending a body and normalizes
network and HTTP failures into `ApiError`. The QueryClient shows mutation errors
as toasts; query network/5xx errors also toast, while expected 4xx errors remain
available for inline page states.

[`reviews.ts`](../src/lib/hooks/reviews.ts) keeps three separate views of a PR:
persisted reviews/findings, full run history, and active runs. History and active
runs poll while work is running. The PR detail page mounts history independently
of the selected tab, so observing changed run IDs/statuses invalidates detail,
reviews, active runs, and that repository's PR list. SSE supplies live log events;
persisted history supplies the state that survives a page reload.

## Three findings surfaces

The PR list receives a latest-review identity and severity counts. Its
[`PrFindingsBadges`](../src/components/severity-findings/PrFindingsBadges.tsx)
loads persisted reviews only while the preview is open, then selects the exact
review ID. The preview is read-only; severity activation navigates to a URL with
`tab=findings`, `review`, and `severity`.

The detail page's Agent runs tab separates Timeline from Review runs. Timeline
joins run metadata to reviews by `run_id`. Timeline icons use the same popup as
the PR list. Hover/focus previews all stored findings, and Timeline badge clicks
filter only the popup. Expanded review badges have no popup and toggle the
panel's URL-backed severity filter on click. Choosing a preview row
opens its review, clears page filters that could hide the finding, and focuses,
expands, and scrolls to the matching card. Jump requests are consumed once, so
later filtering or expanding an accordion does not repeat a jump.

Each review accordion owns its findings panel. Its badges control severity
selection; confidence and popup filters remain separate. Both derive visible
arrays from stored findings; neither starts review work.

URL state selects a review and severity, while confidence visibility and keyboard
selection are local to the panel. This lets Back/Forward restore severity
selection and keeps sibling accordions independent. Keyboard finding actions
are scoped to the panel containing focus.

See [page contracts](../specs/pages.md) for observable behavior and
[testing lanes](../../TESTING.md) for component versus browser validation.
