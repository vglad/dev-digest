"use client";

import type { FindingRecord, Severity } from "@devdigest/shared";
import { FindingsPreview } from "./FindingsPreview";
import { SeverityBadges } from "./SeverityBadges";
import { countSeverities } from "./helpers";

export function RunFindingsBadges({ findings, onSelectFinding, labeled = false, selected, onSelectSeverity }: {
  findings: FindingRecord[];
  onSelectFinding: (finding: FindingRecord) => void;
  labeled?: boolean;
  selected?: Severity | null;
  onSelectSeverity?: (severity: Severity | null) => void;
}) {
  return <SeverityBadges counts={countSeverities(findings)} labeled={labeled}
    selected={selected}
    onSelect={onSelectSeverity ? (severity) => onSelectSeverity(selected === severity ? null : severity) : undefined}
    preview={onSelectSeverity ? undefined : (severity, close) => <FindingsPreview findings={findings} severity={severity}
      onSelect={(finding) => { close(); onSelectFinding(finding); }} />} />;
}
