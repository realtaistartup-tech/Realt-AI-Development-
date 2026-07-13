"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { savePriorities } from "@/hooks/use-priorities-store";
import type { UserPriorities } from "@/types";
import { PriorityReviewForm } from "./priority-review-form";

type Step = "describe" | "review";

const EXAMPLE_PROMPT =
  "We're a family of four looking for a 3-4 bedroom home under $600,000, ideally a 30 minute drive or less to downtown, in a quiet, family-friendly neighborhood with good schools. A backyard would be great, and we'd rule out anything without off-street parking.";

export function PriorityIntakeFlow() {
  const router = useRouter();
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
        throw new Error(body?.error ?? "Could not process that. Please try again.");
      }
      const data = (await response.json()) as { priorities: UserPriorities; source: "ai" | "heuristic" };
      setPriorities(data.priorities);
      setSource(data.source);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
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
        Step {step === "describe" ? 1 : 2} of 2
      </p>

      {step === "describe" && (
        <form onSubmit={handleDescribeSubmit} className="mt-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Tell us what you&apos;re looking for
            </h1>
            <p className="mt-2 text-muted-foreground">
              Describe your ideal home in your own words. Include what matters most — budget,
              commute, space, safety, schools, or lifestyle.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="free-text-priorities">Your priorities</Label>
            <Textarea
              id="free-text-priorities"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder={EXAMPLE_PROMPT}
              rows={8}
              required
              minLength={1}
              maxLength={4000}
              aria-describedby="free-text-hint"
            />
            <p id="free-text-hint" className="text-xs text-muted-foreground">
              Realt AI only uses what you write here — it won&apos;t invent details you didn&apos;t
              mention.
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
                Understanding your priorities…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            )}
          </Button>
        </form>
      )}

      {step === "review" && priorities && (
        <div className="mt-6 space-y-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Review your priorities</h1>
            <p className="mt-2 text-muted-foreground">
              Here&apos;s what Realt AI understood. Adjust anything before we look for matches.
            </p>
          </div>
          {source === "heuristic" && (
            <Card className="border-warning/40 bg-warning/5">
              <CardHeader className="flex-row items-start gap-3 space-y-0">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <CardTitle className="text-sm">Running in offline mode</CardTitle>
                  <CardDescription>
                    No AI model is configured, so priorities were extracted with a simpler,
                    rule-based reader. Review the fields below carefully.
                  </CardDescription>
                </div>
              </CardHeader>
            </Card>
          )}
          <PriorityReviewForm priorities={priorities} onChange={setPriorities} />
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep("describe")}>
              Back
            </Button>
            <Button onClick={handleConfirm}>
              See my matches
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
