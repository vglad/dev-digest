import type { FindingRecord, PrMeta, Severity } from "@devdigest/shared";

/** A one-shot request, consumed after the card has been revealed and focused. */
export type FindingJump = { finding: FindingRecord; onReached: () => void };

export const SEVERITIES = ["CRITICAL", "WARNING", "SUGGESTION"] as const;
export type SeverityCounts = NonNullable<PrMeta["latest_review"]>["counts"];
export const COUNT_KEY = { CRITICAL: "critical", WARNING: "warning", SUGGESTION: "suggestion" } as const;

export function countSeverities(findings: FindingRecord[]): SeverityCounts {
  const counts = { critical: 0, warning: 0, suggestion: 0 };
  for (const finding of findings) counts[COUNT_KEY[finding.severity]]++;
  return counts;
}

export function parseSeverity(value: string | null): Severity | null {
  return SEVERITIES.find((severity) => severity === value) ?? null;
}
