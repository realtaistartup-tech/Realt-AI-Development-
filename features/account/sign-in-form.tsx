"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";

import { useAccount } from "@/components/account-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OAUTH_PROVIDERS } from "@/lib/auth-providers";
import { AppleIcon, GoogleIcon, MicrosoftIcon } from "./oauth-icons";

const MIN_PASSWORD_LENGTH = 8;

type Mode = "signIn" | "signUp" | "forgotPassword";

interface SignInFormProps {
  onSuccess?: () => void;
  /** Show every provider button, even ones not configured yet (they explain that when clicked). */
  showAllProviders?: boolean;
  /** Start in sign-up mode instead of sign-in. */
  initialMode?: "signIn" | "signUp";
}

export function SignInForm({ onSuccess, showAllProviders = false, initialMode = "signIn" }: SignInFormProps) {
  const t = useTranslations("account.dialog");
  const { authConfigured, signInWithPassword, signUp, signInWithOAuth, resetPassword } = useAccount();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthPending, setOauthPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const enabledProviders = showAllProviders ? OAUTH_PROVIDERS : OAUTH_PROVIDERS.filter((provider) => provider.enabled);

  if (!authConfigured) {
    return (
      <p className="rounded-lg border border-warning/40 bg-warning/5 p-4 text-sm text-muted-foreground">
        {t("notConfigured")}
      </p>
    );
  }

  async function handleOAuthClick(providerId: (typeof enabledProviders)[number]["id"]) {
    setError(null);
    if (!OAUTH_PROVIDERS.find((provider) => provider.id === providerId)?.enabled) {
      setError(t("providerUnavailable"));
      return;
    }
    setOauthPending(providerId);
    const result = await signInWithOAuth(providerId);
    if (!result.ok) {
      setError(result.error);
      setOauthPending(null);
    }
    // On success the browser navigates away — nothing else to do here.
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "forgotPassword") {
      setIsSubmitting(true);
      const result = await resetPassword(email);
      setIsSubmitting(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setResetSent(true);
      return;
    }

    if (mode === "signUp" && password.length < MIN_PASSWORD_LENGTH) {
      setError(t("passwordTooShort", { min: MIN_PASSWORD_LENGTH }));
      return;
    }

    if (mode === "signUp") {
      if (firstName.trim().length === 0 || lastName.trim().length === 0) {
        setError(t("namesRequired"));
        return;
      }
      if (!ageConfirmed) {
        setError(t("ageRequired"));
        return;
      }
    }

    setIsSubmitting(true);
    const result =
      mode === "signUp"
        ? await signUp(email, password, {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            displayName: displayName.trim() || firstName.trim(),
          })
        : await signInWithPassword(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSuccess?.();
  }

  if (mode === "forgotPassword" && resetSent) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-foreground">{t("resetSent", { email })}</p>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setMode("signIn");
            setResetSent(false);
          }}
        >
          {t("backToSignIn")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {mode !== "forgotPassword" && enabledProviders.length > 0 && (
        <>
          <div className="space-y-2">
            {enabledProviders.map((provider) => (
              <Button
                key={provider.id}
                type="button"
                variant="outline"
                className="w-full"
                disabled={oauthPending !== null}
                onClick={() => void handleOAuthClick(provider.id)}
              >
                {oauthPending === provider.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : provider.labelKey === "google" ? (
                  <GoogleIcon className="h-4 w-4" />
                ) : provider.labelKey === "apple" ? (
                  <AppleIcon className="h-4 w-4" />
                ) : (
                  <MicrosoftIcon className="h-4 w-4" />
                )}
                {t(`continueWith.${provider.labelKey}`)}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-3" role="presentation">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{t("orDivider")}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signUp" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="sign-up-first-name">{t("firstNameLabel")}</Label>
                <Input
                  id="sign-up-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sign-up-last-name">{t("lastNameLabel")}</Label>
                <Input
                  id="sign-up-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sign-up-display-name">{t("displayNameLabel")}</Label>
              <Input
                id="sign-up-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder={firstName.trim() || t("displayNamePlaceholder")}
                autoComplete="nickname"
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="sign-in-email">{t("emailLabel")}</Label>
          <Input
            id="sign-in-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t("emailPlaceholder")}
            required
            autoFocus={mode !== "signUp"}
          />
        </div>

        {mode !== "forgotPassword" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="sign-in-password">{t("passwordLabel")}</Label>
              {mode === "signIn" && (
                <button
                  type="button"
                  className="text-xs font-medium text-foreground underline-offset-4 hover:underline"
                  onClick={() => {
                    setError(null);
                    setMode("forgotPassword");
                  }}
                >
                  {t("forgotPassword")}
                </button>
              )}
            </div>
            <Input
              id="sign-in-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("passwordPlaceholder")}
              autoComplete={mode === "signUp" ? "new-password" : "current-password"}
              required
              minLength={mode === "signUp" ? MIN_PASSWORD_LENGTH : undefined}
            />
          </div>
        )}

        {mode === "signUp" && (
          <label className="flex cursor-pointer items-start gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(event) => setAgeConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
            />
            <span>{t("ageConfirm")}</span>
          </label>
        )}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          type="submit"
          disabled={
            isSubmitting || email.trim().length === 0 || (mode !== "forgotPassword" && password.length === 0)
          }
          className="w-full"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t(mode === "signUp" ? "creatingAccount" : mode === "forgotPassword" ? "sendingReset" : "signingIn")}
            </>
          ) : (
            t(mode === "signUp" ? "createAccount" : mode === "forgotPassword" ? "sendResetLink" : "signIn")
          )}
        </Button>
      </form>

      {mode === "forgotPassword" ? (
        <button
          type="button"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setError(null);
            setMode("signIn");
          }}
        >
          {t("backToSignIn")}
        </button>
      ) : (
        <button
          type="button"
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setError(null);
            setMode(mode === "signIn" ? "signUp" : "signIn");
          }}
        >
          {t(mode === "signIn" ? "toggleToSignUp" : "toggleToSignIn")}
        </button>
      )}
    </div>
  );
}
