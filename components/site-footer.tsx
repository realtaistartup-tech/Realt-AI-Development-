import { Instagram, Mail, Music2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/logo";
import { CONTACT_EMAIL, SOCIAL_LINKS } from "@/lib/site";

const SOCIAL_ICONS = { instagram: Instagram, tiktok: Music2 } as const;

export function SiteFooter() {
  const t = useTranslations("footer");

  return (
    <footer className="border-t border-border print:hidden">
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm sm:px-6">
        <div className="grid gap-10 sm:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-flex">
              <Logo className="h-5" />
            </Link>
            <p className="mt-4 max-w-xs text-muted-foreground">
              {t("tagline")}
            </p>
          </div>

          <div>
            <h2 className="font-semibold">{t("contactHeading")}</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
                >
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h2 className="font-semibold">{t("followHeading")}</h2>
            <ul className="mt-4 space-y-3 text-muted-foreground">
              {SOCIAL_LINKS.map(({ key, handle, href }) => {
                const Icon = SOCIAL_ICONS[key];

                return (
                  <li key={key}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 underline-offset-4 hover:text-foreground hover:underline"
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {t(key)} <span className="text-muted-foreground">{handle}</span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-muted-foreground">
          <p>
            {t("copyright", { year: new Date().getFullYear() })}
          </p>

          <div className="flex flex-wrap gap-4">
            <Link
              href="/privacy"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("privacyLink")}
            </Link>

            <Link
              href="/terms"
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {t("termsLink")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}