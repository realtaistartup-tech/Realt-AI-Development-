import { defineRouting } from "next-intl/routing";

/**
 * English is the default language and gets no URL prefix (realt.ai/assistant);
 * Swedish lives at /sv. The launch market is Sweden, but the product is
 * international, so everyone starts in English and switches with the language
 * menu in the header. Browser-language detection is off on purpose: the
 * default stays English until the visitor chooses otherwise.
 *
 * REMINDER: when Realt AI launches in a new country, add that country's
 * language (for example Norwegian for Norway): add it here, add its message
 * file in messages/, and add it to LANGUAGE_NAMES in components/language-menu.tsx.
 */
export const routing = defineRouting({
  locales: ["en", "sv"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  localeDetection: false,
});

export type AppLocale = (typeof routing.locales)[number];
