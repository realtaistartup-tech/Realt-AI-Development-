import { ArrowRight, Compass, Scale, ListChecks, MessageSquareText, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const FRAMEWORK_STEPS = [
  { key: "understand", icon: MessageSquareText },
  { key: "tradeoffs", icon: Scale },
  { key: "match", icon: ListChecks },
  { key: "decide", icon: Compass },
] as const;

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col">
      <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-24 text-center sm:px-6 sm:py-32">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {t("badge")}
        </span>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          {t("heading")}
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground text-balance">
          {t("subheading")}
        </p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="/assistant">
              {t("ctaPrimary")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="border-t border-border bg-secondary/40"
      >
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="how-it-works-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
              {t("howItWorks.heading")}
            </h2>
            <p className="mt-3 text-muted-foreground">{t("howItWorks.subheading")}</p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FRAMEWORK_STEPS.map((step, index) => (
              <Card key={step.key} className="text-left">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-foreground">
                      {index + 1}
                    </span>
                    <step.icon className="h-5 w-5 text-foreground" aria-hidden="true" />
                  </div>
                  <CardTitle className="mt-3 text-base">
                    {t(`howItWorks.steps.${step.key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{t(`howItWorks.steps.${step.key}.description`)}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("finalCta.heading")}
        </h2>
        <p className="mt-3 text-muted-foreground">{t("finalCta.subheading")}</p>
        <Button asChild size="lg" className="mt-8">
          <Link href="/assistant">
            {t("finalCta.button")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
