import type { MatchResult, PriorityConflict } from "./match";
import type { PriorityConfidence } from "./onboarding";
import type { PriorityCategory, UserPriorities } from "./priorities";

export interface PriorityRankingEntry {
  category: PriorityCategory;
  importance: number;
  rank: number;
}

export type ConfidenceTier = "high" | "medium" | "low";

export interface LongTermConsequenceOption {
  label: string;
  consequence: string;
}

/** Every option under one conflict, grouped so the conflict's title is
 * stated once rather than repeated per option — see
 * services/report/decision-report.ts for why this is grouped instead of a
 * flat list. */
export interface LongTermConsequenceGroup {
  conflictTitle: string;
  options: LongTermConsequenceOption[];
}

/**
 * The Realt Decision Report: the structured, explainable output of the full
 * Realt Thinking Framework for one search — not a results page, a decision
 * document. Every field here traces back to data already computed by the
 * scoring engine (services/matching) or the conflict detector
 * (services/matching/conflict-detection.ts); nothing here is generated
 * separately from that data, so the report can't drift from the reasoning
 * behind it. See services/report/decision-report.ts for how it's built.
 */
export interface DecisionReport {
  generatedAt: string;
  priorities: UserPriorities;
  confidence: PriorityConfidence;
  /** 0-100: the share of essential fields (budget/commute/space/weights)
   * the user actually confirmed, rather than left on a default. */
  confidenceScore: number;
  confidenceTier: ConfidenceTier;
  /** 0-100: the best available match's score. 0 if nothing qualifies. */
  realtScore: number;
  priorityRanking: PriorityRankingEntry[];
  conflicts: PriorityConflict[];
  /** What the top match asks the user to give up, if anything. */
  compromises: string[];
  /** Forward-looking implications of how the detected conflicts could be
   * resolved, grouped by conflict, drawn directly from
   * PriorityConflict.options. */
  longTermConsequences: LongTermConsequenceGroup[];
  /** Grounded in the top match's own strongest factors. */
  likelyToAppreciate: string[];
  /** Grounded in the top match's own risk factors. */
  likelyToRegret: string[];
  /** Gaps worth resolving before fully trusting this report: unconfirmed
   * fields and unresolved meaningful conflicts. */
  openQuestions: string[];
  /** Curated, capped top matches — never the full candidate list. */
  topMatches: MatchResult[];
}
