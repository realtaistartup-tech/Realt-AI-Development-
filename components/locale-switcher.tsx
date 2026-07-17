"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations("locale");
  const router = useRouter();
  const pathname = usePathname();

  function handleChange(nextLocale: string) {
    router.replace(pathname, { locale: nextLocale as AppLocale });
  }

  return (
    <Select value={locale} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={t("label")}
        className="h-9 w-11 shrink-0 justify-center gap-0.5 px-0 text-xs sm:w-auto sm:justify-between sm:gap-1.5 sm:px-2.5"
      >
        <Languages className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="hidden sm:inline">
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {routing.locales.map((availableLocale) => (
          <SelectItem key={availableLocale} value={availableLocale}>
            {t(availableLocale)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
