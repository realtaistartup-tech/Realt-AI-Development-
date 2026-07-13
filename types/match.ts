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
  compromises: string[];
  summary: string;
  excluded: boolean;
  exclusionReason?: string;
}

export interface PriorityConflict {
  categories: PriorityCategory[];
  description: string;
  severity: "low" | "medium" | "high";
}
