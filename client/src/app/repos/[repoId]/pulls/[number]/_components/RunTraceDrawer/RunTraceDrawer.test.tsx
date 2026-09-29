import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { RunTrace } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/runs.json"; // apps/web/messages/en/runs.json
import prReviewMessages from "../../../../../../../../messages/en/prReview.json";

// Mock the trace hooks so the drawer renders without a query client / SSE.
const TRACE: RunTrace = {
  config: { agent: "Security", version: "1", provider: "openai", model: "gpt-4.1", pr: 482, source: "local" },
  stats: { cost_usd: 0.06, duration_ms: 8200, tokens_in: 12000, tokens_out: 1500, findings: 2, grounding: "2/2 passed" },
  prompt_assembly: { system: "You are a reviewer.", skills: "### skill", memory: null, specs: null, user: "Review PR #482" },
  tool_calls: [{ tool: "review_file", args: "src/config.ts", meta: "single-pass", ms: 1200 }],
  raw_output: '{"verdict":"request_changes"}',
  memory_pulled: [{ pr: 471, text: "rate-limit public endpoints" }],
  specs_read: [],
  log: [
    { t: "00.10", kind: "info", msg: "Starting review with agent Security" },
    { t: "00.90", kind: "result", msg: "Citation grounding: 2/2 passed" },
  ],
};

vi.mock("../../../../../../../lib/hooks/trace", () => ({
  useRunTrace: () => ({ data: TRACE, isLoading: false }),
}));
vi.mock("../../../../../../../lib/hooks/reviews", () => ({
  useRunEvents: () => ({ events: [], running: false }),
}));

import RunTraceDrawer from "./RunTraceDrawer";

afterEach(() => {
  cleanup();
  TRACE.stats.cost_usd = 0.06;
});

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ runs: messages, prReview: prReviewMessages }}>
      <div data-theme="dark">{ui}</div>
    </NextIntlClientProvider>,
  );
}

describe("A5 Run Trace drawer (smoke)", () => {
  it("renders four default-open stats and preserves cost across collapse and reopen", async () => {
    renderWithIntl(<RunTraceDrawer runId="r1" agentName="Security" prNumber={482} onClose={() => {}} />);
    expect(screen.getByText("Configuration")).toBeInTheDocument();
    const stats = screen.getByRole("button", { name: /Stats/i });
    expect(stats).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("2/2 passed")).toBeInTheDocument();
    expect(screen.getByText("DURATION")).toBeInTheDocument();
    expect(screen.getByText("TOKENS")).toBeInTheDocument();
    expect(screen.getByText("COST")).toBeInTheDocument();
    expect(screen.getByText("FINDINGS")).toBeInTheDocument();
    expect(screen.getByLabelText("Review cost in USD: $0.06")).toBeInTheDocument();
    expect(screen.getByText("Tool calls")).toBeInTheDocument();

    fireEvent.click(stats);
    expect(stats).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("COST")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Review cost in USD: $0.06")).not.toBeInTheDocument();

    fireEvent.click(stats);
    expect(stats).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText("Review cost in USD: $0.06")).toBeInTheDocument();
  });

  it("shows a placeholder for historical traces without cost", () => {
    TRACE.stats.cost_usd = undefined;
    renderWithIntl(<RunTraceDrawer runId="r1" agentName="Security" prNumber={482} onClose={() => {}} />);
    expect(screen.getByLabelText("Review cost in USD: —")).toBeInTheDocument();
  });

  it("switches to the live log tab", () => {
    renderWithIntl(<RunTraceDrawer runId="r1" agentName="Security" prNumber={482} onClose={() => {}} />);
    fireEvent.click(screen.getByText("log"));
    // LiveLogStream renders its filter input
    expect(screen.getByPlaceholderText("Filter log…")).toBeInTheDocument();
  });
});
