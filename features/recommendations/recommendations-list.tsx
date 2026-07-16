"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { loadPriorities } from "@/hooks/use-priorities-store";
import type { MatchResult, PriorityConflict, UserPriorities } from "@/types";
import { ConflictCard } from "./conflict-card";
import { PropertyCard } from "./property-card";
import { SaveSearchButton } from "./save-search-button";

type LoadState =
  | { status: "loading" }
  | { status: "missing-priorities" }
  | { status: "error"; message: string }
  | {
      status: "ready";
      results: MatchResult[];
      conflicts: PriorityConflict[];
      priorities: UserPriorities;
    };

export function RecommendationsList() {
  const t = useTranslations("recommendations");
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const loaded = loadPriorities();
    if (!loaded) {
      setState({ status: "missing-priorities" });
      return;
    }
    const priorities: UserPriorities = loaded;

    let cancelled = false;

    async function fetchRecommendations() {
      try {
        const response = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priorities }),
        });
        if (!response.ok) {
          throw new Error(t("error.generic"));
        }
        const data = (await response.json()) as {
          results: MatchResult[];
          conflicts: PriorityConflict[];
        };
        if (!cancelled) {
          setState({
            status: "ready",
            results: data.results,
            conflicts: data.conflicts,
            priorities,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : t("error.generic"),
          });
        }
      }
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
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
          <Link href="/onboarding">{t("missing.cta")}</Link>
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
      </div>
    );
  }

  const { results, conflicts, priorities } = state;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subheading")}</p>
        </div>
        <SaveSearchButton priorities={priorities} />
      </div>

      {conflicts.length > 0 && (
        <section aria-labelledby="conflicts-heading" className="space-y-3">
          <div>
            <h2 id="conflicts-heading" className="text-sm font-semibold text-foreground">
              {t("conflictsTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("conflictsSubheading")}</p>
          </div>
          <div className="space-y-3">
            {conflicts.map((conflict) => (
              <ConflictCard key={conflict.id} conflict={conflict} />
            ))}
          </div>
        </section>
      )}

      <div className="space-y-4">
        {results.map((result) => (
          <PropertyCard key={result.property.id} result={result} />
        ))}
      </div>
    </div>
  );
}
