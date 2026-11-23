"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { History, LogOut, Settings, User } from "lucide-react";

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

/** Plain circle for now; initials of first + last name come with the extended sign-up. */
export function AccountAvatar({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full border border-border bg-muted ${className}`}
    />
  );
}

export function SidebarAccountMenu() {
  const t = useTranslations("accountMenu");
  const { account, isLoading, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (isLoading) {
    return <div className="h-12" aria-hidden="true" />;
  }

  if (!account) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted"
        >
          <AccountAvatar />
          <span className="font-medium">{t("signIn")}</span>
        </button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("signInTitle")}</DialogTitle>
            <DialogDescription>{t("signInDescription")}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <SignInForm onSuccess={() => setDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const itemClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none";

  return (
    <div ref={rootRef} className="relative">
      {open && (
        <div
          role="menu"
          aria-label={t("menuLabel")}
          className="absolute bottom-full left-0 right-0 z-50 mb-2 rounded-xl border border-border bg-background p-1.5 shadow-lg"
        >
          <div className="flex items-center gap-3 px-3 py-2">
            <AccountAvatar />
            <span className="min-w-0 truncate text-sm font-medium">{account.email}</span>
          </div>
          <div className="my-1 h-px bg-border" />
          <Link href="/profile" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <User className="h-4 w-4" aria-hidden="true" />
            {t("profile")}
          </Link>
          <Link href="/settings" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <Settings className="h-4 w-4" aria-hidden="true" />
            {t("settings")}
          </Link>
          <Link href="/my-searches" role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
            <History className="h-4 w-4" aria-hidden="true" />
            {t("mySearches")}
          </Link>
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            role="menuitem"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            {t("signOut")}
          </button>
        </div>
      )}
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted"
      >
        <AccountAvatar />
        <span className="min-w-0 truncate text-sm font-medium">{account.email}</span>
      </button>
    </div>
  );
}
