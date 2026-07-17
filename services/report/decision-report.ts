import { rankProperties } from "@/services/matching/score-engine";
import { detectPriorityConflicts } from "@/services/matching/conflict-detection";
import { getImportance } from "@/services/matching/priority-helpers";
import type {
  ConfidenceTier,
  DecisionReport,
  MatchResult,
  PriorityCategory,
  PriorityConfidence,
  PriorityConflict,
  PriorityFieldKey,
  PriorityRankingEntry,
  Property,
  UserPriorities,
} from "@/types";
import { PRIORITY_CATEGORIES, PRIORITY_FIELD_ORDER } from "@/types";

/** A curated shortlist, not the full candidate list — a report is a
 * decision document, not a catalog. */
export const MAX_TOP_MATCHES = 5;
const MAX_LONG_TERM_CONSEQUENCES = 6;
const MAX_OPEN_QUESTIONS = 8;

const SEVERITY_RANK: Record<PriorityConflict["severity"], number> = { high: 2, medium: 1, low: 0 };

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}

function rankPriorityWeights(priorities: UserPriorities): PriorityRankingEntry[] {
  return PRIORITY_CATEGORIES.map((category) => ({
    category,
    importance: getImportance(priorities, category),
  }))
    .sort((a, b) => b.importance - a.importance)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

function deriveCompromises(bestMatch: MatchResult | undefined): string[] {
  return bestMatch?.compromises ?? [];
}

function deriveLongTermConsequences(conflicts: PriorityConflict[]): string[] {
  const bySeverity = [...conflicts].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity],
  );
  const consequences: string[] = [];
  for (const conflict of bySeverity) {
    for (const option of conflict.options) {
      consequences.push(`${option.label} (${conflict.title}): ${option.longTermConsequence}`);
      if (consequences.length >= MAX_LONG_TERM_CONSEQUENCES) return consequences;
    }
  }
  return consequences;
}

/**
 * Category-aware framing for the "12 months later" sections. The factor
 * explanation itself (e.g. "Priced at 4 250 000 kr, within your range")
 * already comes straight from the scoring engine — this only adds *why a
 * factor like this tends to matter more or less over time*, grounded in
 * the category, never inventing a fact about the specific property.
 */
const APPRECIATE_FRAMING: Record<PriorityCategory, string> = {
  budget: "Financial breathing room tends to matter more, not less, as time goes on.",
  commute:
    "A commute like this compounds — the time it saves adds up to real hours back in your life over a year.",
  space:
    "Having enough space rarely feels like a luxury after the first few months — it becomes the baseline you don't want to give up.",
  safety:
    "A safe, comfortable neighborhood is easy to take for granted, and the first thing you'd miss if you moved somewhere worse.",
  schools: "School quality is a decision whose value shows up over years, not weeks.",
  lifestyle:
    "A neighborhood that actually fits how you live is something you notice every single day, not just on move-in day.",
};

const REGRET_FRAMING: Record<PriorityCategory, string> = {
  budget:
    "A tight budget can feel fine at first, but leaves little room to adapt if your circumstances change.",
  commute:
    "A longer commute rarely feels worse than on day one — but it also rarely feels better, and it adds up over years.",
  space:
    "Feeling short on space tends to get more noticeable over time, not less, especially if your household grows.",
  safety:
    "Safety concerns are easy to accept in the excitement of moving in, and harder to live with once the novelty wears off.",
  schools: "School quality is difficult to change after you've settled in — it's worth being certain about now.",
  lifestyle:
    "A neighborhood that doesn't quite fit your lifestyle is a small daily friction that adds up more than it seems at first.",
};

function deriveAppreciate(bestMatch: MatchResult | undefined): string[] {
  if (!bestMatch) return [];
  // Excluding isRisk keeps this mutually exclusive with deriveRegret — a
  // factor that's technically >=75 but still flagged a risk (e.g. missing
  // a single bedroom scores exactly 75) should never appear as something
  // to feel good about and something to worry about at the same time.
  return bestMatch.factors
    .filter((factor) => factor.score >= 75 && !factor.isRisk)
    .map((factor) => `${factor.explanation} ${APPRECIATE_FRAMING[factor.category]}`);
}

function deriveRegret(bestMatch: MatchResult | undefined): string[] {
  if (!bestMatch) return [];
  return bestMatch.factors
    .filter((factor) => factor.isRisk)
    .map((factor) => `${factor.explanation} ${REGRET_FRAMING[factor.category]}`);
}

const FIELD_QUESTION: Record<PriorityFieldKey, string> = {
  budget: "What's your actual budget range? This report is currently using a default.",
  commute: "How long a commute are you really willing to accept, and by what mode?",
  space: "How many bedrooms and bathrooms do you actually need?",
  weights:
    "Which of budget, commute, space, safety, schools, or lifestyle matters most to you? Nothing was singled out yet.",
};

function deriveOpenQuestions(
  confidence: PriorityConfidence,
  conflicts: PriorityConflict[],
): string[] {
  const fieldQuestions = PRIORITY_FIELD_ORDER.filter((field) => !confidence[field]).map(
    (field) => FIELD_QUESTION[field],
  );
  const conflictQuestions = [...conflicts]
    .filter((conflict) => conflict.severity !== "low")
    .sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
    .map((conflict) => `${conflict.title} — which matters more to you?`);

  return [...fieldQuestions, ...conflictQuestions].slice(0, MAX_OPEN_QUESTIONS);
}

/**
 * Builds the Realt Decision Report: the structured, explainable synthesis
 * of everything the Realt Thinking Framework has established for this
 * search. Deliberately a pure function of data already produced elsewhere
 * (rankProperties, detectPriorityConflicts) — this module adds no new
 * scoring or conflict logic of its own, only interpretation and framing,
 * so the report can never say something the underlying data doesn't
 * support.
 */
export function buildDecisionReport(
  priorities: UserPriorities,
  confidence: PriorityConfidence,
  properties: Property[],
): DecisionReport {
  const ranked = rankProperties(properties, priorities);
  const nonExcluded = ranked.filter((result) => !result.excluded);
  const bestMatch = nonExcluded[0];
  const conflicts = detectPriorityConflicts(priorities);

  const confirmedCount = PRIORITY_FIELD_ORDER.filter((field) => confidence[field]).length;
  const confidenceScore = Math.round((confirmedCount / PRIORITY_FIELD_ORDER.length) * 100);

  return {
    generatedAt: new Date().toISOString(),
    priorities,
    confidence,
    confidenceScore,
    confidenceTier: confidenceTier(confidenceScore),
    realtScore: bestMatch?.score ?? 0,
    priorityRanking: rankPriorityWeights(priorities),
    conflicts,
    compromises: deriveCompromises(bestMatch),
    longTermConsequences: deriveLongTermConsequences(conflicts),
    likelyToAppreciate: deriveAppreciate(bestMatch),
    likelyToRegret: deriveRegret(bestMatch),
    openQuestions: deriveOpenQuestions(confidence, conflicts),
    topMatches: nonExcluded.slice(0, MAX_TOP_MATCHES),
  };
}
