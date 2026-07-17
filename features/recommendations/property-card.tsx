import { CheckCircle2, AlertTriangle, ChevronRight, ExternalLink, HandCoins, MapPin, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { parseAddress } from "@/lib/address";
import { formatPrice } from "@/lib/format";
import type { MatchResult } from "@/types";
import { MatchBreakdown } from "./match-breakdown";
import { MatchScoreBadge } from "./match-score-badge";

interface PropertyCardProps {
  result: MatchResult;
}

/**
 * A suggested match in the Realt Decision Report: a premium, compact card
 * (image, address, price, Realt Score, one-line reason) that expands on
 * click into the full reasoning behind the score — never the reverse.
 * CLAUDE.md's Match Score section requires the score to be explainable, so
 * the detailed breakdown that used to be always-on stays fully present,
 * just tucked behind one disclosure instead of dominating a compact list.
 *
 * The "view original listing" affordance is intentionally inert — no real
 * listing exists yet (see CLAUDE.md-driven decision to stay on mock data).
 * It's a plain badge, not a dead link or a fake button, so it's honest
 * about not being clickable yet while already occupying the exact spot a
 * real Hemnet/Booli/broker URL will take over later.
 */
export function PropertyCard({ result }: PropertyCardProps) {
  const t = useTranslations("propertyCard");
  const { property, score, summary, strengths, concerns, criticalConcerns, compromises, factors } =
    result;
  const { street, houseNumber } = parseAddress(property.address);

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <details className="group">
        <summary className="block cursor-pointer list-none marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background [&::-webkit-details-marker]:hidden">
          <div className="aspect-[16/9] w-full overflow-hidden bg-secondary">
            {/* eslint-disable-next-line @next/next/no-img-element -- mock SVG illustrations, not an optimizable remote photo set yet */}
            <img
              src={property.imageUrl}
              alt={property.title}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </div>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{property.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {street} {houseNumber}, {property.city}
                </p>
              </div>
              <MatchScoreBadge score={score} className="shrink-0" />
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-foreground">{formatPrice(property.price)}</p>
              <span
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground print:hidden"
                title={t("originalListingTooltip")}
              >
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                {t("viewOriginalListing")}
              </span>
            </div>

            <p className="text-sm text-foreground">{summary}</p>

            <p className="flex items-center gap-1 text-xs font-medium text-primary print:hidden">
              <ChevronRight
                className="h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
                aria-hidden="true"
              />
              {t("seeFullAnalysis")}
            </p>
          </CardContent>
        </summary>

        <CardContent className="space-y-5 border-t border-border pt-5">
          {criticalConcerns.length > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3">
              <ShieldAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-destructive">
                  {t("criticalConcern")}
                </p>
                <ul className="mt-1 space-y-1 text-sm text-foreground">
                  {criticalConcerns.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            {strengths.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("whyItFits")}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {strengths.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {concerns.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("risks")}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {concerns.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {compromises.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
                  <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
                  {t("compromises")}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {compromises.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <MatchBreakdown factors={factors} />
        </CardContent>
      </details>
    </Card>
  );
}
