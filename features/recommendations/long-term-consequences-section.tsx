import { Hourglass } from "lucide-react";
import { useTranslations } from "next-intl";

import type { LongTermConsequenceGroup } from "@/types";

interface LongTermConsequencesSectionProps {
  groups: LongTermConsequenceGroup[];
}

/**
 * Grouped by conflict — the conflict's title is stated once as a
 * sub-heading, with its options listed underneath, rather than repeating
 * the full title on every bullet (see decision-report.ts's
 * deriveLongTermConsequences for why).
 */
export function LongTermConsequencesSection({ groups }: LongTermConsequencesSectionProps) {
  const t = useTranslations("report.longTermConsequences");

  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5">
        <Hourglass className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{t("heading")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>
      {groups.length > 0 ? (
        <div className="ml-7 space-y-4">
          {groups.map((group) => (
            <div key={group.conflictTitle}>
              <p className="text-sm font-medium text-foreground">{group.conflictTitle}</p>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-5 text-sm text-foreground marker:text-muted-foreground">
                {group.options.map((option) => (
                  <li key={option.label}>
                    <span className="font-medium">{option.label}:</span> {option.consequence}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="ml-7 text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </section>
  );
}
