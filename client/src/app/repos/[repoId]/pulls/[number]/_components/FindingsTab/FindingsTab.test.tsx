import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider, type UseMutationResult } from "@tanstack/react-query";
import type { ReviewRecord, RunSummary } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/prReview.json";
import { FindingsTab } from "./FindingsTab";

afterEach(cleanup);

const review: ReviewRecord = {
  id: "review-1",
  pr_id: "pr-1",
  agent_id: "agent-1",
  run_id: "run-matched",
  agent_name: "Security Reviewer",
  kind: "review",
  verdict: null,
  summary: null,
  score: 82,
  model: "gpt-4.1",
  grounding: "0/0 passed",
  created_at: "2026-06-13T20:52:51.000Z",
  findings: [],
};

function run(runId: string, costUsd: number): RunSummary {
  return {
    run_id: runId,
    agent_id: "agent-1",
    agent_name: "Security Reviewer",
    provider: "openai",
    model: "gpt-4.1",
    status: "done",
    error: null,
    duration_ms: 1000,
    tokens_in: 100,
    tokens_out: 50,
    cost_usd: costUsd,
    findings_count: 0,
    grounding: "0/0 passed",
    ran_at: "2026-06-13T20:52:51.000Z",
    score: 82,
    blockers: 0,
  };
}

describe("FindingsTab review run cost", () => {
  it("matches cost by run_id and keeps it visible through mouse and keyboard expansion", async () => {
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    render(
      <QueryClientProvider client={client}>
        <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
          <FindingsTab
            prId="pr-1"
            liveRunIds={[]}
            reviewRunning={false}
            lethalTrifecta={[]}
            runs={[review]}
            prRuns={[run("run-other", 0.999), run("run-matched", 0.014)]}
            prCommits={[]}
            cancelMutation={{ isPending: false } as UseMutationResult<unknown, unknown, string, unknown>}
            onOpenTrace={() => {}}
            onDelete={() => {}}
            onRunDone={() => {}}
          />
        </NextIntlClientProvider>
      </QueryClientProvider>,
    );

    const header = screen.getByRole("button", { name: /Security Reviewer/i, expanded: true });
    const cost = within(header).getByLabelText("Review cost in USD: $0.014");
    expect(within(header).queryByLabelText("Review cost in USD: $0.999")).not.toBeInTheDocument();
    expect(cost).toBeVisible();
    expect(header).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(cost).toBeVisible();

    header.focus();
    fireEvent.keyDown(header, { key: "Enter" });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(cost).toBeVisible();

    fireEvent.keyDown(header, { key: " " });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(cost).toBeVisible();
    client.clear();
  });
});
