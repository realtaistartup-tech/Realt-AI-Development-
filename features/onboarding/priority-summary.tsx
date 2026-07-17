import { ArrowRight, Pencil } from "lucide-react";
import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PRIORITY_CATEGORIES, PRIORITY_FIELD_ORDER, type PriorityConfidence, type UserPriorities } from "@/types";

interface PrioritySummaryProps {
  priorities: UserPriorities;
  /** Which essential fields were actually confirmed vs. left on a default —
   * unconfirmed ones are shown transparently rather than presenting a
   * guess as understood. A field is "unconfirmed" whenever confidence is
   * false, regardless of whether that's because the person skipped a
   * clarifying question or the priorities came from elsewhere (a saved
   * search) without that signal at all. */
  confidence: PriorityConfidence;
  /** Omit both to render as a read-only summary — used as-is inside the
   * Realt Decision Report, where there's no in-flow edit/confirm step. */
  onEdit?: () => void;
  onConfirm?: () => void;
}

/**
 * The "structured internal user profile," made legible. Not the full edit
 * form — a compact, readable statement of what Realt AI is about to use to
 * score properties, so the person can confirm at a glance instead of
 * re-reading a wall of fields. Editing is one click away during onboarding,
 * but isn't the default presentation — and isn't offered at all when reused
 * read-only in the decision report.
 */
export function PrioritySummary({ priorities, confidence, onEdit, onConfirm }: PrioritySummaryProps) {
  const t = useTranslations("onboarding.summary");
  const tModes = useTranslations("onboarding.fields.commute.modes");
  const tCategories = useTranslations("onboarding.fields.categories");
  const unconfirmedFields = PRIORITY_FIELD_ORDER.filter((field) => !confidence[field]);

  const topCategories = PRIORITY_CATEGORIES.filter(
    (category) => (priorities.weights.find((w) => w.category === category)?.importance ?? 3) >= 4,
  );

  return (
    <div className="space-y-6">
      <dl className="grid gap-4 rounded-lg border border-border p-5 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("budget")}
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatPrice(priorities.budgetMin)} – {formatPrice(priorities.budgetMax)}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("commute")}
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {t("commuteValue", {
              minutes: priorities.commuteMaxMinutes,
              mode: tModes(priorities.commuteMode),
            })}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("space")}
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {t("spaceValue", { bedrooms: priorities.minBedrooms, bathrooms: priorities.minBathrooms })}
          </dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("topPriorities")}
          </dt>
          <dd className="mt-1 text-sm text-foreground">
            {topCategories.length > 0
              ? topCategories.map((c) => tCategories(c)).join(", ")
              : t("topPrioritiesBalanced")}
          </dd>
        </div>

        {priorities.mustHaves.length > 0 && (
          <TagRow label={t("mustHaves")} tags={priorities.mustHaves} />
        )}
        {priorities.dealBreakers.length > 0 && (
          <TagRow label={t("dealBreakers")} tags={priorities.dealBreakers} />
        )}
        {priorities.lifestyleTags.length > 0 && (
          <TagRow label={t("lifestyle")} tags={priorities.lifestyleTags} />
        )}
      </dl>

      {unconfirmedFields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {t("assumedNote", {
            fields: unconfirmedFields.map((field) => t(`fieldLabels.${field}`)).join(", "),
          })}
        </p>
      )}

      {(onEdit || onConfirm) && (
        <div className="flex flex-wrap gap-3">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              {t("edit")}
            </Button>
          )}
          {onConfirm && (
            <Button onClick={onConfirm}>
              {t("confirm")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div className="sm:col-span-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1.5 flex flex-wrap gap-1.5">
        {tags.map((tag) => (
          <Badge key={tag} variant="secondary">
            {tag}
          </Badge>
        ))}
      </dd>
    </div>
  );
}
