"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITY_CATEGORIES, type CommuteMode, type UserPriorities } from "@/types";
import { TagListEditor } from "./tag-list-editor";

const COMMUTE_MODES: CommuteMode[] = ["drive", "transit", "walk", "bike"];

interface PriorityReviewFormProps {
  priorities: UserPriorities;
  onChange: (priorities: UserPriorities) => void;
}

export function PriorityReviewForm({ priorities, onChange }: PriorityReviewFormProps) {
  const t = useTranslations("onboarding.fields");
  const budgetMinId = useId();
  const budgetMaxId = useId();
  const commuteMinutesId = useId();
  const bedroomsId = useId();
  const bathroomsId = useId();

  function update<K extends keyof UserPriorities>(key: K, value: UserPriorities[K]) {
    onChange({ ...priorities, [key]: value });
  }

  function updateImportance(category: (typeof PRIORITY_CATEGORIES)[number], importance: number) {
    onChange({
      ...priorities,
      weights: priorities.weights.map((w) =>
        w.category === category ? { ...w, importance } : w,
      ),
    });
  }

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("budget.legend")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={budgetMinId}>{t("budget.min")}</Label>
            <Input
              id={budgetMinId}
              type="number"
              inputMode="numeric"
              min={0}
              value={priorities.budgetMin}
              onChange={(e) => update("budgetMin", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={budgetMaxId}>{t("budget.max")}</Label>
            <Input
              id={budgetMaxId}
              type="number"
              inputMode="numeric"
              min={0}
              value={priorities.budgetMax}
              onChange={(e) => update("budgetMax", Number(e.target.value))}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("commute.legend")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={commuteMinutesId}>{t("commute.maxMinutes")}</Label>
            <Input
              id={commuteMinutesId}
              type="number"
              inputMode="numeric"
              min={1}
              value={priorities.commuteMaxMinutes}
              onChange={(e) => update("commuteMaxMinutes", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commute-mode">{t("commute.mode")}</Label>
            <Select
              value={priorities.commuteMode}
              onValueChange={(value) => update("commuteMode", value as CommuteMode)}
            >
              <SelectTrigger id="commute-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUTE_MODES.map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {t(`commute.modes.${mode}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("space.legend")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={bedroomsId}>{t("space.bedrooms")}</Label>
            <Input
              id={bedroomsId}
              type="number"
              inputMode="numeric"
              min={0}
              value={priorities.minBedrooms}
              onChange={(e) => update("minBedrooms", Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={bathroomsId}>{t("space.bathrooms")}</Label>
            <Input
              id={bathroomsId}
              type="number"
              inputMode="numeric"
              min={0}
              step={0.5}
              value={priorities.minBathrooms}
              onChange={(e) => update("minBathrooms", Number(e.target.value))}
            />
          </div>
        </div>
      </fieldset>

      <TagListEditor
        label={t("mustHaves.label")}
        description={t("mustHaves.description")}
        values={priorities.mustHaves}
        onChange={(values) => update("mustHaves", values)}
        placeholder={t("mustHaves.placeholder")}
      />

      <TagListEditor
        label={t("dealBreakers.label")}
        description={t("dealBreakers.description")}
        values={priorities.dealBreakers}
        onChange={(values) => update("dealBreakers", values)}
        placeholder={t("dealBreakers.placeholder")}
      />

      <TagListEditor
        label={t("lifestyle.label")}
        description={t("lifestyle.description")}
        values={priorities.lifestyleTags}
        onChange={(values) => update("lifestyleTags", values)}
        placeholder={t("lifestyle.placeholder")}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">{t("importance.legend")}</legend>
        <div className="space-y-3">
          {PRIORITY_CATEGORIES.map((category) => {
            const weight = priorities.weights.find((w) => w.category === category);
            const importance = weight?.importance ?? 3;
            const categoryLabel = t(`categories.${category}`);
            return (
              <div key={category} className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">{categoryLabel}</span>
                <div
                  role="radiogroup"
                  aria-label={categoryLabel}
                  className="flex gap-1"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={importance === level}
                      aria-label={t("importance.levelLabel", { level })}
                      onClick={() => updateImportance(category, level)}
                      className={cn(
                        "h-7 w-7 rounded-full border border-input text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                        importance >= level
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background text-muted-foreground hover:bg-accent",
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </fieldset>
    </div>
  );
}
