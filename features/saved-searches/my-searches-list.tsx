"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, Trash2 } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { useRouter, Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { savePriorities } from "@/hooks/use-priorities-store";
import { SignInForm } from "@/features/account/sign-in-form";
import type { SavedSearch } from "@/types";

type LoadState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; searches: SavedSearch[] };

export function MySearchesList() {
  const t = useTranslations("mySearches");
  const locale = useLocale();
  const router = useRouter();
  const { account, isLoading: isAccountLoading } = useAccount();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const loadSearches = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const response = await fetch("/api/saved-searches");
      if (!response.ok) throw new Error("Failed to load");
      const data = (await response.json()) as { savedSearches: SavedSearch[] };
      setState({ status: "ready", searches: data.savedSearches });
    } catch {
      setState({ status: "error" });
    }
  }, []);

  useEffect(() => {
  if (!account) return;

  const timer = setTimeout(loadSearches, 0);
  return () => clearTimeout(timer);
}, [account, loadSearches]);

  function handleViewMatches(search: SavedSearch) {
    savePriorities(search.priorities);
    router.push("/recommendations");
  }

  async function handleDelete(id: string) {
    const response = await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    if (response.ok) {
      setState((prev) =>
        prev.status === "ready"
          ? { status: "ready", searches: prev.searches.filter((s) => s.id !== id) }
          : prev,
      );
    }
  }

  if (isAccountLoading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="mx-auto max-w-sm py-24 text-center">
        <h1 className="text-xl font-semibold">{t("signInRequired.heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("signInRequired.description")}</p>
        <div className="mt-6">
          <SignInForm />
        </div>
      </div>
    );
  }

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
        <p>{t("loading")}</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <p role="alert" className="text-destructive">
          {t("error")}
        </p>
      </div>
    );
  }

  if (state.searches.length === 0) {
    return (
      <div className="mx-auto max-w-sm py-24 text-center">
        <h1 className="text-xl font-semibold">{t("empty.heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("empty.description")}</p>
        <Button asChild className="mt-6">
          <Link href="/onboarding">{t("empty.cta")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-16 sm:px-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subheading")}</p>
      </div>

      <div className="space-y-4">
        {state.searches.map((search) => (
          <Card key={search.id}>
            <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">
                  {formatPrice(search.priorities.budgetMin)} –{" "}
                  {formatPrice(search.priorities.budgetMax)}
                </CardTitle>
                <CardDescription>
                  {t("savedOn", {
                    date: new Date(search.createdAt).toLocaleDateString(locale),
                  })}
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDelete(search.id)}
                aria-label={t("delete")}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" onClick={() => handleViewMatches(search)}>
                {t("viewMatches")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
