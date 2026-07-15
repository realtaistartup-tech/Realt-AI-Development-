import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

type Tier = "strong" | "partial" | "weak";

const TIER_CLASSES: Record<Tier, string> = {
  strong: "border-success/40 bg-success/10 text-success",
  partial: "border-warning/40 bg-warning/10 text-warning",
  weak: "border-destructive/40 bg-destructive/10 text-destructive",
};

function scoreTier(score: number): Tier {
  if (score >= 80) return "strong";
  if (score >= 60) return "partial";
  return "weak";
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const t = useTranslations("matchScore");
  const tier = scoreTier(score);
  const tierLabel = t(tier);

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1",
        TIER_CLASSES[tier],
        className,
      )}
      role="img"
      aria-label={t("ariaLabel", { score, tier: tierLabel })}
    >
      <span className="text-sm font-semibold tabular-nums" aria-hidden="true">
        {score}
      </span>
      <span className="text-xs font-medium" aria-hidden="true">
        {tierLabel}
      </span>
    </div>
  );
}
