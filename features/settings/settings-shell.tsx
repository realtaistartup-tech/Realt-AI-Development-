"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Settings, User } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

/** Settings layout: navigation on the left, content on the right (like ChatGPT's settings). */
export function SettingsShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const t = useTranslations("settings");
  const pathname = usePathname();

  const groups = [
    { label: t("nav.account"), items: [{ href: "/profile", label: t("nav.profile"), icon: User }] },
    { label: t("nav.app"), items: [{ href: "/settings", label: t("nav.general"), icon: Settings }] },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground md:flex">
      <aside className="border-b border-border p-4 md:min-h-screen md:w-64 md:shrink-0 md:border-b-0 md:border-r">
        <Link
          href="/assistant"
          className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t("nav.backToApp")}
        </Link>
        <nav className="mt-4 space-y-5" aria-label={t("title")}>
          {groups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">{group.label}</p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-muted ${
                          active ? "bg-muted font-medium" : ""
                        }`}
                      >
                        <item.icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-10 md:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-8 first:mt-0">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3 border-t border-border">{children}</div>
    </section>
  );
}

export function SettingsRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children !== undefined && <div className="shrink-0 text-sm">{children}</div>}
    </div>
  );
}
