"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { PrMeta } from "@devdigest/shared";
import { usePrReviews } from "@/lib/hooks/reviews";
import { SeverityBadges } from "./SeverityBadges";
import { FindingsPreview } from "./FindingsPreview";

// Mounted only while the preview is open. Shares the detail page's query cache.
function PrReviewPreview({ prId, reviewId }: { prId: string; reviewId: string }) {
  const t = useTranslations("prReview.severity");
  const { data, isPending, isError } = usePrReviews(prId);
  const review = data?.find((item) => item.id === reviewId);
  if (isPending || isError || !review) return <div role={isError ? "alert" : "status"} style={{ padding: 14, fontSize: 12 }}>
    {t(isPending ? "loading" : isError ? "error" : "unavailable")}
  </div>;
  return <FindingsPreview findings={review.findings} />;
}

export function PrFindingsBadges({ pr, repoId }: { pr: PrMeta; repoId: string }) {
  const router = useRouter();
  const summary = pr.latest_review;
  return <SeverityBadges counts={summary?.counts ?? { critical: 0, warning: 0, suggestion: 0 }}
    preview={summary && pr.id ? <PrReviewPreview prId={pr.id} reviewId={summary.id} /> : undefined}
    onSelect={(severity) => {
      if (summary) router.push(`/repos/${repoId}/pulls/${pr.number}?tab=findings&review=${encodeURIComponent(summary.id)}&severity=${severity}`);
    }} />;
}
