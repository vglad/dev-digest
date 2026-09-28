"use client";

import { useTranslations } from "next-intl";
import { Icon, SEV } from "@devdigest/ui";
import { COUNT_KEY, SEVERITIES, type SeverityCounts } from "./helpers";

/** Read-only run totals: labeled pills in reviews, compact icons in Timeline. */
export function SeveritySummary({ counts, compact = false }: {
  counts: SeverityCounts;
  compact?: boolean;
}) {
  const t = useTranslations("prReview.severity");
  return (
    <div role="group" aria-label={t("summary")} className="flex flex-wrap items-center gap-2">
      {SEVERITIES.map((severity) => {
        const count = counts[COUNT_KEY[severity]];
        if (!count) return null;
        const meta = SEV[severity];
        const Glyph = Icon[meta.icon];
        return (
          <span key={severity} aria-label={t("count", { severity: t(severity), count })}
            className={`inline-flex items-center gap-1 text-xs font-semibold ${compact ? "" : "rounded-full px-2 py-1"}`}
            style={{ color: meta.c, background: compact ? undefined : meta.bg }}>
            <Glyph size={12} aria-hidden="true" />
            <span className="mono tnum">{count}</span>
            {!compact && <span>{t(severity).toUpperCase()}</span>}
          </span>
        );
      })}
    </div>
  );
}
