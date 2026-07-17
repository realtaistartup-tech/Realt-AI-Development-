import { useTranslations } from "next-intl";

import type { PriorityConflict } from "@/types";
import { ConflictCard } from "./conflict-card";

interface ConflictsSectionProps {
  conflicts: PriorityConflict[];
}

export function ConflictsSection({ conflicts }: ConflictsSectionProps) {
  const t = useTranslations("report.conflicts");

  return (
    <section className="space-y-3" aria-labelledby="conflicts-heading">
      <div>
        <h2 id="conflicts-heading" className="text-base font-semibold text-foreground">
          {t("heading")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>
      {conflicts.length > 0 ? (
        <div className="space-y-3">
          {conflicts.map((conflict) => (
            <ConflictCard key={conflict.id} conflict={conflict} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      )}
    </section>
  );
}
