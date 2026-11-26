import { ArrowRight, Mail } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/site";
import { Countdown } from "@/features/home/countdown";
import { HeroCarousel } from "@/features/home/hero-carousel";
import { GetStartedSteps } from "@/features/home/get-started-steps";
import { HowItWorks } from "@/features/home/how-it-works";
import { KeyFeatures } from "@/features/home/key-features";

export default function Home() {
  const t = useTranslations("home");

  return (
    <div className="flex flex-col">
      <section className="mx-auto grid min-h-[calc(100svh-5rem)] max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="text-left">
          <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            {t("hero.heading")}
          </h1>
          <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
            <p>{t("hero.paragraph1")}</p>
            <p>{t("hero.paragraph2")}</p>
          </div>
          <div className="mt-10">
            <Button asChild size="lg">
              <Link href="/assistant">
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>
        <HeroCarousel />
      </section>

      <section id="about" aria-labelledby="about-heading" className="scroll-mt-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-stretch">
          <div>
            <h2 id="about-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t("about.heading")}
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
              <p>{t("about.p1")}</p>
              <p>{t("about.p2")}</p>
              <p>{t("about.p3")}</p>
              <p>{t("about.p4")}</p>
              <p>{t("about.p5")}</p>
            </div>
            <p className="mt-6 text-lg font-semibold">{t("about.tagline")}</p>
          </div>
          <Countdown />
        </div>
      </section>

      <HowItWorks />

      <KeyFeatures />

      <section aria-labelledby="final-cta-heading">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
          <div className="text-left">
            <h2 id="final-cta-heading" className="text-4xl font-bold tracking-tight text-balance sm:text-5xl">
              {t("finalCta.heading")}
            </h2>
            <div className="mt-6 space-y-4 text-lg leading-relaxed text-muted-foreground">
              <p>{t("finalCta.paragraph1")}</p>
              <p>{t("finalCta.paragraph2")}</p>
            </div>
            <div className="mt-10">
              <Button asChild size="lg">
                <Link href="/assistant">
                  {t("finalCta.button")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
          <GetStartedSteps />
        </div>
      </section>

      <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 id="contact-heading" className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("contact.heading")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">{t("contact.description")}</p>
          <Button asChild size="lg" variant="outline" className="mt-8">
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(t("contact.subject"))}`}>
              <Mail className="h-4 w-4" aria-hidden="true" />
              {CONTACT_EMAIL}
            </a>
          </Button>
          <p className="mx-auto mt-8 max-w-2xl text-sm text-muted-foreground">{t("contact.business")}</p>
        </div>
      </section>
    </div>
  );
}
