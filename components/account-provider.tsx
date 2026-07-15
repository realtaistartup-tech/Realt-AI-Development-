"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface AccountState {
  id: string;
  email: string;
}

type SignInResult = { ok: true } | { ok: false; error: string };

interface AccountContextValue {
  account: AccountState | null;
  isLoading: boolean;
  signIn: (email: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<AccountState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { account: AccountState | null }) => {
        if (!cancelled) setAccount(data.account);
      })
      .catch(() => {
        if (!cancelled) setAccount(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function signIn(email: string): Promise<SignInResult> {
    const response = await fetch("/api/auth/mock-signin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      return { ok: false, error: body?.error ?? "Something went wrong." };
    }

    const data = (await response.json()) as { account: AccountState };
    setAccount(data.account);
    return { ok: true };
  }

  async function signOut(): Promise<void> {
    await fetch("/api/auth/signout", { method: "POST" });
    setAccount(null);
  }

  return (
    <AccountContext.Provider value={{ account, isLoading, signIn, signOut }}>
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
