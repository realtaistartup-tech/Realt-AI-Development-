import { Home } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <Home className="h-5 w-5 text-primary" aria-hidden="true" />
          {t("common.brand")}
        </Link>
        <nav aria-label={t("nav.primary")} className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/onboarding">{t("nav.findMyHome")}</Link>
          </Button>
          <AccountMenu />
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
