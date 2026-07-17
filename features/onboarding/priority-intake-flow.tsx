"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { savePriorities } from "@/hooks/use-priorities-store";
import { nextClarifyingField } from "@/services/onboarding/clarifying-flow";
import { PRIORITY_FIELD_ORDER, type PriorityConfidence, type PriorityFieldKey, type UserPriorities } from "@/types";
import { ClarifyingQuestion } from "./clarifying-question";
import { PriorityReviewForm } from "./priority-review-form";
import { PrioritySummary } from "./priority-summary";

type Step = "describe" | "clarify" | "review" | "editing";

export function PriorityIntakeFlow() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const [step, setStep] = useState<Step>("describe");
  const [freeText, setFreeText] = useState("");
  const [priorities, setPriorities] = useState<UserPriorities | null>(null);
  const [confidence, setConfidence] = useState<PriorityConfidence | null>(null);
  const [askedFields, setAskedFields] = useState<PriorityFieldKey[]>([]);
  const [assumedFields, setAssumedFields] = useState<PriorityFieldKey[]>([]);
  const [initialClarifyCount, setInitialClarifyCount] = useState(0);
  const [source, setSource] = useState<"ai" | "heuristic" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const currentField =
    step === "clarify" && confidence ? nextClarifyingField(confidence, askedFields) : null;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, currentField]);

  async function handleDescribeSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/ai/priorities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: freeText }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? t("errors.generic"));
      }
      const data = (await response.json()) as {
        priorities: UserPriorities;
        source: "ai" | "heuristic";
        confidence: PriorityConfidence;
      };
      setPriorities(data.priorities);
      setSource(data.source);
      setConfidence(data.confidence);
      setAskedFields([]);
      setAssumedFields([]);

      const gapCount = PRIORITY_FIELD_ORDER.filter((field) => !data.confidence[field]).length;
      setInitialClarifyCount(gapCount);
      setStep(nextClarifyingField(data.confidence, []) ? "clarify" : "review");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function advanceAfter(updatedAsked: PriorityFieldKey[], updatedConfidence: PriorityConfidence) {
    setAskedFields(updatedAsked);
    const next = nextClarifyingField(updatedConfidence, updatedAsked);
    setStep(next ? "clarify" : "review");
  }

  function handleClarifyAnswer(updated: UserPriorities) {
    if (!currentField || !confidence) return;
    setPriorities(updated);
    const updatedConfidence = { ...confidence, [currentField]: true };
    setConfidence(updatedConfidence);
    advanceAfter([...askedFields, currentField], updatedConfidence);
  }

  function handleClarifySkip() {
    if (!currentField || !confidence) return;
    setAssumedFields((prev) => [...prev, currentField]);
    advanceAfter([...askedFields, currentField], confidence);
  }

  function handleConfirm() {
    if (!priorities) return;
    savePriorities(priorities);
    router.push("/recommendations");
  }

  const progress =
    step === "describe"
      ? 10
      : step === "clarify"
        ? 10 + (askedFields.length / Math.max(initialClarifyCount, 1)) * 70
        : 100;

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Progress value={progress} aria-label={t("progressLabel")} />

      {step === "describe" && (
        <form onSubmit={handleDescribeSubmit} className="mt-6 space-y-6">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              {t("describe.heading")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("describe.description")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="free-text-priorities">{t("describe.label")}</Label>
            <Textarea
              id="free-text-priorities"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={t("describe.placeholder")}
              rows={8}
              required
              minLength={1}
              maxLength={4000}
              aria-describedby="free-text-hint"
            />
            <p id="free-text-hint" className="text-xs text-muted-foreground">
              {t("describe.hint")}
            </p>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" disabled={isSubmitting || freeText.trim().length === 0}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {t("describe.submitting")}
              </>
            ) : (
              <>
                {t("describe.submit")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      )}

      {step === "clarify" && currentField && priorities && (
        <div className="mt-6 space-y-6">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              {t("clarify.heading")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("clarify.intro")}</p>
          </div>
          <ClarifyingQuestion
            field={currentField}
            priorities={priorities}
            onAnswer={handleClarifyAnswer}
            onSkip={handleClarifySkip}
          />
        </div>
      )}

      {step === "review" && priorities && (
        <div className="mt-6 space-y-6">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              {t("summary.heading")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("summary.description")}</p>
          </div>
          {source === "heuristic" && (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <CardTitle className="text-sm">{t("review.offlineTitle")}</CardTitle>
                  <CardDescription>{t("review.offlineDescription")}</CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}
          <PrioritySummary
            priorities={priorities}
            assumedFields={assumedFields}
            onEdit={() => setStep("editing")}
            onConfirm={handleConfirm}
          />
        </div>
      )}

      {step === "editing" && priorities && (
        <div className="mt-6 space-y-6">
          <div>
            <h1 ref={headingRef} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
              {t("review.heading")}
            </h1>
            <p className="mt-2 text-muted-foreground">{t("review.description")}</p>
          </div>
          <PriorityReviewForm priorities={priorities} onChange={setPriorities} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("review")}>
              {t("review.back")}
            </Button>
            <Button onClick={handleConfirm}>
              {t("review.confirm")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
