"use client";

import { useTranslations } from "next-intl";

export type RunCostPrecision = "compact" | "timeline" | "trace";

export function formatRunCost(
  cost: unknown,
  precision: RunCostPrecision = "compact",
): string {
  if (typeof cost !== "number" || !Number.isFinite(cost) || cost < 0) return "—";

  const fractionDigits = precision === "timeline" ? 4 : precision === "trace" ? 2 : cost < 1 ? 3 : 2;
  return `$${cost.toFixed(fractionDigits)}`;
}

export function RunCost({
  cost,
  precision = "compact",
  variant = "inline",
  empty = "—",
}: {
  cost?: unknown;
  precision?: RunCostPrecision;
  variant?: "inline" | "stat";
  empty?: string;
}) {
  const t = useTranslations("prReview");
  const amount = formatRunCost(cost, precision);
  const missing = amount === "—";

  return (
    <span
      className="mono tnum"
      aria-label={`${t("cost.description")}: ${amount}`}
      title={t("cost.title")}
      style={{
        fontSize: variant === "inline" ? 11.5 : "inherit",
        fontWeight: variant === "inline" ? 500 : "inherit",
        color:
          missing ? "var(--text-muted)" : variant === "inline" ? "var(--text-secondary)" : "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {missing ? empty : amount}
    </span>
  );
}
