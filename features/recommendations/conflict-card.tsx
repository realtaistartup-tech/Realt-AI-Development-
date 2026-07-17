import { ChevronRight, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { PriorityConflict } from "@/types";

interface ConflictCardProps {
  conflict: PriorityConflict;
}

type Severity = PriorityConflict["severity"];

const SEVERITY_CLASSES: Record<Severity, string> = {
  low: "border-border bg-secondary/40 text-foreground",
  medium: "border-warning/40 bg-warning/10 text-warning",
  high: "border-destructive/40 bg-destructive/10 text-destructive",
};

/**
 * One detected trade-off between what the user asked for — not a listing
 * problem, a priorities problem. CLAUDE.md is explicit that Realt AI never
 * chooses for the user, so this always presents realistic options with
 * their own honest long-term consequence rather than a single suggestion.
 */
export function ConflictCard({ conflict }: ConflictCardProps) {
  const t = useTranslations("recommendations.conflict");

  return (
    <div className="rounded-lg border border-border bg-background p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">{conflict.title}</h3>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
            SEVERITY_CLASSES[conflict.severity],
          )}
        >
          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
          {t(`severity.${conflict.severity}`)}
        </span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{conflict.description}</p>

      {conflict.options.length > 0 && (
        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-primary marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
              aria-hidden="true"
            />
            {t("optionsToggle")}
          </summary>
          <ul className="mt-3 space-y-3 border-t border-border pt-3">
            {conflict.options.map((option) => (
              <li key={option.label}>
                <p className="text-sm font-medium text-foreground">{option.label}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{option.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t("consequenceLabel")}</span>{" "}
                  {option.longTermConsequence}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
