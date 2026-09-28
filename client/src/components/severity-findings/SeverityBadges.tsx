"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Icon, SEV } from "@devdigest/ui";
import type { Severity } from "@devdigest/shared";
import { COUNT_KEY, SEVERITIES, type SeverityCounts } from "./helpers";

/** A single hover/focus surface shared by all three severity actions. */
export function SeverityBadges({ counts, selected, onSelect, preview, width = 360, labeled = false }: {
  counts: SeverityCounts;
  selected?: Severity | null;
  onSelect?: (severity: Severity) => void;
  preview?: React.ReactNode | ((severity: Severity | null, close: () => void) => React.ReactNode);
  labeled?: boolean;
  width?: 360 | 380;
}) {
  const t = useTranslations("prReview.severity");
  const [previewSeverity, setPreviewSeverity] = React.useState<Severity | null>(null);
  const activeSeverity = onSelect ? selected : previewSeverity;
  const [open, setOpen] = React.useState(false);
  const [position, setPosition] = React.useState({ left: 8, top: 8 });
  const trigger = React.useRef<HTMLDivElement>(null);
  const popup = React.useRef<HTMLDivElement>(null);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const hovered = React.useRef(false);
  const touch = React.useRef(false);
  const id = React.useId();
  const total = counts.critical + counts.warning + counts.suggestion;
  const cancelClose = () => { if (timer.current) clearTimeout(timer.current); };
  const containsFocus = () => trigger.current?.contains(document.activeElement) || popup.current?.contains(document.activeElement);
  const closeSoon = () => {
    cancelClose();
    timer.current = setTimeout(() => {
      if (!hovered.current && !containsFocus()) setOpen(false);
    }, 120);
  };
  const openPreview = () => {
    if (!open) setPreviewSeverity(null);
    setOpen(true);
  };
  const enter = (event: React.PointerEvent) => {
    if (event.pointerType === "touch") return;
    hovered.current = true;
    cancelClose();
    openPreview();
  };
  const leave = () => { hovered.current = false; closeSoon(); };
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  React.useLayoutEffect(() => {
    if (!open || !preview) return;
    const place = () => {
      if (!trigger.current || !popup.current) return;
      const anchor = trigger.current.getBoundingClientRect();
      const box = popup.current.getBoundingClientRect();
      const below = anchor.bottom + 8;
      const top = below + box.height <= window.innerHeight - 8 ? below : anchor.top - box.height - 8;
      setPosition({
        left: Math.max(8, Math.min(anchor.left, window.innerWidth - box.width - 8)),
        top: Math.max(8, Math.min(top, window.innerHeight - box.height - 8)),
      });
    };
    place();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(place) : null;
    if (popup.current) observer?.observe(popup.current);
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        // Move focus back before hiding the portal; don't leave it on body.
        if (popup.current?.contains(document.activeElement)) trigger.current?.querySelector("button")?.focus();
        hovered.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("keydown", escape, true);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer?.disconnect();
      document.removeEventListener("keydown", escape, true);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, preview]);

  if (total === 0) return <span aria-label={t("empty")} style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <div ref={trigger} role="group" aria-label={t(labeled ? "summary" : "group")}
      onPointerEnter={preview ? enter : undefined} onPointerLeave={preview ? leave : undefined}
      onPointerDown={(event) => { touch.current = event.pointerType === "touch"; }}
      onFocus={() => { if (preview && !touch.current) { cancelClose(); openPreview(); } }}
      onBlur={() => { touch.current = false; closeSoon(); }}
      onClick={(event) => event.stopPropagation()}
      style={{ display: "inline-flex", alignItems: "center", gap: width === 360 ? 8 : 10 }}>
      {SEVERITIES.map((severity) => {
        const count = counts[COUNT_KEY[severity]];
        if (!count) return null;
        const meta = SEV[severity];
        const Glyph = Icon[meta.icon];
        return <button key={severity} type="button" aria-label={t("count", { severity: t(severity), count })}
          aria-pressed={activeSeverity === severity} aria-controls={open && preview ? id : undefined}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && open && preview) { event.preventDefault(); popup.current?.focus(); }
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (onSelect) {
              hovered.current = false;
              setOpen(false);
              onSelect(severity);
            } else {
              cancelClose();
              setPreviewSeverity(open && previewSeverity === severity ? null : severity);
              setOpen(true);
            }
          }}
          style={{ display: "inline-flex", alignItems: "center", gap: width === 360 ? 3 : 4, padding: labeled ? "4px 8px" : "0 0 1px", border: 0,
            borderBottom: "1px dotted currentColor", background: labeled || activeSeverity === severity ? meta.bg : "transparent",
            boxShadow: activeSeverity === severity ? "0 0 0 2px currentColor" : undefined,
            color: meta.c, fontSize: 11.5, fontWeight: 600, cursor: "pointer", borderRadius: labeled ? 999 : 2, outlineOffset: 3 }}>
          <Glyph size={width === 360 ? 12 : 12.5} aria-hidden="true" /><span className="mono tnum">{count}</span>{labeled && <span>{t(severity).toUpperCase()}</span>}
        </button>;
      })}
      {open && preview && createPortal(
        <div ref={popup} id={id} role="region" aria-label={t("preview")} tabIndex={0}
          onPointerEnter={enter} onPointerLeave={leave}
          onFocus={() => { cancelClose(); openPreview(); }} onBlur={closeSoon}
          onClick={(event) => event.stopPropagation()}
          style={{ position: "fixed", ...position, width, maxWidth: "calc(100vw - 16px)", maxHeight: "calc(100dvh - 16px)",
            overflow: "auto", zIndex: 1000, border: "1px solid var(--border-strong)", borderRadius: 10,
            background: "var(--bg-elevated)", color: "var(--text-primary)", boxShadow: "var(--shadow-modal)", outlineOffset: 3, cursor: "default" }}>
          {typeof preview === "function" ? preview(previewSeverity, () => { hovered.current = false; setOpen(false); }) : preview}
        </div>, document.body)}
    </div>
  );
}
