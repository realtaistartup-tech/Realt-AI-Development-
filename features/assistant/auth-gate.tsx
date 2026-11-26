"use client";

import { useTranslations } from "next-intl";

import { useAccount } from "@/components/account-provider";
import { Logo } from "@/components/logo";
import { Link } from "@/i18n/navigation";
import { SignInForm } from "@/features/account/sign-in-form";

/**
 * Spotlight shown over the assistant page while the visitor is signed out:
 * the page is dimmed and blurred, a centered card asks them to sign in or
 * create an account (email, Google, Apple or Microsoft). It disappears by
 * itself as soon as the account state reports a signed-in user.
 */
export function AssistantAuthGate() {
  const t = useTranslations("assistant.gate");
  const { account, isLoading } = useAccount();

  if (isLoading || account) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-gate-title"
    >
      <div className="my-auto w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-2xl">
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <Logo className="h-5" />
          <div className="space-y-1">
            <h2 id="assistant-gate-title" className="text-lg font-semibold tracking-tight">
              {t("title")}
            </h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
        <SignInForm showAllProviders />
        <div className="mt-4 border-t border-border pt-4 text-center">
          <Link href="/" className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {t("back")}
          </Link>
        </div>
      </div>
    </div>
  );
}
