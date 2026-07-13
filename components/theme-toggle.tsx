"use client";

import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const THEME_SEQUENCE = ["light", "dark", "system"] as const;

const THEME_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-9 w-9" aria-hidden="true" />;
  }

  const current = (theme as (typeof THEME_SEQUENCE)[number]) ?? "system";
  const Icon = THEME_ICON[current];

  function cycleTheme() {
    const nextIndex = (THEME_SEQUENCE.indexOf(current) + 1) % THEME_SEQUENCE.length;
    setTheme(THEME_SEQUENCE[nextIndex]);
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycleTheme}
      aria-label={`Switch theme, currently ${current}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
    </Button>
  );
}
