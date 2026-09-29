import type { FindingRecord, ReviewRecord, PrDetail, RunSummary } from "@devdigest/shared";

export function finding(id: string, severity: FindingRecord["severity"], overrides: Partial<FindingRecord> = {}): FindingRecord {
  return { id, severity, category: "security", title: `Finding ${id}`, file: "src/config.ts", start_line: 11, end_line: 13,
    rationale: `Reason for ${id}`, confidence: 0.95, review_id: "review-1", accepted_at: null, dismissed_at: null, ...overrides };
}
export const findings = [
  finding("suggestion", "SUGGESTION", { confidence: 0.2 }),
  finding("warning", "WARNING", { accepted_at: "2026-01-02" }),
  finding("critical", "CRITICAL", { dismissed_at: "2026-01-02" }),
];
export const review: ReviewRecord = { id: "review-1", pr_id: "pr-1", agent_id: "agent-1", run_id: "run-1", agent_name: "First agent", kind: "review",
  verdict: null, summary: null, score: 42, model: "model", created_at: "2026-01-02", findings };
export const pr: PrDetail = { id: "pr-1", number: 1, title: "A pull request", author: "Ada", branch: "feat", base: "main", head_sha: "abc", additions: 10,
  deletions: 0, files_count: 1, status: "reviewed", score: 42, latest_review: { id: "review-1", run_id: "run-1", counts: { critical: 1, warning: 1, suggestion: 1 } }, files: [], commits: [] };
export const run: RunSummary = { run_id: "run-1", agent_id: "agent-1", agent_name: "First agent", provider: "openai", model: "model", status: "done", error: null,
  duration_ms: 100, tokens_in: 100, tokens_out: 20, cost_usd: 0.1, findings_count: 3, grounding: null, ran_at: "2026-01-02", score: 42, blockers: 0 };
