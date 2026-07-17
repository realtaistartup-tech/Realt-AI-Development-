import { useTranslations } from "next-intl";

import type { PriorityRankingEntry } from "@/types";

interface PriorityRankingProps {
  ranking: PriorityRankingEntry[];
}

export function PriorityRanking({ ranking }: PriorityRankingProps) {
  const t = useTranslations("report.priorityRanking");
  const tCategories = useTranslations("onboarding.fields.categories");

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-foreground">{t("heading")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <ol className="space-y-2.5">
        {ranking.map((entry) => (
          <li key={entry.category} className="flex items-center gap-3">
            <span className="w-4 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
              {entry.rank}
            </span>
            <span className="w-20 shrink-0 text-sm font-medium text-foreground sm:w-24">
              {tCategories(entry.category)}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${(entry.importance / 5) * 100}%` }}
              />
            </div>
            <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
              {entry.importance}/5
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
