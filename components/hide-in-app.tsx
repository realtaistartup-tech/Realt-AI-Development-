"use client";

import type { ReactNode } from "react";

import { usePathname } from "@/i18n/navigation";

/** Paths that are "inside the app" (chat, settings, profile) and show no marketing header/footer. */
const APP_PREFIXES = ["/assistant", "/settings", "/profile"];

export function HideInApp({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const inApp = APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (inApp) return null;
  return <>{children}</>;
}
