/* FindingsPanel — hide-low-confidence + j/k navigation + FindingCard list,
   wiring the accept/dismiss action hook (A2). */
"use client";

import type { FindingJump } from "@/components/severity-findings/helpers";
import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState } from "@devdigest/ui";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import { KEY_TO_ACTION } from "./constants";
import { visibleFindings } from "./helpers";
import { SeverityBadges } from "@/components/severity-findings/SeverityBadges";
import { SeveritySummary } from "@/components/severity-findings/SeveritySummary";
import { countSeverities } from "@/components/severity-findings/helpers";
import { s } from "./styles";

export function FindingsPanel({
  findings,
  severity = null,
  onSelectSeverity,
  targetFinding,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  targetFinding?: FindingJump | null;
  severity?: Severity | null;
  onSelectSeverity?: (severity: Severity | null) => void;
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  // A popup jump must reveal even a low-confidence finding hidden by the toolbar.
  React.useEffect(() => {
    if (targetFinding) setHideLow(false);
  }, [targetFinding]);
  const root = React.useRef<HTMLDivElement>(null);
  const shown = visibleFindings(findings, hideLow).filter((finding) => !severity || finding.severity === severity);
  const shownKey = shown.map((finding) => finding.id).join(",");
  const [focus, setFocus] = React.useState({ key: shownKey, index: 0 });
  // Reset before committing a different result set, including A → B → A.
  if (focus.key !== shownKey) setFocus({ key: shownKey, index: 0 });
  const focusIdx = focus.key === shownKey ? focus.index : 0;
  const setFocusIdx = (update: (index: number) => number) => setFocus({ key: shownKey, index: update(focusIdx) });

  // j/k navigation + a/d shortcuts on the focused finding (keyboard).
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || !root.current?.contains(e.target as Node)) return;
      if (e.key === "j") setFocusIdx((i) => Math.min(i + 1, shown.length - 1));
      else if (e.key === "k") setFocusIdx((i) => Math.max(i - 1, 0));
      else if (KEY_TO_ACTION[e.key] && shown[focusIdx]) {
        action.mutate({ findingId: shown[focusIdx]!.id, action: KEY_TO_ACTION[e.key]!, prId });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shown, focusIdx, action, prId]);

  return (
    <div ref={root} onFocusCapture={(event) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>("[data-finding-id]");
      const index = shown.findIndex((finding) => finding.id === card?.dataset.findingId);
      if (index >= 0) setFocus({ key: shownKey, index });
    }}>
      <div style={s.toolbar}>
        {onSelectSeverity
          ? <SeverityBadges counts={countSeverities(findings)} selected={severity}
            onSelect={(level) => onSelectSeverity(severity === level ? null : level)} labeled />
          : <SeveritySummary counts={countSeverities(findings)} />}
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} />
        </div>
      </div>

      <div style={s.list}>
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              jumpRequest={targetFinding?.finding.id === f.id ? targetFinding : undefined}
              focused={i === focusIdx}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
