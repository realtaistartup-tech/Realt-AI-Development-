"use client";

import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { AccountAvatar } from "@/features/assistant/sidebar-account-menu";

export function ProfilePage() {
  const t = useTranslations("profile");
  const { account, isLoading, signOut } = useAccount();

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

      {!isLoading && !account && (
        <p className="mt-6 text-sm text-muted-foreground">{t("signedOut")}</p>
      )}

      {account && (
        <>
          <div className="mt-8 flex items-center gap-4 border-t border-border pt-6">
            <AccountAvatar className="h-14 w-14" />
            <div className="min-w-0">
              <p className="text-sm text-muted-foreground">{t("email")}</p>
              <p className="truncate text-base font-medium">{account.email}</p>
            </div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">{t("nameSoon")}</p>
          <Button variant="outline" className="mt-8" onClick={() => void signOut()}>
            {t("signOut")}
          </Button>
        </>
      )}
    </main>
  );
}
