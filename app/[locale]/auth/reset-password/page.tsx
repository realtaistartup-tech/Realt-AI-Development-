import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { ResetPasswordForm } from "@/features/account/reset-password-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "resetPassword" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function ResetPasswordPage() {
  return <ResetPasswordForm />;
}
