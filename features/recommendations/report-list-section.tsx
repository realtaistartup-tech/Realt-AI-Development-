import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Tone = "neutral" | "positive" | "caution";

interface ReportListSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  items: string[];
  emptyMessage: string;
  tone?: Tone;
}

const TONE_ICON_CLASSES: Record<Tone, string> = {
  neutral: "text-primary",
  positive: "text-success",
  caution: "text-warning",
};

/**
 * One reusable shape for every plain-bulleted report section — compromise
 * analysis, long-term consequences, the 12-month appreciate/regret pairing,
 * and open questions all render through this rather than five near-
 * identical components. Each section still gets its own icon, title,
 * description, and tone; only the layout is shared.
 */
export function ReportListSection({
  icon: Icon,
  title,
  description,
  items,
  emptyMessage,
  tone = "neutral",
}: ReportListSectionProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-start gap-2.5">
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", TONE_ICON_CLASSES[tone])} aria-hidden="true" />
        <div>
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {items.length > 0 ? (
        <ul className="ml-7 list-disc space-y-2 text-sm text-foreground marker:text-muted-foreground">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="ml-7 text-sm text-muted-foreground">{emptyMessage}</p>
      )}
    </section>
  );
}
