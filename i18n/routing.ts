import { defineRouting } from "next-intl/routing";

/**
 * Sweden is the initial market, so Swedish is the default locale and gets
 * no URL prefix (realt.ai/onboarding). English is available at /en for
 * early expansion. Adding a future locale is: add it here, add its message
 * file in messages/, done — no routing or component changes required.
 */
export const routing = defineRouting({
  locales: ["sv", "en"],
  defaultLocale: "sv",
  localePrefix: "as-needed",
});

export type AppLocale = (typeof routing.locales)[number];
