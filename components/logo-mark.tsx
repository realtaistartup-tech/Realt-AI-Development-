import { cn } from "@/lib/utils";

/**
 * The Realt AI "A" mark: a thick right leg and a left leg made of slanted
 * stripes. Drawn in `currentColor`, so it is black in light mode and white in
 * dark mode automatically. Traced from the supplied logo image; replace this
 * component with the exact brand SVG when available.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 540 540" fill="currentColor" aria-hidden="true" className={cn("h-6 w-6", className)}>
      <polygon points="270,8 528,533 470,533 242,63" />
      <polygon points="216,117 226,136 206,136" />
      <polygon points="178,192 244.2,192 253,170 186.8,170" />
      <polygon points="147,254 232.39999999999998,254 242,230 156.60000000000002,230" />
      <polygon points="112,325 205,325 217,295 124,295" />
      <polygon points="77,395 178,395 190,365 89,365" />
      <polygon points="43,464 149,464 161,434 55,434" />
      <polygon points="10,533 122,533 134,503 22,503" />
    </svg>
  );
}
