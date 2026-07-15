"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { savePriorities } from "@/hooks/use-priorities-store";
import type { UserPriorities } from "@/types";
import { PriorityReviewForm } from "./priority-review-form";

type Step = "describe" | "review";

export function PriorityIntakeFlow() {
  const router = useRouter();
  const t = useTranslations("onboarding");
  const [step, setStep] = useState<Step>("describe");
  const [freeText, setFreeText] = useState("");
  const [priorities, setPriorities] = useState<UserPriorities | null>(null);
  const [source, setSource] = useState<"ai" | "heuristic" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const data = (await response.json()) as { priorities: UserPriorities; source: "ai" | "heuristic" };
      setPriorities(data.priorities);
      setSource(data.source);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleConfirm() {
    if (!priorities) return;
    savePriorities(priorities);
    router.push("/recommendations");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <Progress value={step === "describe" ? 50 : 100} aria-label="Onboarding progress" />
      <p className="mt-2 text-sm text-muted-foreground">
        {t("stepLabel", { step: step === "describe" ? 1 : 2 })}
      </p>

      {step === "describe" && (
        <form onSubmit={handleDescribeSubmit} className="mt-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("describe.heading")}</h1>
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

      {step === "review" && priorities && (
        <div className="mt-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t("review.heading")}</h1>
            <p className="mt-2 text-muted-foreground">{t("review.description")}</p>
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
          <PriorityReviewForm priorities={priorities} onChange={setPriorities} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("describe")}>
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
