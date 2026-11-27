"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Maximize2, Loader2, Map as MapIcon, MapPin, MessageSquare, Share2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { PrintExpandDetails } from "@/components/print-expand-details";
import { loadPriorities, loadReportContext, type ReportContext } from "@/hooks/use-priorities-store";
import { formatArea, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DecisionReport as DecisionReportData, MatchFactor, MatchResult, PriorityCategory, UserPriorities } from "@/types";
import { SaveSearchButton } from "./save-search-button";

type LoadState =
  | { status: "loading" }
  | { status: "missing-priorities" }
  | { status: "error"; message: string }
  | { status: "ready"; report: DecisionReportData };

/** Order the chat's lifestyle answers are shown in (matches the assistant's question order). */
const PROFILE_ORDER = [
  "reason", "current", "pets", "hobbies", "network", "work", "transport", "parking", "vibe", "schools", "future",
  "housing", "outdoor", "environment", "accessibility", "condition", "contract", "rentalTerms", "mustHaves",
  "moveIn", "stayLength", "financing", "monthly", "moneyPriority",
] as const;

const BUY_CHECKS = ["checkBuy1", "checkBuy2", "checkBuy3", "checkBuy4", "checkBuy5", "checkBuy6"] as const;
const RENT_CHECKS = ["checkRent1", "checkRent2", "checkRent3", "checkRent4", "checkRent5"] as const;
const ALL_CHECKS = ["checkAll1", "checkAll2", "checkAll3"] as const;

function scoreTier(score: number): "strong" | "partial" | "weak" {
  if (score >= 80) return "strong";
  if (score >= 60) return "partial";
  return "weak";
}

/** A factor counts as met when it scores well and is not flagged as a risk. */
function factorMet(result: MatchResult, category: PriorityCategory): boolean | null {
  const factor = result.factors.find((f) => f.category === category);
  if (!factor) return null;
  return factor.score >= 70 && !factor.isRisk;
}

type Translate = (key: string, values?: Record<string, string | number>) => string;

/**
 * One line about one factor of a home, in the reader's language. Built from
 * the property's own numbers rather than the scoring engine's English
 * explanation strings, so the top of the report is fully translated.
 */
function factorLine(m: MatchResult, f: MatchFactor, p: UserPriorities, tr: Translate, mode: string): string {
  const met = f.score >= 70 && !f.isRisk;
  const prop = m.property;
  switch (f.category) {
    case "budget":
      if (met) return tr("f.budgetOk", { price: formatPrice(prop.price) });
      return prop.price > p.budgetMax
        ? tr("f.budgetOver", { price: formatPrice(prop.price), max: formatPrice(p.budgetMax) })
        : tr("f.budgetUnder", { price: formatPrice(prop.price) });
    case "commute": {
      const minutes = prop.commuteMinutesByMode[p.commuteMode];
      if (minutes === undefined) return tr("f.commuteUnknown");
      return tr(met ? "f.commuteOk" : "f.commuteOver", { minutes, mode, max: p.commuteMaxMinutes });
    }
    case "space":
      if (met) return tr("f.spaceOk", { bedrooms: prop.bedrooms, bathrooms: prop.bathrooms });
      return prop.bedrooms < p.minBedrooms
        ? tr("f.spaceBedrooms", { bedrooms: prop.bedrooms, min: p.minBedrooms })
        : tr("f.spaceBathrooms", { bathrooms: prop.bathrooms, min: p.minBathrooms });
    case "safety":
      return tr(met ? "f.safetyOk" : "f.safetyLow", { score: prop.neighborhoodSafetyScore });
    case "schools":
      return tr(met ? "f.schoolsOk" : "f.schoolsLow", { rating: prop.schoolRating });
    default:
      return tr(met ? "f.lifestyleOk" : "f.lifestyleLow");
  }
}

/** The home's met and unmet factors, most important first. */
function splitFactors(m: MatchResult) {
  const sorted = [...m.factors].sort((a, b) => b.weight - a.weight);
  return {
    met: sorted.filter((f) => f.score >= 70 && !f.isRisk),
    unmet: sorted.filter((f) => !(f.score >= 70 && !f.isRisk)),
  };
}

/**
 * The Realt Decision Report: the "heart of the product". Read top to bottom:
 * the decision in one minute, the homes, what we know about you and where it
 * conflicts, then what to check before deciding. Everything comes from the
 * DecisionReport data (services/report/decision-report.ts) plus what the
 * assistant chat learned; nothing is invented here.
 */
