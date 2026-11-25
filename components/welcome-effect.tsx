"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useAccount } from "@/components/account-provider";

/** Set by the account provider right before/after a sign-in or sign-up. */
export const WELCOME_FLAG_KEY = "realtai.welcome";

// Timeline: text shows -> text and logo fade away -> a moment of pure black
// -> the black fades out so the page underneath fades in.
const TEXT_VISIBLE_MS = 2400;
const TEXT_FADE_MS = 700;
const BLACK_HOLD_MS = 400;
const REVEAL_MS = 1300;

type Phase = "in" | "textOut" | "reveal";

type Kind = "back" | "first";

/**
 * Full-screen welcome shown once right after signing in ("Welcome back,
 * Filip") or creating an account ("Welcome, Filip"). It only appears when
 * the provider left a flag in sessionStorage, so reloading the page or
 * simply opening the site while already signed in never triggers it.
 * Click anywhere to skip.
 */
export function WelcomeEffect() {
  const t = useTranslations("welcome");
  const { account } = useAccount();
  const [kind, setKind] = useState<Kind | null>(null);
  const [phase, setPhase] = useState<Phase>("in");
  const [name, setName] = useState<string | null>(null);

  const accountId = account?.id ?? null;
  const resolvedName = account?.displayName ?? account?.firstName ?? null;

  useEffect(() => {
    if (!accountId) return;
    let flag: string | null = null;
    try {
      flag = window.sessionStorage.getItem(WELCOME_FLAG_KEY);
      if (flag) window.sessionStorage.removeItem(WELCOME_FLAG_KEY);
    } catch {
      return;
    }
    if (flag !== "signIn" && flag !== "signUp") return;
    setName(resolvedName);
    setPhase("in");
    setKind(flag === "signUp" ? "first" : "back");
  }, [accountId, resolvedName]);

  useEffect(() => {
    if (!kind) return;
    const textOut = window.setTimeout(() => setPhase("textOut"), TEXT_VISIBLE_MS);
    const reveal = window.setTimeout(() => setPhase("reveal"), TEXT_VISIBLE_MS + TEXT_FADE_MS + BLACK_HOLD_MS);
    const done = window.setTimeout(
      () => setKind(null),
      TEXT_VISIBLE_MS + TEXT_FADE_MS + BLACK_HOLD_MS + REVEAL_MS,
    );
    return () => {
      window.clearTimeout(textOut);
      window.clearTimeout(reveal);
      window.clearTimeout(done);
    };
  }, [kind]);

  if (!kind) return null;

  const text = name ? t(kind === "back" ? "back" : "first", { name }) : t(kind === "back" ? "backNoName" : "firstNoName");

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={() => setPhase("reveal")}
      className={`motion-ok welcome-overlay fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center gap-8 bg-black px-6 text-center text-white ${
        phase === "reveal" ? "welcome-reveal" : ""
      }`}
    >
      <div className={`motion-ok welcome-content flex flex-col items-center gap-8 ${phase === "in" ? "" : "welcome-content-out"}`}>
        <div className="motion-ok welcome-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-white.png" alt="Realt AI" width={1000} height={140} className="h-6 w-auto" />
        </div>
        <p className="motion-ok welcome-text text-3xl font-semibold tracking-tight sm:text-5xl">{text}</p>
      </div>
    </div>
  );
}
