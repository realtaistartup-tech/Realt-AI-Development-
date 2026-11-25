"use client";

import { useTranslations } from "next-intl";

import { useAccount } from "@/components/account-provider";
import { Button } from "@/components/ui/button";
import { AccountAvatar } from "@/features/assistant/sidebar-account-menu";
import { SettingsRow, SettingsSection, SettingsShell } from "@/features/settings/settings-shell";

export function ProfilePage() {
  const t = useTranslations("profile");
  const { account, isLoading, signOut } = useAccount();

  const fullName = [account?.firstName, account?.lastName].filter(Boolean).join(" ") || "—";

  return (
    <SettingsShell title={t("title")} subtitle={t("subtitle")}>
      {!isLoading && !account && <p className="text-sm text-muted-foreground">{t("signedOut")}</p>}

      {account && (
        <>
          <div className="mb-8 flex items-center gap-4">
            <AccountAvatar className="h-16 w-16 text-2xl" />
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{account.displayName ?? fullName}</p>
              <p className="truncate text-sm text-muted-foreground">{account.email}</p>
            </div>
          </div>

          <SettingsSection title={t("sectionDetails")}>
            <SettingsRow title={t("name")} description={t("nameDescription")}>
              {fullName}
            </SettingsRow>
            <SettingsRow title={t("displayName")} description={t("displayNameDescription")}>
              {account.displayName ?? "—"}
            </SettingsRow>
            <SettingsRow title={t("email")} description={t("emailDescription")}>
              {account.email}
            </SettingsRow>
            <SettingsRow title={t("plan")} description={t("planDescription")}>
              {t("planValue")}
            </SettingsRow>
          </SettingsSection>

          <div className="mt-8">
            <Button variant="outline" onClick={() => void signOut()}>
              {t("signOut")}
            </Button>
          </div>
        </>
      )}
    </SettingsShell>
  );
}
