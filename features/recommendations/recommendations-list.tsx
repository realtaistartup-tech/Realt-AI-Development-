"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { loadPriorities } from "@/hooks/use-priorities-store";
import type { MatchResult, PriorityConflict } from "@/types";
import { PropertyCard } from "./property-card";

type LoadState =
  | { status: "loading" }
  | { status: "missing-priorities" }
  | { status: "error"; message: string }
  | { status: "ready"; results: MatchResult[]; conflicts: PriorityConflict[] };

export function RecommendationsList() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const priorities = loadPriorities();
    if (!priorities) {
      setState({ status: "missing-priorities" });
      return;
    }

    let cancelled = false;

    async function fetchRecommendations() {
      try {
        const response = await fetch("/api/ai/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priorities }),
        });
        if (!response.ok) {
          throw new Error("Could not load recommendations. Please try again.");
        }
        const data = (await response.json()) as {
          results: MatchResult[];
          conflicts: PriorityConflict[];
        };
        if (!cancelled) {
          setState({ status: "ready", results: data.results, conflicts: data.conflicts });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Something went wrong.",
          });
        }
      }
    }

    fetchRecommendations();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p>Finding your matches…</p>
      </div>
    );
  }

  if (state.status === "missing-priorities") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="text-xl font-semibold">Let&apos;s start with your priorities first</h1>
        <p className="mt-2 text-muted-foreground">
          We don&apos;t have your priorities yet for this session.
        </p>
        <Button asChild className="mt-6">
          <Link href="/onboarding">Tell us what you&apos;re looking for</Link>
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

  const { results, conflicts } = state;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your matches</h1>
        <p className="mt-2 text-muted-foreground">
          Ranked by how well each property fits the priorities you shared, most to least.
        </p>
      </div>

      {conflicts.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader className="flex-row items-start gap-3 space-y-0">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
            <div className="space-y-1">
              <CardTitle className="text-sm">Worth knowing before you compare</CardTitle>
              {conflicts.map((conflict) => (
                <CardDescription key={conflict.description}>
                  {conflict.description}
                </CardDescription>
              ))}
            </div>
          </CardHeader>
        </Card>
      )}

      <div className="space-y-4">
        {results.map((result) => (
          <PropertyCard key={result.property.id} result={result} />
        ))}
      </div>
    </div>
  );
}
