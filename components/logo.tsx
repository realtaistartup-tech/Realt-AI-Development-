import Image from "next/image";
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
      <Image
        src="/images/logo-black.png"
        alt={label}
        width={1000}
        height={140}
        sizes="256px"
        className={cn("block h-6 w-auto dark:hidden", className)}
      />

      <Image
        src="/images/logo-white.png"
        alt={label}
        width={1000}
        height={140}
        sizes="256px"
        className={cn("hidden h-6 w-auto dark:block", className)}
      />
    </>
  );
}