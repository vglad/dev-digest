import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import messages from "../../../messages/en/prReview.json";
import { SeverityBadges } from "./SeverityBadges";
import { FindingsPreview } from "./FindingsPreview";
import { PRRow } from "@/app/repos/[repoId]/pulls/_components/PRRow/PRRow";
import { FindingsPanel } from "@/app/repos/[repoId]/pulls/[number]/_components/FindingsPanel/FindingsPanel";
import { findings, pr, review } from "./test-fixtures";
import type { Severity } from "@devdigest/shared";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });
function wrap(children: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={qc}><NextIntlClientProvider locale="en" messages={{ prReview: messages }}>{children}</NextIntlClientProvider></QueryClientProvider>);
}

describe("severity findings", () => {
  it("shows ordered nonzero badges, previews all findings, retains pointer/focus in the portal and dismisses with Escape", async () => {
    const select = vi.fn();
    wrap(<SeverityBadges counts={{ critical: 1, warning: 1, suggestion: 0 }} onSelect={select} preview={<FindingsPreview findings={findings} />} />);
    expect(screen.getAllByRole("button").map((button) => button.getAttribute("aria-label"))).toEqual(["Critical: 1 findings", "Warning: 1 findings"]);
    const group = screen.getByRole("group");
    fireEvent.pointerEnter(group);
    const preview = screen.getByRole("region", { name: "Findings preview" });
    expect(group.contains(preview)).toBe(false);
    expect(within(preview).getAllByRole("article").map((article) => article.textContent)).toEqual([
      expect.stringContaining("Finding critical"), expect.stringContaining("Finding warning"), expect.stringContaining("Finding suggestion"),
    ]);
    expect(within(preview).getByText("20% confidence")).toBeVisible();
    expect(within(preview).getAllByText("src/config.ts:11–13")).toHaveLength(3);
    expect(within(preview).queryByRole("button")).not.toBeInTheDocument();
    fireEvent.pointerLeave(group);
    fireEvent.pointerEnter(preview);
    act(() => preview.focus());
    fireEvent.pointerLeave(preview);
    expect(preview).toHaveFocus();
    fireEvent.keyDown(preview, { key: "Escape" });
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Critical: 1 findings" })).toHaveFocus();
    fireEvent.blur(screen.getByRole("button", { name: "Critical: 1 findings" }));
    fireEvent.focus(screen.getByRole("button", { name: "Warning: 1 findings" }));
    expect(screen.getByRole("region")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Warning: 1 findings" }));
    expect(select).toHaveBeenCalledWith("WARNING");
    await waitFor(() => expect(screen.queryByRole("region")).not.toBeInTheDocument());
  });

  it("closes after focus leaves a reopened preview following Escape", async () => {
    wrap(<><button>Outside</button><SeverityBadges counts={{ critical: 1, warning: 0, suggestion: 0 }} onSelect={vi.fn()} preview={<FindingsPreview findings={findings} />} /></>);
    const badge = screen.getByRole("button", { name: "Critical: 1 findings" });
    fireEvent.pointerEnter(screen.getByRole("group"));
    fireEvent.pointerLeave(screen.getByRole("group"));
    fireEvent.pointerEnter(screen.getByRole("region"));
    act(() => screen.getByRole("region").focus());
    fireEvent.keyDown(document, { key: "Escape" });
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    act(() => badge.focus());
    expect(screen.getByRole("region")).toBeVisible();
    act(() => screen.getByRole("button", { name: "Outside" }).focus());
    await waitFor(() => expect(screen.queryByRole("region")).not.toBeInTheDocument());
  });

  it("uses an em dash for an empty review", () => {
    wrap(<SeverityBadges counts={{ critical: 0, warning: 0, suggestion: 0 }} onSelect={vi.fn()} />);
    expect(screen.getByLabelText("No findings")).toHaveTextContent("—");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("loads list previews on demand, matches exact review identity, and isolates badge clicks from row navigation", async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((done) => { resolve = done; }));
    vi.stubGlobal("fetch", fetch);
    wrap(<PRRow pr={pr} repoId="repo-1" />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.pointerEnter(screen.getByRole("group"));
    expect(screen.getByText("Loading findings…")).toBeVisible();
    await act(async () => resolve(new Response(JSON.stringify([{ ...review, id: "wrong-review", findings: [] }, review]))));
    expect(await screen.findByText("Finding critical")).toBeVisible();
    const preview = within(screen.getByRole("region", { name: "Findings preview" }));
    expect(preview.getByText("3 findings in this run")).toBeVisible();
    expect(preview.getAllByRole("article")).toHaveLength(3);
    expect(preview.queryByRole("button")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Critical: 1 findings" }));
    expect(push).toHaveBeenCalledTimes(1);
    expect(push).toHaveBeenCalledWith("/repos/repo-1/pulls/1?tab=findings&review=review-1&severity=CRITICAL");
    fireEvent.click(screen.getByText("A pull request"));
    expect(push).toHaveBeenLastCalledWith("/repos/repo-1/pulls/1");
  });

  it.each(["error", "missing"])("shows %s feedback without replacing the selected review", async (mode) => {
    vi.stubGlobal("fetch", vi.fn(async () => mode === "error" ? new Response("{}", { status: 500 }) : new Response(JSON.stringify([{ ...review, id: "other" }]))));
    wrap(<PRRow pr={pr} repoId="repo-1" />);
    fireEvent.focus(screen.getByRole("button", { name: "Critical: 1 findings" }));
    expect(await screen.findByText(mode === "error" ? "Could not load findings." : "This review is no longer available.")).toBeVisible();
    expect(screen.queryByText("Finding critical")).not.toBeInTheDocument();
  });

  it("composes severity and confidence filters, toggles the active filter and keeps accepted/dismissed findings", () => {
    function Panel() {
      const [severity, setSeverity] = React.useState<Severity | null>(null);
      return <FindingsPanel findings={findings} prId="pr-1" severity={severity} onSelectSeverity={(next) => setSeverity((old) => old === next ? null : next)} />;
    }
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    wrap(<Panel />);
    expect(within(screen.getByRole("group", { name: "Findings by severity" })).getAllByRole("button").map((button) => button.textContent)).toEqual(["1CRITICAL", "1WARNING", "1SUGGESTION"]);
    expect(screen.queryAllByRole("article")).toHaveLength(3);
    fireEvent.click(screen.getByRole("button", { name: "Critical: 1 findings" }));
    expect(screen.getByRole("button", { name: "Critical: 1 findings" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Finding critical")).toBeVisible();
    expect(screen.queryByText("Finding warning")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Warning: 1 findings" }));
    expect(screen.getByText("Finding warning")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Warning: 1 findings" }));
    expect(screen.queryAllByRole("article")).toHaveLength(3);
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Suggestion: 1 findings" }));
    expect(screen.getByText("No findings match")).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Suggestion: 1 findings" }));
    expect(screen.queryAllByRole("article")).toHaveLength(2);
    fireEvent.click(screen.getByRole("switch"));
    expect(screen.getByText("Finding suggestion")).toBeVisible();
    expect(screen.queryAllByRole("article")).toHaveLength(3);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("omits zero-count badges and replaces a URL-selected empty severity through the remaining badge", () => {
    function Panel() {
      const [severity, setSeverity] = React.useState<Severity | null>("CRITICAL");
      return <FindingsPanel findings={findings.filter((finding) => finding.severity === "WARNING")} prId="pr-1" severity={severity} onSelectSeverity={setSeverity} />;
    }
    wrap(<Panel />);
    const badges = within(screen.getByRole("group", { name: "Findings by severity" }));
    expect(badges.getAllByRole("button")).toHaveLength(1);
    expect(badges.getByRole("button", { name: "Warning: 1 findings" })).toBeEnabled();
    expect(screen.getByText("No findings match")).toBeVisible();
    fireEvent.click(badges.getByRole("button", { name: "Warning: 1 findings" }));
    expect(screen.getByText("Finding warning")).toBeVisible();
  });

  it("resets keyboard selection when results change and acts only in the focused review panel", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ finding: findings[0] })));
    vi.stubGlobal("fetch", fetch);
    function Panels() {
      const [severity, setSeverity] = React.useState<Severity | null>(null);
      return <>
        <section aria-label="Selected review"><FindingsPanel findings={findings} prId="pr-1" severity={severity} onSelectSeverity={setSeverity} /></section>
        <FindingsPanel findings={findings} prId="pr-1" />
      </>;
    }
    wrap(<Panels />);
    const panel = within(screen.getByRole("region", { name: "Selected review" }));
    const suggestion = panel.getByRole("button", { name: "Suggestion: 1 findings" });
    act(() => suggestion.focus());
    fireEvent.keyDown(suggestion, { key: "j" });
    fireEvent.keyDown(suggestion, { key: "a" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(fetch.mock.calls[0]?.[0]).toContain("/findings/warning/accept");
    fireEvent.click(panel.getByRole("button", { name: "Suggestion: 1 findings" }));
    fireEvent.click(suggestion);
    fireEvent.keyDown(suggestion, { key: "a" });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(fetch.mock.calls[1]?.[0]).toContain("/findings/critical/accept");
  });

});
