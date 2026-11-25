"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { CHATS_STORAGE_KEY } from "@/features/assistant/assistant-chat";
import { SettingsRow, SettingsSection, SettingsShell } from "@/features/settings/settings-shell";

function segmentClass(active: boolean) {
  return `inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
    active ? "border-foreground bg-foreground text-background" : "border-border hover:bg-muted"
  }`;
}

export function SettingsPage() {
  const t = useTranslations("settings");
  const tl = useTranslations("locale");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [clearStep, setClearStep] = useState<"idle" | "confirm" | "done">("idle");

  useEffect(() => setMounted(true), []);

  const selectedTheme = mounted ? (theme ?? "system") : null;
  const themeOptions = [
    { value: "system", label: t("themeSystem"), icon: Monitor },
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "dark", label: t("themeDark"), icon: Moon },
  ];

  function clearHistory() {
    if (clearStep !== "confirm") {
      setClearStep("confirm");
      return;
    }
    try {
      window.localStorage.removeItem(CHATS_STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing to clear.
    }
    setClearStep("done");
  }

  return (
    <SettingsShell title={t("title")} subtitle={t("subtitle")}>
      <SettingsSection title={t("sectionGeneral")}>
        <SettingsRow title={t("appearance")} description={t("appearanceDescription")}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("appearance")}>
            {themeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-pressed={selectedTheme === option.value}
                onClick={() => setTheme(option.value)}
                className={segmentClass(selectedTheme === option.value)}
              >
                <option.icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </button>
            ))}
          </div>
        </SettingsRow>

        <SettingsRow title={t("language")} description={t("languageDescription")}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={t("language")}>
            {routing.locales.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={locale === value}
                onClick={() => router.replace(pathname, { locale: value as AppLocale })}
                className={segmentClass(locale === value)}
              >
                {tl(value)}
              </button>
            ))}
          </div>
        </SettingsRow>
      </SettingsSection>

      <SettingsSection title={t("sectionData")}>
        <SettingsRow title={t("clearTitle")} description={t("clearDescription")}>
          <button
            type="button"
            onClick={clearHistory}
            disabled={clearStep === "done"}
            className={`rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-60 ${
              clearStep === "confirm"
                ? "border-destructive bg-destructive/10 text-destructive"
                : "border-border hover:bg-muted"
            }`}
          >
            {clearStep === "idle" ? t("clearButton") : clearStep === "confirm" ? t("clearConfirm") : t("clearDone")}
          </button>
        </SettingsRow>
      </SettingsSection>
    </SettingsShell>
  );
}
