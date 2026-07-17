import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>{t("tagline")}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/privacy" className="underline-offset-4 hover:underline">
            {t("privacyLink")}
          </Link>
          <Link href="/terms" className="underline-offset-4 hover:underline">
            {t("termsLink")}
          </Link>
        </div>
        <p className="mt-3">{t("copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
