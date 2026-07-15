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
      <SelectTrigger aria-label={t("label")} className="h-9 w-auto gap-1.5 px-2.5 text-xs">
        <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        <SelectValue />
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
