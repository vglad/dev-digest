import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PrDetail } from "@devdigest/shared";
import messages from "../../messages/en/prReview.json";
import { PRRow } from "@/app/repos/[repoId]/pulls/_components/PRRow/PRRow";
import { COLUMN_KEYS, GRID } from "@/app/repos/[repoId]/pulls/constants";
import { PrDetailHeader } from "@/app/repos/[repoId]/pulls/[number]/_components/PrDetailHeader/PrDetailHeader";
import { usePulls, usePullDetail } from "@/lib/hooks/core";
import { usePrRuns, useRunReview, useDeleteRun } from "@/lib/hooks/reviews";
import { RunCost } from "./RunCost";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const pr: PrDetail = {
  id: "pr1",
  number: 1,
  title: "A pull request",
  author: "Ada",
  branch: "feature",
  base: "main",
  head_sha: "abc",
  additions: 1,
  deletions: 0,
  files_count: 1,
  status: "open",
  files: [],
  commits: [],
};

function wrap(children: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="en" messages={{ prReview: messages }}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
  return { ...view, qc };
}

describe("RunCost", () => {
  it.each([
    [0.014, "compact", "$0.014"],
    [0.0013, "timeline", "$0.0013"],
    [0.06, "trace", "$0.06"],
    [0, "compact", "$0.000"],
    [12.345, "compact", "$12.35"],
    [null, "compact", "—"],
    [undefined, "compact", "—"],
    [Number.NaN, "compact", "—"],
    [-1, "compact", "—"],
  ] as const)("renders %s with %s precision as %s", (cost, precision, expected) => {
    wrap(<RunCost cost={cost} precision={precision} />);
    const value = screen.getByLabelText(`Review cost in USD: ${expected}`);
    expect(value).toHaveTextContent(expected);
    expect(value).toHaveAttribute("title", "Cost of this review");
    expect(value).toHaveStyle({
      fontSize: "11.5px",
      fontWeight: "500",
      color: expected === "—" ? "var(--text-muted)" : "var(--text-secondary)",
    });
    expect(value.children).toHaveLength(0);
    expect(value).not.toHaveStyle({ background: "var(--bg-surface)" });
  });

  it("matches the dashboard column order, width, plain cost styling, missing-cost dash, and row hover", async () => {
    wrap(<PRRow pr={{ ...pr, total_run_cost_usd: null }} repoId="repo1" />);

    expect(COLUMN_KEYS).toEqual([
      "pullRequest",
      "author",
      "size",
      "score",
      "status",
      "cost",
      "updated",
    ]);
    expect(GRID).toBe("1fr 132px 92px 60px 118px 76px 78px");

    const cost = screen.getByLabelText("Review cost in USD: —");
    const costCell = cost.parentElement;
    const row = costCell?.parentElement;
    expect(row).not.toBeNull();
    expect(row).toHaveStyle({ gridTemplateColumns: GRID });
    expect(Array.from(row!.children).indexOf(costCell!)).toBe(5);
    expect(costCell).toHaveTextContent("—");
    expect(cost).toBeVisible();
    expect(cost).not.toHaveStyle({ background: "var(--bg-surface)" });

    fireEvent.mouseEnter(row!);
    expect(row).toHaveStyle({ background: "var(--bg-surface)" });
  });

  it("does not render review cost in the PR-detail header", () => {
    wrap(
      <PrDetailHeader
        pr={{ ...pr, total_run_cost_usd: 0.25 }}
        prId={null}
        tab="overview"
        findingsCount={0}
        onSetTab={() => {}}
        onRunStart={() => {}}
        onRunsStarted={() => {}}
      />,
    );
    expect(screen.queryByLabelText(/Review cost in USD/)).not.toBeInTheDocument();
  });

  it.each(["done", "failed"])(
    "refreshes the dashboard cost on start, %s, and deletion with Overview selected",
    async (terminal) => {
      let status: string | null = null;
      let cost: number | null = 0.25;
      let settledDetailFetched = false;
      vi.stubGlobal(
        "fetch",
        vi.fn(async (input: string, init?: RequestInit) => {
          const path = new URL(input).pathname;
          if (init?.method === "POST") {
            status = "running";
            cost = 0.25;
            return Response.json({ runs: [{ run_id: "new" }] });
          }
          if (init?.method === "DELETE") {
            status = null;
            cost = 0.25;
            return Response.json({ ok: true });
          }
          if (path.endsWith("/runs")) return Response.json(status ? [{ run_id: "new", status }] : []);
          if (path === "/repos/repo1/pulls") return Response.json([{ ...pr, total_run_cost_usd: cost }]);
          if (path === "/pulls/pr1") {
            if (status === terminal) settledDetailFetched = true;
            return Response.json({ ...pr, total_run_cost_usd: cost });
          }
          return Response.json([]);
        }),
      );

      function Surface() {
        const list = usePulls("repo1");
        const detail = usePullDetail("pr1");
        usePrRuns("pr1", "repo1");
        const start = useRunReview();
        const remove = useDeleteRun("pr1");
        return (
          <>
            {list.data?.map((row) => <PRRow key={row.id} pr={row} repoId="repo1" />)}
            {detail.data && (
              <PrDetailHeader
                pr={detail.data}
                prId={null}
                tab="overview"
                findingsCount={0}
                onSetTab={() => {}}
                onRunStart={() => {}}
                onRunsStarted={() => {}}
              />
            )}
            <button onClick={() => start.mutate({ prId: "pr1" })}>Start</button>
            <button onClick={() => remove.mutate("new")}>Delete</button>
          </>
        );
      }

      const { qc } = wrap(<Surface />);
      await waitFor(() => expect(screen.getByLabelText("Review cost in USD: $0.250")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: "Start" }));
      await waitFor(() => expect(screen.getByRole("button", { name: "Start" })).toBeEnabled());
      status = terminal;
      cost = terminal === "done" ? 0.2623 : 0.25;
      await waitFor(
        () => {
          if (terminal === "done") {
            expect(screen.getByLabelText("Review cost in USD: $0.262")).toBeInTheDocument();
          } else {
            expect(settledDetailFetched).toBe(true);
          }
        },
        { timeout: 6000 },
      );
      fireEvent.click(screen.getByRole("button", { name: "Delete" }));
      await waitFor(() => expect(screen.getByLabelText("Review cost in USD: $0.250")).toBeInTheDocument());
      qc.clear();
    },
    10000,
  );

  it("scopes lifecycle invalidation to the PR's repository", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json([])));
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(qc, "invalidateQueries");

    function RunHistory() {
      usePrRuns("pr1", "repo1");
      return null;
    }

    render(
      <QueryClientProvider client={qc}>
        <RunHistory />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ["pulls", "repo1"] });
    });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ["pulls"] });
    qc.clear();
  });
});
