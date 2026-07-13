import { Bed, Bath, Ruler, MapPin, CheckCircle2, AlertTriangle, HandCoins, Home } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { MatchResult } from "@/types";
import { MatchScoreBadge } from "./match-score-badge";

interface PropertyCardProps {
  result: MatchResult;
}

export function PropertyCard({ result }: PropertyCardProps) {
  const { property, score, summary, strengths, concerns, compromises, excluded, exclusionReason } = result;

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
            <dt className="sr-only">Price</dt>
            <dd className="font-medium text-foreground">${property.price.toLocaleString()}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Bed className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">Bedrooms</dt>
            <dd>{property.bedrooms} bed</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">Bathrooms</dt>
            <dd>{property.bathrooms} bath</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="h-4 w-4" aria-hidden="true" />
            <dt className="sr-only">Square footage</dt>
            <dd>{property.sqft.toLocaleString()} sqft</dd>
          </div>
        </dl>

        <p className="text-sm text-foreground">{summary}</p>

        {excluded ? (
          <p className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {exclusionReason}
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {strengths.length > 0 && (
              <div>
                <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Why it fits
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
                  Risks
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
                  Compromises
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {compromises.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
