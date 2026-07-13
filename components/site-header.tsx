import Link from "next/link";
import { Home } from "lucide-react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight text-foreground"
        >
          <Home className="h-5 w-5 text-primary" aria-hidden="true" />
          Realt AI
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/onboarding">Find my home</Link>
          </Button>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
