# Studio page contracts

## Routes and data

| Route | Contract |
|---|---|
| `/` | Fetch repositories; redirect to the first repository's pulls when present. Otherwise show the add-repository empty state. |
| `/onboarding` | Render the repository import form. Submitting it is a separate mutation, not part of simply visiting the page. |
| `/repos/:repoId/pulls` | Read that repository's PRs; expose list filters, sorting, findings summaries, and successful-run total cost. |
| `/repos/:repoId/pulls/:number` | Resolve the PR number through repository data, then use its persistent ID for detail, reviews, run history, and comments. |
| `/agents` and `/agents/:id` | List agents and open the selected agent's configuration editor. |
| `/settings/:section` | Render the selected settings surface, including API keys and feature models. |

Route composition is in [`src/app`](../src/app); data ownership is described in
[UI architecture](../docs/ui-architecture.md).

## Pull-request list findings

1. Nonzero severity icons describe `latest_review`, not all historical runs.
2. Hover or keyboard focus opens a preview headed **N FINDINGS IN THIS RUN**.
   N is the number of findings in that exact review.
3. Each preview includes severity, title, category, file/line range, confidence,
   and a short rationale. It contains no action buttons.
4. Loading, failure, and missing-review states are explicit. A missing review ID
   must not silently substitute a different review.
5. Activating a severity opens the matching review and filter on the detail page;
   the click does not also activate the PR row's default navigation.

## Agent runs detail tab (`tab=findings`)

- **Timeline** interleaves runs and commits newest first. Every run has a cost
  field: known costs use four decimal places, zero is `$0.0000`, and unknown or
  invalid cost is `—`, regardless of lifecycle status.
  Agent-name activation opens the corresponding review; trace activation opens
  that run's drawer.
- **Review runs** contains separate expandable cards, newest first, with the first
  open by default. The expanded card shows its verdict/score when available,
  then `N CRITICAL`, `N WARNING`, `N SUGGESTION` pills for nonzero totals.
- Timeline severity icons open the same preview
  as the PR list on hover or keyboard focus, initially showing all findings in
  that exact review. Timeline badge clicks keep the popup open and filter its
  rows; clicking the selected severity again restores all rows. Reopening starts
  unfiltered. Expanded review badges have no hover or focus popup; clicks filter
  that review's findings. Clicking the
  active badge again clears the severity filter. Active badges have a colored
  outline and pressed state. Badge clicks never open a trace.
- Clicking a popup row (or pressing Enter/Space on it) closes the popup, opens
  the matching review, clears severity/confidence filters that could hide it,
  and expands, focuses, and scrolls to that finding on the page. Repeated jumps
  to the same finding work; later filter changes do not replay a completed jump.
- Totals count that review's stored findings by `severity`, including accepted or
  dismissed findings. They stay as full-run totals while filters change.
- The badges are the only severity controls; there is no duplicate severity
  button row or “shown of total” counter. Zero-count badges are omitted.
  With no active badge, all severities are shown. **Hide low confidence** sits
  on the same row as the badges and independently controls confidence filtering.
- Filtering and counting use existing findings without an LLM call. No-match
  results show an empty state. Finding cards retain their Accept/Dismiss actions.
- `review` and `severity` query parameters restore selection on reload and
  Back/Forward. Invalid/stale selections fall back to unfiltered findings.

PR-list cost uses `total_run_cost_usd` and a muted `—` for unavailable totals, matching Findings.
This differs from each Timeline run's individual `cost_usd`.

## Regression evidence

[`SeverityBadges.test.tsx`](../src/components/severity-findings/SeverityBadges.test.tsx)
covers list preview, filtering, empty results, and keyboard isolation.
[`Selection.test.tsx`](../src/components/severity-findings/Selection.test.tsx)
covers URL selection, run popup filtering, and navigation to finding cards.
[`RunHistory.test.tsx`](../src/app/repos/[repoId]/pulls/[number]/_components/RunHistory/RunHistory.test.tsx)
covers lifecycle cost display; [`RunCost.test.tsx`](../src/components/RunCost.test.tsx)
covers formatting and lifecycle refresh.
