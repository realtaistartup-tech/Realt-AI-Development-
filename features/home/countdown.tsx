"use client";

import { useEffect, useState, type FormEvent } from "react";
import { MapPin, Rocket } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Launch: 1 February 2027, 10:00 Swedish time (UTC+1 in winter). */
const LAUNCH_AT = new Date("2027-02-01T10:00:00+01:00").getTime();

function remaining(now: number) {
  const diff = Math.max(0, LAUNCH_AT - now);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    done: diff === 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function WaitlistForm() {
  const t = useTranslations("home.countdown.waitlist");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "invalid" | "error">("idle");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale, website }),
      });
      if (response.ok) {
        setStatus("success");
        setEmail("");
      } else {
        setStatus(response.status === 400 ? "invalid" : "error");
      }
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <p role="status" className="rounded-xl border border-border bg-background px-4 py-4 text-sm font-medium">
        {t("success")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <h3 className="text-lg font-semibold tracking-tight">{t("heading")}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className="sm:flex-1"
        />
        <input
          type="text"
          name="website"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />
        <Button type="submit" disabled={status === "loading"}>
          {status === "loading" ? t("sending") : t("button")}
        </Button>
      </div>
      {(status === "invalid" || status === "error") && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {status === "invalid" ? t("invalid") : t("error")}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t("consent")}</p>
    </form>
  );
}

export function Countdown() {
  const t = useTranslations("home.countdown");
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const updateTime = () => setNow(Date.now());

    const initialTimer = window.setTimeout(updateTime, 0);
    const intervalId = window.setInterval(updateTime, 1000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalId);
    };
  }, []);

  const time = now === null ? null : remaining(now);

  const units = [
    { key: "days", value: time?.days },
    { key: "hours", value: time?.hours },
    { key: "minutes", value: time?.minutes },
    { key: "seconds", value: time?.seconds },
  ] as const;

  return (
    <div className="hover-pop motion-ok relative flex h-full flex-col justify-between gap-8 rounded-2xl border border-border bg-secondary p-6 shadow-sm hover:z-10 sm:p-8">
      <div>
        <div className="flex items-center gap-2 text-sm font-medium uppercase tracking-widest text-muted-foreground">
          <Rocket className="h-4 w-4" aria-hidden="true" />
          {t("eyebrow")}
        </div>
        <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">{t("heading")}</h2>
        <p className="mt-2 flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t("sweden")}
          <svg viewBox="0 0 16 10" className="h-4 w-auto rounded-[2px] border border-border" role="img" aria-label="Sweden">
            <rect width="16" height="10" fill="#006AA7" />
            <rect x="5" width="2" height="10" fill="#FECC00" />
            <rect y="4" width="16" height="2" fill="#FECC00" />
          </svg>
        </p>
      </div>

      {time?.done ? (
        <p className="text-2xl font-semibold tracking-tight">{t("launched")}</p>
      ) : (
        <div className="grid grid-cols-4 gap-2 sm:gap-4" role="timer" aria-live="off">
          {units.map(({ key, value }) => (
            <div key={key} className="rounded-xl border border-border bg-background px-1 py-4 text-center sm:py-6">
              <div className="text-2xl font-semibold tabular-nums tracking-tight sm:text-4xl">
                {value === undefined ? "--" : String(value).padStart(2, "0")}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground sm:text-xs">{t(key)}</div>
            </div>
          ))}
        </div>
      )}

      <WaitlistForm />
    </div>
  );
}