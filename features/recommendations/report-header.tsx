"use client";

import { Printer } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ConfidenceTier, UserPriorities } from "@/types";
import { SaveSearchButton } from "./save-search-button";

interface ReportHeaderProps {
  realtScore: number;
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  generatedAt: string;
  priorities: UserPriorities;
}

type RealtScoreTier = "strong" | "partial" | "weak";

function realtScoreTier(score: number): RealtScoreTier {
  if (score >= 80) return "strong";
  if (score >= 60) return "partial";
  return "weak";
}

const REALT_SCORE_TONE: Record<RealtScoreTier, string> = {
  strong: "border-success/40 bg-success/10 text-success",
  partial: "border-warning/40 bg-warning/10 text-warning",
  weak: "border-destructive/40 bg-destructive/10 text-destructive",
};

// Low confidence isn't a failure — it just means the report is asking to
// hear more from the user, so it deliberately avoids the destructive/red
// tone reserved for a genuinely weak property match.
const CONFIDENCE_TONE: Record<ConfidenceTier, string> = {
  high: "border-success/40 bg-success/10 text-success",
  medium: "border-border bg-secondary/60 text-foreground",
  low: "border-warning/40 bg-warning/10 text-warning",
};

export function ReportHeader({
  realtScore,
  confidenceScore,
  confidenceTier,
  generatedAt,
  priorities,
}: ReportHeaderProps) {
  const t = useTranslations("report.header");
  const locale = useLocale();
  const tier = realtScoreTier(realtScore);
  const generatedDate = new Date(generatedAt).toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("eyebrow")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            {t("heading")}
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{t("subheading")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {t("generatedOn", { date: generatedDate })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 print:hidden">
          <SaveSearchButton priorities={priorities} />
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" aria-hidden="true" />
            {t("print")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className={cn("rounded-xl border p-5", REALT_SCORE_TONE[tier])}>
          <p className="text-xs font-semibold uppercase tracking-wide">{t("realtScoreLabel")}</p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{realtScore}</p>
          <p className="mt-1 text-sm">{t(`realtScoreExplain.${tier}`)}</p>
        </div>
        <div className={cn("rounded-xl border p-5", CONFIDENCE_TONE[confidenceTier])}>
          <p className="text-xs font-semibold uppercase tracking-wide">
            {t("confidenceScoreLabel")}
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{confidenceScore}</p>
          <p className="mt-1 text-sm">{t(`confidenceScoreExplain.${confidenceTier}`)}</p>
        </div>
      </div>
    </div>
  );
}
