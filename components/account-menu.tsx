"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { User } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignInForm } from "@/features/account/sign-in-form";

export function AccountMenu() {
  const t = useTranslations("account");
  const { account, isLoading, signOut } = useAccount();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return <div className="h-9 w-20" aria-hidden="true" />;
  }

  if (!account) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Button variant="ghost" size="sm" onClick={() => setDialogOpen(true)}>
          {t("signIn")}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialog.title")}</DialogTitle>
            <DialogDescription>{t("dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <SignInForm onSuccess={() => setDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm">
        <Link href="/my-searches">{t("mySearches")}</Link>
      </Button>
      <span className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
        <User className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="max-w-[12ch] truncate">{account.email}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={() => void signOut()}>
        {t("signOut")}
      </Button>
    </div>
  );
}
