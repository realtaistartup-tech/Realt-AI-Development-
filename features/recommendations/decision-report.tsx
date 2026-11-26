"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { HandCoins, HelpCircle, Loader2, ThumbsDown, ThumbsUp, UserRound } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { PrintExpandDetails } from "@/components/print-expand-details";
import { loadPriorities } from "@/hooks/use-priorities-store";
import { PrioritySummary } from "@/features/onboarding/priority-summary";
import type { DecisionReport as DecisionReportData } from "@/types";
import { ConflictsSection } from "./conflicts-section";
import { LongTermConsequencesSection } from "./long-term-consequences-section";
import { PriorityRanking } from "./priority-ranking";
import { PropertyCard } from "./property-card";
import { ReportHeader } from "./report-header";
import { ReportListSection } from "./report-list-section";

type LoadState =
  | { status: "loading" }
  | { status: "missing-priorities" }
  | { status: "error"; message: string }
  | { status: "ready"; report: DecisionReportData };

/**
 * The Realt Decision Report: the "heart of the product," per CLAUDE.md's
 * signature-experience directive. Every section here is a different lens on
 * the same underlying DecisionReport data (services/report/decision-report.ts)
 * — nothing is invented client-side, this component only lays it out.
 */
export function DecisionReport() {
  const t = useTranslations("recommendations");
  const tReport = useTranslations("report");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const reportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setState({ status: "loading" });
    const loaded = loadPriorities();
    if (!loaded) {
      setState({ status: "missing-priorities" });
      return;
    }
    const { priorities, confidence } = loaded;

    fetch("/api/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorities, confidence }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(t("error.generic"));
        }
        return (await response.json()) as DecisionReportData;
      })
      .then((report) => setState({ status: "ready", report }))
      .catch((err) => {
        setState({
          status: "error",
          message: err instanceof Error ? err.message : t("error.generic"),
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
  const timer = setTimeout(load, 0);
  return () => clearTimeout(timer);
}, [load]);

  // Move focus into the report once it replaces the loading state, so
  // screen reader users get a clear signal that new content has arrived
  // instead of silently sitting on a spinner that's already gone.
  useEffect(() => {
    if (state.status === "ready") {
      reportRef.current?.focus();
    }
  }, [state.status]);

  if (state.status === "loading") {
    return (
      <div role="status" className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (state.status === "missing-priorities") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="text-xl font-semibold">{t("missing.heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("missing.description")}</p>
        <Button asChild className="mt-6">
          <Link href="/assistant">{t("missing.cta")}</Link>
        </Button>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p role="alert" className="text-destructive">
          {state.message}
        </p>
        <Button variant="outline" className="mt-6" onClick={load}>
          {t("error.retry")}
        </Button>
      </div>
    );
  }

  const { report } = state;

  return (
    <div
      ref={reportRef}
      tabIndex={-1}
      className="mx-auto max-w-3xl space-y-10 px-4 py-16 outline-none sm:px-6 print:max-w-none print:px-0"
    >
      <PrintExpandDetails />
      <ReportHeader
        realtScore={report.realtScore}
        confidenceScore={report.confidenceScore}
        confidenceTier={report.confidenceTier}
        generatedAt={report.generatedAt}
        priorities={report.priorities}
      />

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 className="text-base font-semibold text-foreground">{tReport("profile.heading")}</h2>
        </div>
        <PrioritySummary priorities={report.priorities} confidence={report.confidence} />
      </section>

      <PriorityRanking ranking={report.priorityRanking} />

      <ConflictsSection conflicts={report.conflicts} />

      <ReportListSection
        icon={HandCoins}
        title={tReport("compromises.heading")}
        description={tReport("compromises.description")}
        items={report.compromises}
        emptyMessage={tReport("compromises.empty")}
        tone="caution"
      />

      <LongTermConsequencesSection groups={report.longTermConsequences} />

      <div className="grid gap-8 sm:grid-cols-2">
        <ReportListSection
          icon={ThumbsUp}
          title={tReport("appreciate.heading")}
          description={tReport("appreciate.description")}
          items={report.likelyToAppreciate}
          emptyMessage={tReport("appreciate.empty")}
          tone="positive"
        />
        <ReportListSection
          icon={ThumbsDown}
          title={tReport("regret.heading")}
          description={tReport("regret.description")}
          items={report.likelyToRegret}
          emptyMessage={tReport("regret.empty")}
          tone="caution"
        />
      </div>

      <ReportListSection
        icon={HelpCircle}
        title={tReport("openQuestions.heading")}
        description={tReport("openQuestions.description")}
        items={report.openQuestions}
        emptyMessage={tReport("openQuestions.empty")}
      />

      <section className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            {tReport("matches.heading")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{tReport("matches.description")}</p>
        </div>
        {report.topMatches.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {report.topMatches.map((result) => (
              <PropertyCard key={result.property.id} result={result} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{tReport("matches.empty")}</p>
        )}
      </section>
    </div>
  );
}
