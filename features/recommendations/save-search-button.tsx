"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { SignInForm } from "@/features/account/sign-in-form";
import type { UserPriorities } from "@/types";

interface SaveSearchButtonProps {
  priorities: UserPriorities;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function SaveSearchButton({ priorities }: SaveSearchButtonProps) {
  const t = useTranslations();
  const { account } = useAccount();
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [dialogOpen, setDialogOpen] = useState(false);

  async function handleSave() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priorities }),
      });
      if (!response.ok) throw new Error("Failed to save");
      setSaveState("saved");
    } catch {
      setSaveState("error");
    }
  }

  if (!account) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
          <Bookmark className="h-4 w-4" aria-hidden="true" />
          {t("saveSearch.signInPrompt")}
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("account.dialog.title")}</DialogTitle>
            <DialogDescription>{t("account.dialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <SignInForm onSuccess={() => setDialogOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (saveState === "saved") {
    return (
      <Button variant="outline" size="sm" disabled>
        <BookmarkCheck className="h-4 w-4 text-success" aria-hidden="true" />
        {t("saveSearch.saved")}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={handleSave} disabled={saveState === "saving"}>
        {saveState === "saving" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Bookmark className="h-4 w-4" aria-hidden="true" />
        )}
        {t("saveSearch.save")}
      </Button>
      {saveState === "error" && (
        <p role="alert" className="text-sm text-destructive">
          {t("saveSearch.error")}
        </p>
      )}
    </div>
  );
}
