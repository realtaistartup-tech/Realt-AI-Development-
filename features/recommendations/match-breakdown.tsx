import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

import type { MatchFactor } from "@/types";

interface MatchBreakdownProps {
  factors: MatchFactor[];
}

/**
 * The full, unfiltered per-category score breakdown — every factor that
 * went into the overall number, not just the highlights already shown as
 * strengths/risks/compromises. CLAUDE.md's Match Score section is explicit
 * that the score "must be explainable" and the user "should always
 * understand how it was produced"; this is that, literally, using data
 * the scoring engine already computes (MatchResult.factors) but that
 * previously went nowhere in the UI.
 */
export function MatchBreakdown({ factors }: MatchBreakdownProps) {
  const t = useTranslations("propertyCard.breakdown");

  return (
    <details className="group rounded-lg border border-border">
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-foreground marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="h-4 w-4 shrink-0 transition-transform group-open:rotate-90"
          aria-hidden="true"
        />
        {t("toggle")}
      </summary>
      <dl className="space-y-3 border-t border-border px-4 py-3">
        {factors.map((factor) => (
          <div key={factor.category} className="flex items-start justify-between gap-4 text-sm">
            <div>
              <dt className="font-medium text-foreground">{factor.label}</dt>
              <dd className="text-muted-foreground">{factor.explanation}</dd>
            </div>
            <div className="shrink-0 text-right tabular-nums">
              <div className="font-semibold text-foreground">{Math.round(factor.score)}/100</div>
              <div className="text-xs text-muted-foreground">
                {t("importance", { level: factor.weight })}
              </div>
            </div>
          </div>
        ))}
      </dl>
    </details>
  );
}
