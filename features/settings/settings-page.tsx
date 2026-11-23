"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { ArrowLeft, Monitor, Moon, Sun } from "lucide-react";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";

const THEMES = [
  { value: "light", Icon: Sun },
  { value: "dark", Icon: Moon },
  { value: "system", Icon: Monitor },
] as const;

function optionClass(active: boolean) {
  return `flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition-colors ${
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border hover:bg-muted"
  }`;
}

export function SettingsPage() {
  const t = useTranslations("settings");
  const tt = useTranslations("theme");
  const tl = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const currentTheme = mounted ? (theme ?? "system") : null;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <Link
        href="/assistant"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("back")}
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-base font-semibold">{t("appearance")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("appearanceDescription")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {THEMES.map(({ value, Icon }) => (
            <button
              key={value}
              type="button"
              aria-pressed={currentTheme === value}
              onClick={() => setTheme(value)}
              className={optionClass(currentTheme === value)}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {tt(value)}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8 border-t border-border pt-6">
        <h2 className="text-base font-semibold">{t("language")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("languageDescription")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {routing.locales.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={locale === value}
              onClick={() => router.replace(pathname, { locale: value as AppLocale })}
              className={optionClass(locale === value)}
            >
              {tl(value)}
            </button>
          ))}
        </div>
      </section>

      <p className="mt-10 text-sm text-muted-foreground">{t("moreSoon")}</p>
    </main>
  );
}
