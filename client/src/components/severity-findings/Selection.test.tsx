import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../../messages/en/prReview.json";
import PRDetailPage from "@/app/repos/[repoId]/pulls/[number]/page";
import { finding, pr, review, run } from "./test-fixtures";
import type { ReviewRecord } from "@devdigest/shared";

vi.mock("next/navigation", async () => {
  const React = await import("react");
  const navigate = (url: string, replace = false) => {
    window.history[replace ? "replaceState" : "pushState"]({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  };
  return {
    useParams: () => ({ repoId: "repo-1", number: "1" }),
    useSearchParams: () => new URLSearchParams(React.useSyncExternalStore(
      (callback) => { window.addEventListener("popstate", callback); return () => window.removeEventListener("popstate", callback); },
      () => window.location.search,
    )),
    useRouter: () => ({ push: (url: string) => navigate(url), replace: (url: string) => navigate(url, true) }),
  };
});
vi.mock("@/components/app-shell", () => ({ AppShell: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/lib/repo-context", () => ({ useActiveRepo: () => ({ activeRepo: { full_name: "test/repo" } }), useRepoNotFound: () => false }));

const historical: ReviewRecord = { ...review, id: "historical", run_id: null, agent_name: "Historical agent", findings: [
  finding("old-critical", "CRITICAL", { review_id: "historical" }), finding("old-warning", "WARNING", { review_id: "historical" }),
] };
let records: ReviewRecord[];
let listReads: number;
beforeEach(() => {
  records = [review, historical]; listReads = 0;
  vi.stubGlobal("fetch", vi.fn(async (input: string, init?: RequestInit) => {
    const path = new URL(input).pathname;
    let data: unknown = [];
    if (path === "/repos/repo-1/pulls") { listReads++; data = [pr]; }
    else if (path === "/pulls/pr-1") data = pr;
    else if (path === "/pulls/pr-1/reviews") data = records;
    else if (path === "/pulls/pr-1/runs") data = [run];
    else if (path === "/reviews/historical" && init?.method === "DELETE") { records = [review]; data = { ok: true }; }
    return new Response(JSON.stringify(data));
  }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
function mount(query: string) {
  window.history.replaceState({}, "", `/repos/repo-1/pulls/1?tab=findings${query}`);
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><NextIntlClientProvider locale="en" messages={{ prReview: messages }}><PRDetailPage /></NextIntlClientProvider></QueryClientProvider>);
}
async function historicalPanel() {
  const header = await screen.findByRole("button", { name: /Historical agent/, expanded: true });
  return within(header.parentElement!);
}

describe("finding URL selection", () => {
  it("toggles each expanded review badge and keeps totals and sibling findings intact without duplicate controls", async () => {
    mount("");
    const header = await screen.findByRole("button", { name: /Historical agent/, expanded: false });
    fireEvent.click(header);
    const sibling = await historicalPanel();
    const panel = within((await screen.findByRole("button", { name: /First agent/, expanded: true })).parentElement!);
    expect(panel.queryByRole("status")).not.toBeInTheDocument();
    expect(panel.queryByRole("button", { name: "Show all" })).not.toBeInTheDocument();
    expect(panel.queryByText(/\d+ of \d+ findings/)).not.toBeInTheDocument();
    for (const level of ["Warning", "Suggestion", "Critical"]) {
      const badge = panel.getByRole("button", { name: `${level}: 1 findings` });
      fireEvent.pointerEnter(badge);
      act(() => badge.focus());
      expect(screen.queryByRole("region", { name: "Findings preview" })).not.toBeInTheDocument();
      fireEvent.click(badge);
      expect(panel.getAllByRole("article")).toHaveLength(1);
      expect(panel.getByRole("article", { name: `Finding ${level.toLowerCase()}` })).toBeVisible();
      expect(badge).toHaveAttribute("aria-pressed", "true");
      expect(panel.queryByRole("button", { name: level })).not.toBeInTheDocument();
      expect(window.location.search).toContain(`severity=${level.toUpperCase()}`);
      expect(sibling.getAllByRole("article")).toHaveLength(2);
      expect(screen.queryByRole("region", { name: "Findings preview" })).not.toBeInTheDocument();
      fireEvent.click(badge);
      expect(badge).toHaveAttribute("aria-pressed", "false");
      expect(panel.getAllByRole("article")).toHaveLength(3);
    }
    fireEvent.click(panel.getByRole("button", { name: "Warning: 1 findings" }));
    expect(panel.getByRole("button", { name: "Warning: 1 findings" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(panel.getByRole("button", { name: "Suggestion: 1 findings" }));
    expect(panel.getByRole("button", { name: "Warning: 1 findings" })).toHaveAttribute("aria-pressed", "false");
    expect(panel.getByRole("button", { name: "Suggestion: 1 findings" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(panel.getByRole("button", { name: "Suggestion: 1 findings" }));
    expect(panel.getByRole("button", { name: "Suggestion: 1 findings" })).toHaveAttribute("aria-pressed", "false");
    expect(panel.getAllByRole("article")).toHaveLength(3);
  });

  it("restores historical review selection on reload, composes filters, navigates Back/Forward and leaves siblings unfiltered", async () => {
    mount("&review=historical&severity=WARNING");
    const panel = await historicalPanel();
    const totals = within(panel.getByRole("group", { name: "Findings by severity" }));
    expect(totals.getByLabelText("Critical: 1 findings")).toHaveTextContent("1CRITICAL");
    expect(totals.getByLabelText("Warning: 1 findings")).toHaveTextContent("1WARNING");
    expect(totals.queryByText("SUGGESTION")).not.toBeInTheDocument();
    expect(totals.getAllByRole("button")).toHaveLength(2);
    expect(panel.getByText("Finding old-warning")).toBeVisible();
    expect(panel.queryByText("Finding old-critical")).not.toBeInTheDocument();
    expect(screen.getByText("Finding critical")).toBeVisible();
    expect(screen.getByText("Finding suggestion")).toBeVisible();
    fireEvent.click(panel.getByRole("button", { name: "Critical: 1 findings" }));
    await waitFor(() => expect(window.location.search).toContain("severity=CRITICAL"));
    expect(panel.getByText("Finding old-critical")).toBeVisible();
    expect(panel.queryByText("Finding old-warning")).not.toBeInTheDocument();
    act(() => window.history.back());
    await waitFor(() => expect(window.location.search).toContain("severity=WARNING"));
    expect(panel.getByText("Finding old-warning")).toBeVisible();
    act(() => window.history.forward());
    await waitFor(() => expect(window.location.search).toContain("severity=CRITICAL"));
    fireEvent.click(panel.getByRole("button", { name: "Critical: 1 findings" }));
    expect(window.location.search).not.toContain("severity=");
    expect(panel.getByText("Finding old-warning")).toBeVisible();
    fireEvent.click(panel.getByRole("button", { name: "Warning: 1 findings" }));
    cleanup();
    mount(window.location.search.replace("?tab=findings", ""));
    expect((await historicalPanel()).queryByText("Finding old-critical")).not.toBeInTheDocument();
  });

  it("previews all run findings, filters inside the popup, and jumps to the selected issue in a collapsed review", async () => {
    mount("");
    const first = await screen.findByRole("button", { name: /First agent/, expanded: true });
    fireEvent.click(first);
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    const warning = screen.getByLabelText("Warning: 1 findings");
    fireEvent.focus(warning);
    const preview = within(screen.getByRole("region", { name: "Findings preview" }));
    expect(preview.getByText("3 findings in this run")).toBeVisible();
    expect(preview.getByText("Finding critical")).toBeVisible();
    expect(preview.getByText("Finding suggestion")).toBeVisible();
    fireEvent.click(warning);
    expect(preview.getByText("Finding warning")).toBeVisible();
    expect(preview.queryByText("Finding critical")).not.toBeInTheDocument();
    expect(preview.queryByText("Finding suggestion")).not.toBeInTheDocument();
    expect(first).toHaveAttribute("aria-expanded", "false");
    expect(window.location.search).not.toContain("severity=");
    fireEvent.click(preview.getByRole("button", { name: /Finding warning/ }));
    await waitFor(() => expect(first).toHaveAttribute("aria-expanded", "true"));
    expect(screen.queryByRole("region", { name: "Findings preview" })).not.toBeInTheDocument();
    const card = screen.getByRole("article", { name: "Finding warning" });
    expect(card).toHaveFocus();
    expect(within(card).getByText("Reason for warning")).toBeVisible();
    expect(scroll.mock.contexts.at(-1)).toBe(card);
    expect(window.location.search).not.toContain("trace=");
    expect(screen.getByText("Finding critical")).toBeVisible();
    const panel = within(first.parentElement!);
    fireEvent.click(panel.getByRole("button", { name: "Critical: 1 findings" }));
    fireEvent.click(panel.getByRole("button", { name: "Critical: 1 findings" }));
    expect(scroll.mock.contexts.filter((element) => element instanceof HTMLElement && element.dataset.findingId === "warning")).toHaveLength(1);
    fireEvent.click(first);
    fireEvent.click(screen.getByRole("button", { name: "First agent" }));
    await waitFor(() => expect(first).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByText("Finding warning")).toBeVisible();
    expect(window.location.search).toContain("review=review-1");
  });

  it("jumps from Timeline badges to hidden findings, supports keyboard selection, and reopens an unfiltered preview", async () => {
    mount("&review=review-1&severity=CRITICAL");
    const header = await screen.findByRole("button", { name: /First agent/, expanded: true });
    const panel = within(header.parentElement!);
    fireEvent.click(panel.getByRole("switch"));
    const suggestion = screen.getAllByRole("button", { name: "Suggestion: 1 findings" })
      .find((badge) => !header.parentElement!.contains(badge))!;
    const timelineBadges = suggestion.parentElement!;
    fireEvent.focus(suggestion);
    let popup = screen.getByRole("region", { name: "Findings preview" });
    expect(within(popup).getByText("Finding critical")).toBeVisible();
    expect(window.location.search).toContain("severity=CRITICAL");
    const row = within(popup).getByRole("button", { name: "Finding suggestion" });
    act(() => row.focus());
    fireEvent.keyDown(row, { key: "Enter" });
    const card = await screen.findByRole("article", { name: "Finding suggestion" });
    await waitFor(() => expect(card).toHaveFocus());
    expect(within(card).getByText("Reason for suggestion")).toBeVisible();
    expect(panel.getAllByRole("article")).toHaveLength(3);
    expect(window.location.search).not.toContain("severity=");
    expect(screen.queryByRole("region", { name: "Findings preview" })).not.toBeInTheDocument();

    fireEvent.pointerEnter(timelineBadges);
    popup = screen.getByRole("region", { name: "Findings preview" });
    expect(within(popup).getAllByRole("button")).toHaveLength(3);
    fireEvent.keyDown(popup, { key: "Escape" });
    expect(screen.queryByRole("region", { name: "Findings preview" })).not.toBeInTheDocument();

    // The same finding remains a valid destination on subsequent selections.
    fireEvent.pointerEnter(timelineBadges);
    fireEvent.click(within(screen.getByRole("region", { name: "Findings preview" })).getByRole("button", { name: "Finding suggestion" }));
    await waitFor(() => expect(card).toHaveFocus());
  });

  it.each(["&review=missing&severity=CRITICAL", "&review=review-1&severity=INVALID"])("ignores stale/invalid selection %s", async (query) => {
    mount(query);
    expect(await screen.findByText("Finding critical")).toBeVisible();
    expect(screen.getByText("Finding warning")).toBeVisible();
    expect(screen.getByText("Finding suggestion")).toBeVisible();
  });

  it("falls back to unfiltered findings after deletion and refreshes list metadata", async () => {
    mount("&review=historical&severity=WARNING");
    const panel = await historicalPanel();
    const before = listReads;
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(panel.getByRole("button", { name: "Delete this review run" }));
    await waitFor(() => expect(screen.queryByText("Historical agent")).not.toBeInTheDocument());
    expect(screen.getByText("Finding critical")).toBeVisible();
    expect(screen.getByText("Finding suggestion")).toBeVisible();
    await waitFor(() => expect(listReads).toBeGreaterThan(before));
  });
});
