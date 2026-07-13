"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITY_CATEGORIES, type CommuteMode, type UserPriorities } from "@/types";
import { TagListEditor } from "./tag-list-editor";

const CATEGORY_LABELS: Record<(typeof PRIORITY_CATEGORIES)[number], string> = {
  budget: "Budget",
  commute: "Commute",
  space: "Space",
  safety: "Safety",
  schools: "Schools",
  lifestyle: "Lifestyle",
};

const COMMUTE_MODES: { value: CommuteMode; label: string }[] = [
  { value: "drive", label: "Driving" },
  { value: "transit", label: "Public transit" },
  { value: "walk", label: "Walking" },
  { value: "bike", label: "Biking" },
];

interface PriorityReviewFormProps {
  priorities: UserPriorities;
  onChange: (priorities: UserPriorities) => void;
}

export function PriorityReviewForm({ priorities, onChange }: PriorityReviewFormProps) {
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
        <legend className="text-sm font-semibold">Budget</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={budgetMinId}>Minimum</Label>
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
            <Label htmlFor={budgetMaxId}>Maximum</Label>
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
        <legend className="text-sm font-semibold">Commute</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={commuteMinutesId}>Maximum commute (minutes)</Label>
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
            <Label htmlFor="commute-mode">Mode</Label>
            <Select
              value={priorities.commuteMode}
              onValueChange={(value) => update("commuteMode", value as CommuteMode)}
            >
              <SelectTrigger id="commute-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMUTE_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Space</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={bedroomsId}>Minimum bedrooms</Label>
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
            <Label htmlFor={bathroomsId}>Minimum bathrooms</Label>
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
        label="Must-haves"
        description="Amenities the home absolutely needs."
        values={priorities.mustHaves}
        onChange={(values) => update("mustHaves", values)}
        placeholder="e.g. parking"
      />

      <TagListEditor
        label="Deal-breakers"
        description="Anything that would rule a property out."
        values={priorities.dealBreakers}
        onChange={(values) => update("dealBreakers", values)}
        placeholder="e.g. no elevator"
      />

      <TagListEditor
        label="Lifestyle"
        description="How you want the neighborhood to feel."
        values={priorities.lifestyleTags}
        onChange={(values) => update("lifestyleTags", values)}
        placeholder="e.g. walkable"
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold">How important is each factor?</legend>
        <div className="space-y-3">
          {PRIORITY_CATEGORIES.map((category) => {
            const weight = priorities.weights.find((w) => w.category === category);
            const importance = weight?.importance ?? 3;
            return (
              <div key={category} className="flex items-center justify-between gap-4">
                <span className="text-sm text-foreground">{CATEGORY_LABELS[category]}</span>
                <div
                  role="radiogroup"
                  aria-label={`${CATEGORY_LABELS[category]} importance`}
                  className="flex gap-1"
                >
                  {[1, 2, 3, 4, 5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={importance === level}
                      aria-label={`${level} of 5`}
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
