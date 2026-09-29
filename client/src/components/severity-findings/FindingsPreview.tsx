"use client";

import { useTranslations } from "next-intl";
import { Icon, SeverityBadge, CAT } from "@devdigest/ui";
import type { FindingRecord, Severity } from "@devdigest/shared";
import { SEVERITIES } from "./helpers";

export function FindingsPreview({ findings, severity = null, onSelect }: {
  findings: FindingRecord[];
  severity?: Severity | null;
  onSelect?: (finding: FindingRecord) => void;
}) {
  const t = useTranslations("prReview.severity");
  const sorted = findings.filter((finding) => !severity || finding.severity === severity).sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));
  return <div style={{ padding: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 9, color: "var(--text-muted)", fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
      <Icon.AlertOctagon size={12} aria-hidden="true" />{t("total", { count: findings.length })}
    </div>
    <div tabIndex={0} aria-label={t("total", { count: findings.length })} style={{ display: "flex", flexDirection: "column", gap: 9, maxHeight: 300, overflowY: "auto", overscrollBehavior: "contain" }}>
      {sorted.map((finding, index) => {
        const CategoryIcon = Icon[CAT[finding.category].icon];
        const confidenceColor = finding.confidence >= 0.85 ? "var(--ok)" : finding.confidence >= 0.65 ? "var(--warn)" : "var(--text-muted)";
        return <article key={finding.id}
          role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined}
          aria-label={onSelect ? finding.title : undefined}
          onClick={onSelect ? () => onSelect(finding) : undefined}
          onKeyDown={onSelect ? (event) => {
            if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(finding); }
          } : undefined}
          style={{ cursor: onSelect ? "pointer" : undefined, outlineOffset: 2, paddingBottom: index < sorted.length - 1 ? 9 : 0, borderBottom: index < sorted.length - 1 ? "1px solid var(--border)" : undefined, overflowWrap: "anywhere" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span role="img" aria-label={t(finding.severity)} title={t(finding.severity)}><SeverityBadge severity={finding.severity} compact /></span>
            <span style={{ fontSize: 12.5, fontWeight: 600 }}>{finding.title}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--text-muted)" }}>
              <CategoryIcon size={12} aria-hidden="true" />{t(`category.${finding.category}`)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 5, flexWrap: "wrap" }}>
            <span className="mono" style={{ color: "var(--accent-text)", fontSize: 11 }}>
              {finding.file}:{finding.start_line}{finding.end_line !== finding.start_line ? `–${finding.end_line}` : ""}
            </span>
            <span className="mono tnum" style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--text-muted)", fontSize: 11 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: confidenceColor }} />
              {t("confidence", { percent: Math.round(finding.confidence * 100) })}
            </span>
          </div>
          <p style={{ margin: "5px 0 0", fontSize: 11.5, lineHeight: 1.45, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{finding.rationale.replace(/\*\*|`/g, "")}</p>
        </article>;
      })}
    </div>
  </div>;
}
