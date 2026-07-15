import { useTranslations } from "next-intl";

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-muted-foreground sm:px-6">
        <p>{t("tagline")}</p>
        <p className="mt-1">{t("copyright", { year: new Date().getFullYear() })}</p>
      </div>
    </footer>
  );
}
