import type { MetadataRoute } from "next";

import { routing } from "@/i18n/routing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://realt.ai";
const PATH_PRIORITY: Record<string, number> = {
  "/": 1,
  "/onboarding": 0.8,
  "/privacy": 0.3,
  "/terms": 0.3,
};

function localizedPath(locale: string, path: string): string {
  if (locale === routing.defaultLocale) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return Object.entries(PATH_PRIORITY).flatMap(([path, priority]) =>
    routing.locales.map((locale) => ({
      url: `${SITE_URL}${localizedPath(locale, path)}`,
      changeFrequency: "monthly" as const,
      priority,
    })),
  );
}
