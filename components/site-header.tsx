import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { LanguageMenu } from "@/components/language-menu";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-3 z-40 px-4 sm:top-4 sm:px-6 print:hidden">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[1fr_auto_1fr] items-center rounded-full border border-border bg-card/90 px-3 shadow-sm backdrop-blur sm:px-5">
        <Link href="/" className="flex shrink-0 items-center justify-self-start">
          <Logo className="h-4 sm:h-5" />
        </Link>
        <nav aria-label={t("nav.primary")} className="justify-self-center">
          <Button asChild size="sm">
            <Link href="/assistant">{t("home.hero.cta")}</Link>
          </Button>
        </nav>
        <div className="justify-self-end">
          <LanguageMenu />
        </div>
      </div>
    </header>
  );
}
