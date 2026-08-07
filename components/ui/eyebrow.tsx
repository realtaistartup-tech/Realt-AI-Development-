import * as React from "react";

import { cn } from "@/lib/utils";

type EyebrowElement = "p" | "span" | "h3" | "dt";

interface EyebrowProps extends React.HTMLAttributes<HTMLElement> {
  as?: EyebrowElement;
}

export function Eyebrow({ as: Tag = "p", className, ...props }: EyebrowProps) {
  return (
    <Tag
      className={cn("font-mono text-xs font-semibold uppercase tracking-widest", className)}
      {...props}
    />
  );
}
