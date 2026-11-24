import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /** Accessible name; `common.brand` is the same in every locale. */
  label?: string;
}

/**
 * The official REALT AI logo. Two transparent PNGs, one black for light mode
 * and one white for dark mode. Which one shows follows the system theme via
 * the `dark` class, so there is no flash and no client JavaScript.
 */
export function Logo({ className, label = "Realt AI" }: LogoProps) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-black.png"
        alt={label}
        width={1000}
        height={140}
        className={cn("block h-6 w-auto dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/logo-white.png"
        alt={label}
        width={1000}
        height={140}
        className={cn("hidden h-6 w-auto dark:block", className)}
      />
    </>
  );
}
