import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { AccountMenu } from "@/components/account-menu";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const t = useTranslations();

  return (
    <header className="sticky top-3 z-40 px-4 sm:top-4 sm:px-6 print:hidden">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border border-border bg-card/90 px-3 shadow-sm backdrop-blur sm:px-5">
        <Link href="/" className="flex shrink-0 items-center">
          <Logo className="h-5 sm:h-6" />
        </Link>
        <nav aria-label={t("nav.primary")} className="flex items-center gap-1 sm:gap-2">
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/assistant">{t("nav.findMyHome")}</Link>
          </Button>
          <AccountMenu />
          <LocaleSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
