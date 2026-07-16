import type { PriorityCategory } from "./priorities";
import type { Property } from "./property";

export interface MatchFactor {
  category: PriorityCategory;
  label: string;
  /** 0-100 raw fit for this factor, before weighting */
  score: number;
  weight: number;
  explanation: string;
  isRisk: boolean;
}

export interface MatchResult {
  property: Property;
  /** 0-100 explainable overall score */
  score: number;
  factors: MatchFactor[];
  strengths: string[];
  concerns: string[];
  /** Subset of concerns where the underlying factor is also weighted
   * "critical" (importance 5) by the user — an unmet critical need is
   * categorically worse than an unmet nice-to-have, not just a bigger
   * number in the weighted average, so it's surfaced separately. */
  criticalConcerns: string[];
  compromises: string[];
  summary: string;
  excluded: boolean;
  exclusionReason?: string;
}

export interface ConflictOption {
  /** Short name for the compromise, e.g. "Prioritize location" */
  label: string;
  /** What choosing this option actually means in practice */
  description: string;
  /** What this choice costs — or protects — over time if the user picks it */
  longTermConsequence: string;
}

export interface PriorityConflict {
  /** Stable identifier for the specific pattern detected, e.g. "budget-vs-location" */
  id: string;
  categories: PriorityCategory[];
  title: string;
  /** Why this tension exists, in plain terms */
  description: string;
  /** How much this is likely to narrow the search or affect long-term satisfaction */
  severity: "low" | "medium" | "high";
  /** Realistic ways to resolve the tension, each with its own trade-off —
   * Realt AI explains the trade-offs, it doesn't choose for the user. */
  options: ConflictOption[];
}
