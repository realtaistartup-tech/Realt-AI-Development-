"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useLocale } from "next-intl";

import { isAuthConfigured } from "@/lib/supabase/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { SupabaseOAuthProvider } from "@/lib/auth-providers";
import { routing } from "@/i18n/routing";

interface AccountState {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  /** What the person wants Realt AI to call them (falls back to first name). */
  displayName: string | null;
}

export interface SignUpProfile {
  firstName: string;
  lastName: string;
  displayName: string;
}

function markWelcome(kind: "signIn" | "signUp") {
  try {
    window.sessionStorage.setItem("realtai.welcome", kind);
  } catch {
    // Storage can be unavailable; the welcome screen is just skipped then.
  }
}

type AuthResult = { ok: true } | { ok: false; error: string };

interface AccountContextValue {
  account: AccountState | null;
  isLoading: boolean;
  /** Whether real Supabase Auth is configured at all (public env vars set). */
  authConfigured: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signUp: (email: string, password: string, profile?: SignUpProfile) => Promise<AuthResult>;
  signInWithOAuth: (provider: SupabaseOAuthProvider) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  updatePassword: (newPassword: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

function callbackUrl(next: string): string {
  return `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(next)}`;
}

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const authConfigured = isAuthConfigured();
  const locale = useLocale();

  const refreshAccount = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me");
      const data = (await response.json()) as { account: AccountState | null };
      setAccount(data.account);
    } catch {
      setAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void refreshAccount();

    if (!authConfigured) return;

    // Keep our resolved account in sync with the Supabase client's own
    // session lifecycle (sign-in, sign-out, token refresh, and — crucially
    // — completing an OAuth redirect) rather than only resolving once on
    // mount. The resolution itself always goes back through /api/auth/me
    // (see refreshAccount) since that's what maps a Supabase Auth user to
    // this app's own `accounts.id` — the client never tries to derive that
    // mapping itself.
    const supabase = getSupabaseBrowserClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      if (!cancelled) void refreshAccount();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [authConfigured, refreshAccount]);

  async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
    if (!authConfigured) return { ok: false, error: "Sign-in is not configured yet." };
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { ok: false, error: error.message };
    markWelcome("signIn");
    await refreshAccount();
    return { ok: true };
  }

  async function signUp(email: string, password: string, profile?: SignUpProfile): Promise<AuthResult> {
    if (!authConfigured) return { ok: false, error: "Sign-up is not configured yet." };
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl(window.location.pathname),
        data: profile
          ? {
              first_name: profile.firstName,
              last_name: profile.lastName,
              display_name: profile.displayName || profile.firstName,
            }
          : undefined,
      },
    });
    if (error) return { ok: false, error: error.message };
    markWelcome("signUp");
    await refreshAccount();
    return { ok: true };
  }

  async function signInWithOAuth(provider: SupabaseOAuthProvider): Promise<AuthResult> {
    if (!authConfigured) return { ok: false, error: "Sign-in is not configured yet." };
    const supabase = getSupabaseBrowserClient();
    markWelcome("signIn");
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(window.location.pathname) },
    });
    // On success the browser is about to navigate away to the provider —
    // there's nothing further to update locally.
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function resetPassword(email: string): Promise<AuthResult> {
    if (!authConfigured) return { ok: false, error: "Password reset is not configured yet." };
    const supabase = getSupabaseBrowserClient();
    const resetPath =
      locale === routing.defaultLocale ? "/auth/reset-password" : `/${locale}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: callbackUrl(resetPath),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function updatePassword(newPassword: string): Promise<AuthResult> {
    if (!authConfigured) return { ok: false, error: "Password reset is not configured yet." };
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }

  async function signOut(): Promise<void> {
    if (authConfigured) {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
    }
    await fetch("/api/auth/signout", { method: "POST" });
    setAccount(null);
  }

  return (
    <AccountContext.Provider
      value={{
        account,
        isLoading,
        authConfigured,
        signInWithPassword,
        signUp,
        signInWithOAuth,
        resetPassword,
        updatePassword,
        signOut,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error("useAccount must be used within an AccountProvider");
  }
  return context;
}
