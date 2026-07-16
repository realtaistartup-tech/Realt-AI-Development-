import type {
  MatchFactor,
  MatchResult,
  PriorityConflict,
  Property,
  UserPriorities,
} from "@/types";
import { CRITICAL_IMPORTANCE, DEFAULT_IMPORTANCE } from "@/types";
import { formatArea, formatPrice } from "@/lib/format";

function getImportance(priorities: UserPriorities, category: string): number {
  const weight = priorities.weights.find((w) => w.category === category);
  return weight?.importance ?? DEFAULT_IMPORTANCE;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Step 2 of the Realt Thinking Framework: detect conflicts between what the
 * user is asking for so recommendations can be explained honestly instead of
 * silently failing to satisfy every constraint.
 */
export function detectPriorityConflicts(
  priorities: UserPriorities,
): PriorityConflict[] {
  const conflicts: PriorityConflict[] = [];

  const commuteImportance = getImportance(priorities, "commute");
  const budgetImportance = getImportance(priorities, "budget");
  if (
    priorities.commuteMaxMinutes <= 15 &&
    commuteImportance >= 4 &&
    budgetImportance >= 4
  ) {
    conflicts.push({
      categories: ["commute", "budget"],
      description:
        "A very short commute and a strict budget both rated as critical often conflict, since properties close to major job centers tend to cost more.",
      severity: "medium",
    });
  }

  const spaceImportance = getImportance(priorities, "space");
  if (
    priorities.minBedrooms >= 4 &&
    budgetImportance >= 4 &&
    spaceImportance >= 4
  ) {
    conflicts.push({
      categories: ["space", "budget"],
      description:
        "Requiring 4+ bedrooms while treating budget as critical narrows the realistic options significantly.",
      severity: "medium",
    });
  }

  if (priorities.budgetMin > priorities.budgetMax) {
    conflicts.push({
      categories: ["budget"],
      description: "The minimum budget entered is higher than the maximum budget.",
      severity: "high",
    });
  }

  return conflicts;
}

function scoreBudget(property: Property, priorities: UserPriorities): MatchFactor {
  const { price } = property;
  const { budgetMin, budgetMax } = priorities;
  let score: number;
  let explanation: string;

  if (price >= budgetMin && price <= budgetMax) {
    const headroom = (budgetMax - price) / Math.max(budgetMax - budgetMin, 1);
    score = clampScore(80 + headroom * 20);
    explanation = `Priced at ${formatPrice(price)}, within your ${formatPrice(budgetMin)}–${formatPrice(budgetMax)} range.`;
  } else if (price > budgetMax) {
    const overBy = price - budgetMax;
    const overPct = overBy / budgetMax;
    score = clampScore(60 - overPct * 200);
    explanation = `Priced at ${formatPrice(price)}, which is ${formatPrice(overBy)} (${Math.round(overPct * 100)}%) over your maximum budget.`;
  } else {
    score = 90;
    explanation = `Priced at ${formatPrice(price)}, below your minimum — worth confirming this isn't a quality trade-off.`;
  }

  return {
    category: "budget",
    label: "Budget fit",
    score,
    weight: getImportance(priorities, "budget"),
    explanation,
    isRisk: score < 50,
  };
}

function scoreCommute(property: Property, priorities: UserPriorities): MatchFactor {
  const commuteMinutes = property.commuteMinutesByMode[priorities.commuteMode];

  if (commuteMinutes === undefined) {
    return {
      category: "commute",
      label: "Commute fit",
      score: 50,
      weight: getImportance(priorities, "commute"),
      explanation: `No ${priorities.commuteMode} commute data is available for this property.`,
      isRisk: true,
    };
  }

  const overBy = commuteMinutes - priorities.commuteMaxMinutes;
  const score =
    overBy <= 0
      ? clampScore(100 - (priorities.commuteMaxMinutes - commuteMinutes) * 0.5)
      : clampScore(80 - overBy * 4);

  return {
    category: "commute",
    label: "Commute fit",
    score,
    weight: getImportance(priorities, "commute"),
    explanation:
      overBy <= 0
        ? `${commuteMinutes} min ${priorities.commuteMode} commute, within your ${priorities.commuteMaxMinutes} min limit.`
        : `${commuteMinutes} min ${priorities.commuteMode} commute, ${overBy} min over your ${priorities.commuteMaxMinutes} min limit.`,
    isRisk: overBy > 10,
  };
}

function scoreSpace(property: Property, priorities: UserPriorities): MatchFactor {
  const bedroomsOk = property.bedrooms >= priorities.minBedrooms;
  const bathroomsOk = property.bathrooms >= priorities.minBathrooms;
  let score = 100;
  const notes: string[] = [];

  if (!bedroomsOk) {
    score -= (priorities.minBedrooms - property.bedrooms) * 25;
    notes.push(`${property.bedrooms} bed vs. ${priorities.minBedrooms} needed`);
  }
  if (!bathroomsOk) {
    score -= (priorities.minBathrooms - property.bathrooms) * 15;
    notes.push(`${property.bathrooms} bath vs. ${priorities.minBathrooms} needed`);
  }

  score = clampScore(score);

  return {
    category: "space",
    label: "Space fit",
    score,
    weight: getImportance(priorities, "space"),
    explanation:
      notes.length > 0
        ? `Falls short on space: ${notes.join(", ")}.`
        : `${property.bedrooms} bed / ${property.bathrooms} bath / ${formatArea(property.areaSqm)} meets your space needs.`,
    isRisk: notes.length > 0,
  };
}

function scoreSafety(property: Property, priorities: UserPriorities): MatchFactor {
  const score = clampScore(property.neighborhoodSafetyScore);
  return {
    category: "safety",
    label: "Neighborhood safety",
    score,
    weight: getImportance(priorities, "safety"),
    explanation: `Neighborhood safety score of ${property.neighborhoodSafetyScore}/100.`,
    isRisk: score < 55,
  };
}

function scoreSchools(property: Property, priorities: UserPriorities): MatchFactor {
  const score = clampScore(property.schoolRating * 10);
  return {
    category: "schools",
    label: "School quality",
    score,
    weight: getImportance(priorities, "schools"),
    explanation: `School rating of ${property.schoolRating}/10 for this area.`,
    isRisk: score < 50,
  };
}

function scoreLifestyle(property: Property, priorities: UserPriorities): MatchFactor {
  if (priorities.lifestyleTags.length === 0) {
    return {
      category: "lifestyle",
      label: "Lifestyle fit",
      score: 70,
      weight: getImportance(priorities, "lifestyle"),
      explanation: "No lifestyle preferences were specified.",
      isRisk: false,
    };
  }

  const matched = priorities.lifestyleTags.filter((tag) =>
    property.lifestyleTags.includes(tag),
  );
  const score = clampScore((matched.length / priorities.lifestyleTags.length) * 100);

  return {
    category: "lifestyle",
    label: "Lifestyle fit",
    score,
    weight: getImportance(priorities, "lifestyle"),
    explanation:
      matched.length > 0
        ? `Matches ${matched.length} of ${priorities.lifestyleTags.length} lifestyle preferences: ${matched.join(", ")}.`
        : "Doesn't match any of your stated lifestyle preferences.",
    isRisk: score < 40,
  };
}

/**
 * Step 3-6 of the Realt Thinking Framework applied to a single property:
 * rank priorities by weight, evaluate trade-offs per category, produce a
 * transparent overall score, and explain the reasoning.
 */
export function scoreProperty(
  property: Property,
  priorities: UserPriorities,
): MatchResult {
  const violatedDealBreaker = priorities.dealBreakers.find(
    (breaker) =>
      property.amenities.some((amenity) => amenity.toLowerCase() === breaker.toLowerCase()) ||
      property.description.toLowerCase().includes(breaker.toLowerCase()) ||
      property.lifestyleTags.some((tag) => tag.toLowerCase() === breaker.toLowerCase()),
  );

  const factors: MatchFactor[] = [
    scoreBudget(property, priorities),
    scoreCommute(property, priorities),
    scoreSpace(property, priorities),
    scoreSafety(property, priorities),
    scoreSchools(property, priorities),
    scoreLifestyle(property, priorities),
  ];

  const totalWeight = factors.reduce((sum, f) => sum + f.weight, 0);
  const weightedScore =
    totalWeight === 0
      ? 0
      : factors.reduce((sum, f) => sum + f.score * f.weight, 0) / totalWeight;

  const matchedMustHaves = priorities.mustHaves.filter((item) =>
    property.amenities.some((a) => a.toLowerCase() === item.toLowerCase()),
  );
  const missedMustHaves = priorities.mustHaves.filter(
    (item) => !matchedMustHaves.includes(item),
  );

  const strengths = factors
    .filter((f) => f.score >= 75)
    .map((f) => f.explanation);
  const concerns = factors.filter((f) => f.isRisk).map((f) => f.explanation);
  const criticalConcerns = factors
    .filter((f) => f.isRisk && f.weight >= CRITICAL_IMPORTANCE)
    .map((f) => f.explanation);
  const compromises = missedMustHaves.map(
    (item) => `Does not include "${item}", which you listed as a must-have.`,
  );

  const mustHavePenalty = missedMustHaves.length * 10;
  const score = clampScore(weightedScore - mustHavePenalty);

  const excluded = Boolean(violatedDealBreaker);

  return {
    property,
    score: excluded ? 0 : Math.round(score),
    factors,
    strengths,
    concerns,
    criticalConcerns,
    compromises,
    summary: excluded
      ? `Excluded because it appears to include "${violatedDealBreaker}", which you listed as a deal-breaker.`
      : buildSummary(score, strengths.length, concerns.length),
    excluded,
    exclusionReason: violatedDealBreaker
      ? `Contains deal-breaker: ${violatedDealBreaker}`
      : undefined,
  };
}

function buildSummary(score: number, strengthCount: number, concernCount: number): string {
  if (score >= 80) {
    return `Strong match with ${strengthCount} standout strength${strengthCount === 1 ? "" : "s"} and few compromises.`;
  }
  if (score >= 60) {
    return `Reasonable match with real trade-offs — ${concernCount} area${concernCount === 1 ? "" : "s"} worth reviewing before deciding.`;
  }
  return `Weak match — ${concernCount} significant concern${concernCount === 1 ? "" : "s"} relative to your stated priorities.`;
}

/**
 * Ranks every candidate property for a user, most fitting first. Excluded
 * (deal-breaker) properties are sorted to the end regardless of raw score.
 */
export function rankProperties(
  properties: Property[],
  priorities: UserPriorities,
): MatchResult[] {
  return properties
    .map((property) => scoreProperty(property, priorities))
    .sort((a, b) => {
      if (a.excluded !== b.excluded) return a.excluded ? 1 : -1;
      return b.score - a.score;
    });
}
