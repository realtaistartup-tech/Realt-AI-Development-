import {
  Bed,
  Bath,
  Ruler,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  HandCoins,
  Home,
  ShieldAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatArea, formatPrice } from "@/lib/format";
import type { MatchResult } from "@/types";
import { MatchBreakdown } from "./match-breakdown";
import { MatchScoreBadge } from "./match-score-badge";

interface PropertyCardProps {
  result: MatchResult;
}

export function PropertyCard({ result }: PropertyCardProps) {
  const t = useTranslations("propertyCard");
  const {
    property,
    score,
    summary,
    strengths,
    concerns,
    criticalConcerns,
    compromises,
    factors,
    excluded,
    exclusionReason,
  } = result;

  return (
    <Card className={excluded ? "opacity-60" : undefined}>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="flex gap-4">
          <div
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground"
            aria-hidden="true"
          >
            <Home className="h-6 w-6" />
          </div>
          <div>
            <CardTitle>{property.title}</CardTitle>
            <CardDescription className="mt-1 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              {property.address}, {property.city}
            </CardDescription>
          </div>
        </div>
        <MatchScoreBadge score={score} className="shrink-0" />
      </CardHeader>
      <CardContent className="space-y-5">
        <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">{t("price")}</dt>
            <dd className="font-medium text-foreground">{formatPrice(property.price)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Bed className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">{t("bedroomsSr")}</dt>
            <dd>
              {property.bedrooms} {t("bed")}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">{t("bathroomsSr")}</dt>
            <dd>
              {property.bathrooms} {t("bath")}
            </dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">{t("areaSr")}</dt>
            <dd>{formatArea(property.areaSqm)}</dd>
          </div>
        </dl>

        <p className="text-sm text-foreground">{summary}</p>

        {excluded ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {exclusionReason}
          </p>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
