"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2 } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Lands here after clicking a real Supabase password-recovery email link,
 * which (via app/api/auth/callback) already exchanged the recovery code
 * for a short-lived elevated session — that's what lets updatePassword()
 * succeed without asking for the old password.
 */
export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const { authConfigured, updatePassword } = useAccount();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("passwordsDontMatch"));
      return;
    }

    setIsSubmitting(true);
    const result = await updatePassword(password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  }

  if (!authConfigured) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("notConfigured")}</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-24 text-center sm:px-6">
        <CheckCircle2 className="mx-auto h-8 w-8 text-success" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">{t("successHeading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("successDescription")}</p>
        <Button asChild className="mt-6">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-24 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="mt-2 text-muted-foreground">{t("subheading")}</p>
      </div>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">{t("newPasswordLabel")}</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t("confirmPasswordLabel")}</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("submitting")}
            </>
          ) : (
            t("submit")
          )}
        </Button>
      </form>
    </div>
  );
}
