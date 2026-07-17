"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { PRIORITY_CATEGORIES, type CommuteMode, type PriorityCategory, type PriorityFieldKey, type UserPriorities } from "@/types";

interface ClarifyingQuestionProps {
  field: PriorityFieldKey;
  priorities: UserPriorities;
  onAnswer: (updated: UserPriorities) => void;
  onSkip: () => void;
}

const COMMUTE_MODES: CommuteMode[] = ["drive", "transit", "walk", "bike"];
const MAX_WEIGHT_PICKS = 2;

/**
 * One short, focused question — never the full form. This is the heart of
 * "feels like a conversation, not a form": exactly one field type is asked
 * about at a time, with an input purpose-built for that field, and always
 * an honest way out ("skip") rather than forcing an answer to something
 * the person may not know yet.
 */
export function ClarifyingQuestion({ field, priorities, onAnswer, onSkip }: ClarifyingQuestionProps) {
  const t = useTranslations("onboarding.clarify");

  return (
    <div className="space-y-5 rounded-lg border border-border bg-background p-5">
      {field === "budget" && <BudgetQuestion priorities={priorities} onAnswer={onAnswer} />}
      {field === "commute" && <CommuteQuestion priorities={priorities} onAnswer={onAnswer} />}
      {field === "space" && <SpaceQuestion priorities={priorities} onAnswer={onAnswer} />}
      {field === "weights" && <WeightsQuestion priorities={priorities} onAnswer={onAnswer} />}
      <Button type="button" variant="ghost" size="sm" onClick={onSkip} className="text-muted-foreground">
        {t("skip")}
      </Button>
    </div>
  );
}

function QuestionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground">{children}</h2>;
}

function BudgetQuestion({
  priorities,
  onAnswer,
}: {
  priorities: UserPriorities;
  onAnswer: (updated: UserPriorities) => void;
}) {
  const t = useTranslations("onboarding.clarify.budget");
  const tContinue = useTranslations("onboarding.clarify");
  const minId = useId();
  const maxId = useId();
  const [min, setMin] = useState(priorities.budgetMin || 0);
  const [max, setMax] = useState(priorities.budgetMax || 0);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onAnswer({ ...priorities, budgetMin: Math.min(min, max), budgetMax: Math.max(min, max) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <QuestionHeading>{t("question")}</QuestionHeading>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={minId}>{t("min")}</Label>
          <Input
            id={minId}
            type="number"
            inputMode="numeric"
            min={0}
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={maxId}>{t("max")}</Label>
          <Input
            id={maxId}
            type="number"
            inputMode="numeric"
            min={0}
            value={max}
            onChange={(e) => setMax(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit">
        {tContinue("continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}

function CommuteQuestion({
  priorities,
  onAnswer,
}: {
  priorities: UserPriorities;
  onAnswer: (updated: UserPriorities) => void;
}) {
  const t = useTranslations("onboarding.clarify.commute");
  const tModes = useTranslations("onboarding.fields.commute.modes");
  const tContinue = useTranslations("onboarding.clarify");
  const minutesId = useId();
  const [minutes, setMinutes] = useState(priorities.commuteMaxMinutes || 30);
  const [mode, setMode] = useState<CommuteMode>(priorities.commuteMode);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onAnswer({ ...priorities, commuteMaxMinutes: minutes, commuteMode: mode });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <QuestionHeading>{t("question")}</QuestionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="clarify-commute-mode">{t("mode")}</Label>
          <Select value={mode} onValueChange={(value) => setMode(value as CommuteMode)}>
            <SelectTrigger id="clarify-commute-mode">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMMUTE_MODES.map((m) => (
                <SelectItem key={m} value={m}>
                  {tModes(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={minutesId}>{t("maxMinutes")}</Label>
          <Input
            id={minutesId}
            type="number"
            inputMode="numeric"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit">
        {tContinue("continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}

function SpaceQuestion({
  priorities,
  onAnswer,
}: {
  priorities: UserPriorities;
  onAnswer: (updated: UserPriorities) => void;
}) {
  const t = useTranslations("onboarding.clarify.space");
  const tContinue = useTranslations("onboarding.clarify");
  const bedroomsId = useId();
  const bathroomsId = useId();
  const [bedrooms, setBedrooms] = useState(priorities.minBedrooms || 1);
  const [bathrooms, setBathrooms] = useState(priorities.minBathrooms || 1);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onAnswer({ ...priorities, minBedrooms: bedrooms, minBathrooms: bathrooms });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <QuestionHeading>{t("question")}</QuestionHeading>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={bedroomsId}>{t("bedrooms")}</Label>
          <Input
            id={bedroomsId}
            type="number"
            inputMode="numeric"
            min={0}
            value={bedrooms}
            onChange={(e) => setBedrooms(Number(e.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={bathroomsId}>{t("bathrooms")}</Label>
          <Input
            id={bathroomsId}
            type="number"
            inputMode="numeric"
            min={0}
            step={0.5}
            value={bathrooms}
            onChange={(e) => setBathrooms(Number(e.target.value))}
          />
        </div>
      </div>
      <Button type="submit">
        {tContinue("continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}

function WeightsQuestion({
  priorities,
  onAnswer,
}: {
  priorities: UserPriorities;
  onAnswer: (updated: UserPriorities) => void;
}) {
  const t = useTranslations("onboarding.clarify.weights");
  const tCategories = useTranslations("onboarding.fields.categories");
  const tContinue = useTranslations("onboarding.clarify");
  const [selected, setSelected] = useState<PriorityCategory[]>([]);

  function toggle(category: PriorityCategory) {
    setSelected((prev) => {
      if (prev.includes(category)) return prev.filter((c) => c !== category);
      if (prev.length >= MAX_WEIGHT_PICKS) return prev;
      return [...prev, category];
    });
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onAnswer({
      ...priorities,
      weights: PRIORITY_CATEGORIES.map((category) => ({
        category,
        importance: selected.includes(category) ? 5 : 3,
      })),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <QuestionHeading>{t("question")}</QuestionHeading>
      <p className="text-sm text-muted-foreground">{t("hint")}</p>
      <div role="group" aria-label={t("question")} className="flex flex-wrap gap-2">
        {PRIORITY_CATEGORIES.map((category) => {
          const isSelected = selected.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isSelected}
              onClick={() => toggle(category)}
              disabled={!isSelected && selected.length >= MAX_WEIGHT_PICKS}
              className={cn(
                "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
                isSelected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background text-foreground hover:bg-accent",
              )}
            >
              {tCategories(category)}
            </button>
          );
        })}
      </div>
      <Button type="submit">
        {selected.length === 0 ? t("balanced") : tContinue("continue")}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </form>
  );
}
