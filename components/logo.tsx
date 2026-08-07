import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  /**
   * Override the accessible name if this is ever rendered somewhere the
   * default English brand name shouldn't be spoken (not expected today —
   * `common.brand` is identical in every locale).
   */
  label?: string;
}

/**
 * The "REALT AI" wordmark, hand-built from geometric shapes to evoke the
 * brand's actual mark (the disconnected three-bar E, the R's separated
 * foot) rather than tracing it pixel-for-pixel. Vector, single color via
 * `currentColor`, so it follows the surrounding text color automatically
 * in both themes — no separate light/dark image assets to keep in sync.
 * Swap in the exact brand file later by rewriting only this component;
 * every consumer already renders `<Logo />` and needs no changes.
 */
export function Logo({ className, label = "Realt AI" }: LogoProps) {
  return (
    <svg
      viewBox="0 0 340 64"
      fill="currentColor"
      role="img"
      aria-label={label}
      className={cn("h-6 w-auto text-foreground", className)}
    >
      {/* R */}
      <g>
        <rect x="0" y="0" width="9" height="64" />
        <rect x="0" y="0" width="31" height="9" />
        <rect x="22" y="0" width="9" height="36" />
        <rect x="0" y="27" width="31" height="9" />
        <line
          x1="18"
          y1="34"
          x2="38"
          y2="58"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
        <rect x="40" y="58" width="8" height="6" />
      </g>
      {/* E — three disconnected bars, no spine */}
      <g transform="translate(62,0)">
        <rect x="0" y="0" width="34" height="9" />
        <rect x="0" y="27" width="28" height="9" />
        <rect x="0" y="55" width="34" height="9" />
      </g>
      {/* A — clean upside-down V, no crossbar */}
      <g transform="translate(110,0)">
        <line
          x1="20"
          y1="0"
          x2="4"
          y2="64"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
        <line
          x1="20"
          y1="0"
          x2="36"
          y2="64"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
      </g>
      {/* L */}
      <g transform="translate(164,0)">
        <rect x="0" y="0" width="9" height="64" />
        <rect x="0" y="55" width="30" height="9" />
      </g>
      {/* T */}
      <g transform="translate(208,0)">
        <rect x="0" y="0" width="34" height="9" />
        <rect x="12.5" y="0" width="9" height="64" />
      </g>
      {/* A — clean upside-down V, no crossbar */}
      <g transform="translate(272,0)">
        <line
          x1="20"
          y1="0"
          x2="4"
          y2="64"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
        <line
          x1="20"
          y1="0"
          x2="36"
          y2="64"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="square"
        />
      </g>
      {/* I */}
      <g transform="translate(326,0)">
        <rect x="0" y="0" width="9" height="64" />
      </g>
    </svg>
  );
}
