export type PriorityCategory =
  | "budget"
  | "commute"
  | "space"
  | "safety"
  | "schools"
  | "lifestyle";

export type CommuteMode = "drive" | "transit" | "walk" | "bike";

export interface PriorityWeight {
  category: PriorityCategory;
  /** 1 = nice to have, 5 = critical */
  importance: number;
}

export interface UserPriorities {
  budgetMin: number;
  budgetMax: number;
  commuteMaxMinutes: number;
  commuteMode: CommuteMode;
  minBedrooms: number;
  minBathrooms: number;
  mustHaves: string[];
  dealBreakers: string[];
  lifestyleTags: string[];
  weights: PriorityWeight[];
}

export const PRIORITY_CATEGORIES: PriorityCategory[] = [
  "budget",
  "commute",
  "space",
  "safety",
  "schools",
  "lifestyle",
];

export const DEFAULT_IMPORTANCE = 3;
export const CRITICAL_IMPORTANCE = 5;
