import type { UserPriorities } from "@/types";
import { DEFAULT_IMPORTANCE } from "@/types";

export function getImportance(priorities: UserPriorities, category: string): number {
  const weight = priorities.weights.find((w) => w.category === category);
  return weight?.importance ?? DEFAULT_IMPORTANCE;
}

export function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}