export function DecisionReport() {
  const t = useTranslations("recommendations");
  const tr = useTranslations("report.v2");
  const ta = useTranslations("assistant");
  const locale = useLocale();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [context, setContext] = useState<ReportContext | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState(false);
  /** Property shown on its own with the full analysis; null = all homes in the grid. */
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    setState({ status: "loading" });
    const loaded = loadPriorities();
    setContext(loadReportContext());
    if (!loaded) {
      setState({ status: "missing-priorities" });
      return;
    }
    fetch("/api/ai/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priorities: loaded.priorities, confidence: loaded.confidence }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(t("error.generic"));
        return (await response.json()) as DecisionReportData;
      })
      .then((report) => setState({ status: "ready", report }))
      .catch((err) => {
        setState({ status: "error", message: err instanceof Error ? err.message : t("error.generic") });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (state.status === "ready") reportRef.current?.focus();
  }, [state.status]);

  const best = state.status === "ready" ? state.report.topMatches[0] : undefined;
  const checklistKey = `realt-ai:checklist:${best?.property.id ?? "none"}`;

  useEffect(() => {
    if (!best) return;
    try {
      const raw = window.localStorage.getItem(checklistKey);
      setChecked(raw ? (JSON.parse(raw) as Record<string, boolean>) : {});
    } catch {
      setChecked({});
    }
  }, [best, checklistKey]);

  const checks = useMemo(() => {
    const tenure = context?.tenure ?? (state.status === "ready" ? state.report.priorities.housingIntent : undefined);
    const base = tenure === "rent" ? RENT_CHECKS : tenure === "buy" ? BUY_CHECKS : [];
    return [...base, ...ALL_CHECKS] as string[];
  }, [context, state]);

  function toggleCheck(key: string) {
    setChecked((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        window.localStorage.setItem(checklistKey, JSON.stringify(next));
      } catch {
        // Storage can be unavailable (private mode); the ticks then last for this visit only.
      }
      return next;
    });
  }

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: tr("title"), url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // The person closed the share sheet; nothing to do.
    }
  }

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
        <p role="alert" className="text-destructive">{state.message}</p>
        <Button variant="outline" className="mt-6" onClick={load}>{t("error.retry")}</Button>
      </div>
    );
  }

  const { report } = state;
  const { priorities } = report;
  const tenure = context?.tenure ?? priorities.housingIntent;
  const matches = report.topMatches;
  const compare = matches.slice(0, 3);
  const confidenceBars = Math.max(1, Math.round(report.confidenceScore / 25));
  const modeLabel = ta(`mode_${priorities.commuteMode}` as never);
  const trLoose = tr as unknown as Translate;
  const bestSplit = best ? splitFactors(best) : { met: [], unmet: [] };
  const bestStrengths = best ? bestSplit.met.slice(0, 3).map((f) => factorLine(best, f, priorities, trLoose, modeLabel)) : [];
  const firstSteps = best ? bestSplit.unmet.slice(0, 2).map((f) => factorLine(best, f, priorities, trLoose, modeLabel)) : [];
  const profileEntries = PROFILE_ORDER.filter((key) => context?.profile?.[key]);
  const doneCount = checks.filter((key) => checked[key]).length;
  const headingKey = best ? "headlineBest" : "headlineNone";
  const generated = new Date(report.generatedAt).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  const kindOf = (m: MatchResult) =>
    m.property.agentKind ?? ((m.property.listingType ?? tenure) === "rent" ? "landlord" : "broker");
  const listingButton = (m: MatchResult) => {
    const kind = kindOf(m);
    const label = m.property.agentName ? tr("agent.toNamed", { name: m.property.agentName }) : tr(`agent.${kind}Cta`);
    return (
      <div>
        {m.property.listingUrl ? (
          <Button asChild variant="outline" className="rounded-full">
            <a href={m.property.listingUrl} target="_blank" rel="noopener noreferrer">{label} →</a>
          </Button>
        ) : (
          <>
            <Button variant="outline" className="rounded-full disabled:opacity-100" disabled>{label} →</Button>
            <p className="mt-2 text-xs text-muted-foreground">{tr("agent.comingSoon")}</p>
          </>
        )}
      </div>
    );
  };
  const nextStepBlock = best ? listingButton(best) : null;
  const factorList = (m: MatchResult, all: boolean) => {
    const split = splitFactors(m);
    const met = all ? split.met : split.met.slice(0, 3);
    const unmet = all ? split.unmet : split.unmet.slice(0, 1);
    return (
      <ul className="space-y-2.5 text-[15px] leading-snug">
        {met.map((f) => (
          <li key={f.category} className="flex gap-2.5">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
            <span>{factorLine(m, f, priorities, trLoose, modeLabel)}</span>
          </li>
        ))}
        {unmet.map((f) => (
          <li key={f.category} className="flex gap-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <span>{factorLine(m, f, priorities, trLoose, modeLabel)}</span>
          </li>
        ))}
      </ul>
    );
  };
  const focused = matches.find((m) => m.property.id === focusedId) ?? null;
  function openAnalysis(id: string | null) {
    setFocusedId(id);
    document.getElementById("homes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const commuteOf = (m: MatchResult) => m.property.commuteMinutesByMode[priorities.commuteMode];

  return (
    <div ref={reportRef} tabIndex={-1} className="outline-none">
      <PrintExpandDetails />

      {/* Top row: the Realt AI wordmark where the site header shows it, plus save and share */}
      <div className="px-4 pt-3 sm:px-6 sm:pt-4">
        <div className="mx-auto flex min-h-14 max-w-6xl flex-wrap items-center justify-between gap-3 px-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/" className="flex shrink-0 items-center" aria-label="Realt AI">
              <Logo className="h-4 sm:h-5" />
            </Link>
            <span className="hidden items-center border-l border-border pl-4 text-sm text-muted-foreground sm:flex">
              {best?.property.agentLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- partner logo from the listing data
                <img
                  src={best.property.agentLogoUrl}
                  alt={best.property.agentName ?? ""}
                  className="h-5 w-auto max-w-[220px] object-contain dark:invert"
                />
              ) : (
                (best?.property.agentName ?? tr("sampleData"))
              )}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <SaveSearchButton priorities={priorities} />
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void share()}>
              <Share2 className="h-4 w-4" aria-hidden="true" />
              {copied ? tr("linkCopied") : tr("share")}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-20 px-4 pb-16 pt-8 sm:px-8 sm:pt-12 print:space-y-10">
        {/* 1. The decision in one minute */}
        <section aria-labelledby="decision-heading">
          <h1 id="decision-heading" className="max-w-4xl text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {tr(headingKey, { title: best?.property.title ?? "", count: firstSteps.length })}
          </h1>
          <div className="mt-4 max-w-3xl space-y-1 text-base text-muted-foreground sm:text-lg">
            <p>{tr("basis1")}</p>
            <p>{tr("basis2", { date: generated })}</p>
            <p>{tr("basis3")}</p>
          </div>

          <div className="mt-10 flex flex-wrap items-stretch gap-6">
            {best && (
              <article className="flex min-w-0 flex-[999_1_560px] flex-wrap overflow-hidden rounded-3xl border border-border">
                <div className="relative min-h-[260px] flex-[1_1_280px] bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- mock illustrations until real listing photos */}
                  <img src={best.property.imageUrl} alt={best.property.title} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="flex flex-[1_1_300px] flex-col gap-4 p-6 sm:p-7">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-foreground px-3 py-1 text-xs font-semibold tracking-wide text-background">{tr("bestMatch")}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">{best.property.title}</h2>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(best.property.price)}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {best.property.address}, {best.property.city}
                    </p>
                  </div>
                  <ul className="space-y-2.5 text-[15px] leading-snug">
                    {bestStrengths.map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                    {firstSteps.slice(0, 1).map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {nextStepBlock}
                  <a href="#homes" className="mt-auto text-[15px] font-semibold underline underline-offset-4 print:hidden">
                    {tr("compareLink")}
                  </a>
                </div>
              </article>
            )}

            <aside className="flex flex-[1_1_280px] flex-col gap-4">
              <div className="overflow-hidden rounded-3xl border border-border">
                <div className="flex items-center gap-5 p-6">
                  <div className="relative h-24 w-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" role="img" aria-label={tr("scoreAria", { score: report.realtScore })}>
                      <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-muted" />
                      <circle
                        cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round"
                        className="stroke-foreground"
                        strokeDasharray={`${(report.realtScore / 100) * 276.5} 276.5`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold tabular-nums">{report.realtScore}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Realt Score</p>
                    <p className="mt-1 text-[15px] leading-snug">{tr(`score.${scoreTier(report.realtScore)}`)}</p>
                  </div>
                </div>
                <div className="border-t border-border bg-secondary/50 px-6 py-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr("confidence")}</p>
                    <div className="flex w-24 gap-1" aria-hidden="true">
                      {[0, 1, 2, 3].map((i) => (
                        <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < confidenceBars ? "bg-foreground" : "bg-muted")} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-snug text-muted-foreground">{tr(`confidenceText.${report.confidenceTier}`)}</p>
                </div>
              </div>

              {firstSteps.length > 0 && (
                <div className="rounded-3xl bg-secondary p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr("doFirst")}</p>
                  <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-snug">
                    {firstSteps.map((item) => <li key={item}>{item}</li>)}
                  </ol>
                </div>
              )}

              <div className="flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-dashed border-border text-muted-foreground">
                <MapIcon className="h-6 w-6" aria-hidden="true" />
                <span className="text-sm font-medium">{tr("map")}</span>
              </div>
            </aside>
          </div>
        </section>

        {/* 2. The homes */}
        <section id="homes" aria-labelledby="homes-heading" className="scroll-mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("homesEyebrow")}</p>
          <h2 id="homes-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{tr("homesHeading", { count: matches.length })}</h2>

          {matches.length === 0 ? (
            <p className="mt-6 text-muted-foreground">{tr("homesEmpty")}</p>
          ) : focused ? (
            <article className="mt-8 overflow-hidden rounded-3xl border-2 border-foreground motion-ok chat-message-in">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-6 py-4">
                <Button variant="ghost" className="rounded-full" onClick={() => openAnalysis(null)}>
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  {tr("back")}
                </Button>
                <span className="rounded-full bg-foreground px-3 py-1 text-xs font-bold text-background">
                  {focused.score} · {tr(`tier.${scoreTier(focused.score)}`)}
                </span>
              </div>
              <div className="flex flex-wrap">
                <div className="relative min-h-[280px] flex-[1_1_320px] bg-secondary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- mock illustrations until real listing photos */}
                  <img src={focused.property.imageUrl} alt={focused.property.title} className="absolute inset-0 h-full w-full object-cover" />
                </div>
                <div className="flex flex-[1_1_420px] flex-col gap-5 p-6 sm:p-8">
                  <div>
                    <h3 className="text-2xl font-semibold">{focused.property.title}</h3>
                    <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{formatPrice(focused.property.price)}</p>
                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {focused.property.address}, {focused.property.city}
                    </p>
                  </div>
                  {factorList(focused, true)}
                  {listingButton(focused)}
                </div>
              </div>
              <div className="border-t border-border p-6 sm:p-8">
                <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr("analysisHeading")}</h4>
                <div className="mt-4 space-y-4">
                  {[...focused.factors].sort((x, y) => y.weight - x.weight).map((f) => (
                    <div key={f.category} className="grid items-center gap-x-4 gap-y-1 [grid-template-columns:8rem_1fr_3rem]">
                      <span className="text-[15px] font-medium">{tr(`cat.${f.category}`)}</span>
                      <span className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full bg-foreground" style={{ width: `${Math.max(0, Math.min(100, f.score))}%` }} />
                      </span>
                      <span className="text-right text-sm tabular-nums text-muted-foreground">{Math.round(f.score)}</span>
                      <span className="text-sm text-muted-foreground [grid-column:2/4]">
                        {factorLine(focused, f, priorities, trLoose, modeLabel)} · {tr("weight", { weight: f.weight })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ) : (
            <div className="mt-8 grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              {matches.map((m, index) => (
                <article
                  key={m.property.id}
                  className={cn("flex flex-col overflow-hidden rounded-3xl border", index === 0 ? "border-2 border-foreground" : "border-border")}
                >
                  <div className="relative aspect-[16/10] bg-secondary">
                    {/* eslint-disable-next-line @next/next/no-img-element -- mock illustrations until real listing photos */}
                    <img src={m.property.imageUrl} alt={m.property.title} loading="lazy" className="h-full w-full object-cover" />
                    <span
                      className={cn(
                        "absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-bold",
                        index === 0 ? "bg-foreground text-background" : "border border-border bg-background text-foreground",
                      )}
                    >
                      {m.score} · {tr(`tier.${scoreTier(m.score)}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => openAnalysis(m.property.id)}
                      className="absolute right-3 top-3 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 text-xs font-semibold text-foreground backdrop-blur transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring print:hidden"
                    >
                      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {tr("fullAnalysis")}
                    </button>
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div>
                      <h3 className="font-semibold">{m.property.title}</h3>
                      <p className="mt-1 text-xl font-bold tracking-tight tabular-nums">{formatPrice(m.property.price)}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                        {m.property.address}, {m.property.city}
                      </p>
                    </div>
                    {factorList(m, false)}
                    {listingButton(m)}
                    <a href="#compare" className="mt-auto text-sm font-semibold underline underline-offset-4 print:hidden">
                      {tr("compareLink")}
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {compare.length > 1 && !focused && (
            <div id="compare" className="mt-8 scroll-mt-8 rounded-3xl border border-border p-6">
              <h3 className="text-lg font-semibold">{tr("compareHeading")}</h3>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th scope="col" className="px-3 py-2.5 font-semibold">{tr("youAskedFor")}</th>
                      {compare.map((m) => <th key={m.property.id} scope="col" className="px-3 py-2.5 font-semibold">{m.property.title}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">{tr("rowBudget", { max: formatPrice(priorities.budgetMax) })}</th>
                      {compare.map((m) => (
                        <td key={m.property.id} className={cn("px-3 py-2.5", m.property.price > priorities.budgetMax && "text-warning")}>
                          {formatPrice(m.property.price)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">{tr("rowBedrooms", { min: priorities.minBedrooms })}</th>
                      {compare.map((m) => (
                        <td key={m.property.id} className={cn("px-3 py-2.5", m.property.bedrooms < priorities.minBedrooms && "text-warning")}>
                          {m.property.bedrooms}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">{tr("rowCommute", { max: priorities.commuteMaxMinutes })}</th>
                      {compare.map((m) => {
                        const minutes = commuteOf(m);
                        return (
                          <td key={m.property.id} className={cn("px-3 py-2.5", minutes !== undefined && minutes > priorities.commuteMaxMinutes && "text-warning")}>
                            {minutes !== undefined ? tr("minutes", { minutes }) : "–"}
                          </td>
                        );
                      })}
                    </tr>
                    <tr className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">{tr("rowSafety")}</th>
                      {compare.map((m) => <td key={m.property.id} className="px-3 py-2.5">{m.property.neighborhoodSafetyScore}/100</td>)}
                    </tr>
                    <tr className="border-t border-border">
                      <th scope="row" className="px-3 py-2.5 text-left font-normal">{tr("rowSchools")}</th>
                      {compare.map((m) => <td key={m.property.id} className="px-3 py-2.5">{m.property.schoolRating}/10</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* 3. What we know about you, and the trade-offs */}
        <section aria-labelledby="you-heading">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("youEyebrow")}</p>
              <h2 id="you-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{tr("youHeading")}</h2>
            </div>
            <Link href="/assistant" className="text-[15px] font-semibold underline underline-offset-4 print:hidden">{tr("changeAnswers")}</Link>
          </div>
          <div className="mt-6 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
            <div className="rounded-2xl bg-secondary p-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{tr("cat.budget")}</p>
              <p className="mt-2 text-[15px]">
                {priorities.budgetMin === Math.round(priorities.budgetMax * 0.7)
                  ? tr("upTo", { max: formatPrice(priorities.budgetMax) })
                  : `${formatPrice(priorities.budgetMin)} – ${formatPrice(priorities.budgetMax)}`}
              </p>
            </div>
            <div className="rounded-2xl bg-secondary p-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{tr("cat.commute")}</p>
              <p className="mt-2 text-[15px]">{tr("commuteValue", { minutes: priorities.commuteMaxMinutes, mode: ta(`mode_${priorities.commuteMode}`) })}</p>
            </div>
            <div className="rounded-2xl bg-secondary p-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{tr("cat.space")}</p>
              <p className="mt-2 text-[15px]">{tr("spaceValue", { bedrooms: priorities.minBedrooms, bathrooms: priorities.minBathrooms })}</p>
            </div>
            {profileEntries.map((key) => (
              <div key={key} className="rounded-2xl bg-secondary p-5">
                <p className="text-xs font-semibold uppercase text-muted-foreground">{ta(`profile_${key}`)}</p>
                <p className="mt-2 text-[15px]">{context?.profile?.[key]}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("weightsEyebrow")}</h3>
          <div className="mt-4 max-w-2xl space-y-3">
            {report.priorityRanking.map((entry) => (
              <div key={entry.category} className="flex items-center gap-4">
                <span className="w-28 text-[15px]">{tr(`cat.${entry.category}`)}</span>
                <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                  <span className="block h-full bg-foreground" style={{ width: `${(entry.importance / 5) * 100}%` }} />
                </span>
                <span className="w-10 text-right text-sm text-muted-foreground">{entry.importance}/5</span>
              </div>
            ))}
          </div>

          {report.conflicts.length > 0 && (
            <>
              <h3 className="mt-14 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("tradeoffsEyebrow")}</h3>
              <p className="mt-2 text-2xl font-semibold tracking-tight">{tr("tradeoffsHeading")}</p>
              <div className="mt-5 space-y-3">
                {report.conflicts.map((conflict, index) => (
                  <details key={conflict.id} open={index === 0} className="rounded-2xl border border-border px-6 py-5">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
                      <span className="text-[17px] font-semibold">{conflict.title}</span>
                      <span className={cn("text-xs font-semibold", conflict.severity === "high" ? "text-warning" : "text-muted-foreground")}>
                        {tr(`severity.${conflict.severity}`)}
                      </span>
                    </summary>
                    <p className="mt-3 max-w-3xl text-[15px] leading-relaxed text-muted-foreground">{conflict.description}</p>
                    <div className="mt-4 grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
                      {conflict.options.map((option) => (
                        <div key={option.label} className="rounded-xl bg-secondary p-4">
                          <p className="text-[15px] font-semibold">{option.label}</p>
                          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{option.description}</p>
                          <p className="mt-2 text-sm leading-relaxed">{option.longTermConsequence}</p>
                        </div>
                      ))}
                    </div>
                  </details>
                ))}
              </div>
            </>
          )}

          <div className="mt-10 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
            <div className="rounded-2xl border border-border p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-success">{tr("appreciate")}</p>
              {report.likelyToAppreciate.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-snug">
                  {report.likelyToAppreciate.map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{tr("appreciateEmpty")}</p>
              )}
            </div>
            <div className="rounded-2xl border border-border p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-warning">{tr("regret")}</p>
              {report.likelyToRegret.length > 0 || report.compromises.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-snug">
                  {[...report.likelyToRegret, ...report.compromises].map((item) => <li key={item}>{item}</li>)}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{tr("regretEmpty")}</p>
              )}
            </div>
          </div>
        </section>

        {/* 4. Before you decide */}
        <section aria-labelledby="check-heading" className="flex flex-wrap items-start gap-8">
          <div className="min-w-0 flex-[999_1_560px]">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{tr("checkEyebrow")}</p>
            <h2 id="check-heading" className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {best ? tr("checkHeadingFor", { title: best.property.title }) : tr("checkHeading")}
            </h2>
            <p className="mt-2 text-[15px] text-muted-foreground">{tr("checkProgress", { done: doneCount, total: checks.length })}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <span className="block h-full bg-foreground transition-all" style={{ width: `${(doneCount / Math.max(1, checks.length)) * 100}%` }} />
            </div>
            <ul className="mt-5 space-y-2">
              {checks.map((key) => (
                <li key={key} className="rounded-2xl border border-border px-4 py-3.5">
                  <label className="flex cursor-pointer items-start gap-3.5 text-[15px] leading-snug">
                    <input
                      type="checkbox"
                      checked={Boolean(checked[key])}
                      onChange={() => toggleCheck(key)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-foreground"
                    />
                    <span className={cn(checked[key] && "text-muted-foreground line-through")}>{ta(key as never)}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <aside className="flex flex-[1_1_300px] flex-col gap-4">
            {report.openQuestions.length > 0 && (
              <div className="rounded-3xl border border-border p-6">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{tr("openQuestions")}</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-snug">
                  {report.openQuestions.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
            <div className="rounded-3xl bg-secondary p-6 print:hidden">
              <h3 className="text-lg font-semibold">{tr("askHeading")}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{tr("askHint")}</p>
              <Button asChild className="mt-4 rounded-full">
                <Link href="/assistant">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {tr("askCta")}
                </Link>
              </Button>
            </div>
          </aside>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-6 border-t border-border pt-10">
          <div>
            <h2 className="text-2xl font-semibold">{tr("nextHeading")}</h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">{tr("nextText")}</p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/assistant">{tr("changeAnswers")}</Link>
            </Button>
            <SaveSearchButton priorities={priorities} />
          </div>
          <p className="w-full text-xs leading-relaxed text-muted-foreground">{tr("disclaimer")}</p>
        </footer>
      </div>
    </div>
  );
}
