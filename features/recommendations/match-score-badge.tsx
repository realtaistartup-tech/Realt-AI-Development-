import { cn } from "@/lib/utils";

interface MatchScoreBadgeProps {
  score: number;
  className?: string;
}

function scoreTier(score: number): { label: string; classes: string } {
  if (score >= 80) {
    return { label: "Strong match", classes: "border-success/40 bg-success/10 text-success" };
  }
  if (score >= 60) {
    return { label: "Partial match", classes: "border-warning/40 bg-warning/10 text-warning" };
  }
  return { label: "Weak match", classes: "border-destructive/40 bg-destructive/10 text-destructive" };
}

export function MatchScoreBadge({ score, className }: MatchScoreBadgeProps) {
  const tier = scoreTier(score);
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border px-3 py-1",
        tier.classes,
        className,
      )}
      role="img"
      aria-label={`Match score ${score} out of 100, ${tier.label}`}
    >
      <span className="text-sm font-semibold tabular-nums" aria-hidden="true">
        {score}
      </span>
      <span className="text-xs font-medium" aria-hidden="true">
        {tier.label}
      </span>
    </div>
  );
}
