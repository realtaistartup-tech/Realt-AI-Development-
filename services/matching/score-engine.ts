import type { MatchFactor, MatchResult, Property, UserPriorities } from "@/types";
import { CRITICAL_IMPORTANCE } from "@/types";
import { formatArea, formatPrice } from "@/lib/format";
import { clampScore, getImportance } from "./priority-helpers";

export { detectPriorityConflicts } from "./conflict-detection";

/** Trim + lowercase so that all text comparisons behave the same way. */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** Drops empty entries from a list of user-entered strings. */
function cleanList(values: string[]): string[] {
  return values.filter((value) => normalize(value).length > 0);
}

function scoreBudget(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
  const { price } = property;
  const { budgetMin, budgetMax, housingIntent } = priorities;
  const budgetLabel =
    housingIntent === "rent" ? "monthly rent" : "purchase price";
  const budgetUnit = housingIntent === "rent" ? " kr/month" : "";

  let score: number;
  let explanation: string;

  if (price >= budgetMin && price <= budgetMax) {
    const headroom =
      (budgetMax - price) / Math.max(budgetMax - budgetMin, 1);

    score = clampScore(80 + headroom * 20);
    explanation = `The ${budgetLabel} is ${formatPrice(price)}${budgetUnit}, within your ${formatPrice(budgetMin)}–${formatPrice(budgetMax)}${budgetUnit} budget range.`;
  } else if (price > budgetMax) {
    const overBy = price - budgetMax;
    const overPct = budgetMax > 0 ? overBy / budgetMax : 1;

    score = clampScore(60 - overPct * 200);
    explanation = `The ${budgetLabel} is ${formatPrice(price)}${budgetUnit}, which is ${formatPrice(overBy)}${budgetUnit} (${Math.round(overPct * 100)}%) over your maximum budget.`;
  } else {
    score = 90;
    explanation = `The ${budgetLabel} is ${formatPrice(price)}${budgetUnit}, below your minimum budget — worth confirming this isn't a quality trade-off.`;
  }

  return {
    category: "budget",
    label: "Budget fit",
    score,
    weight: getImportance(priorities, "budget"),
    explanation,
    isRisk: price > budgetMax || score < 50,
  };
}

function scoreCommute(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
  const commuteMinutes =
    property.commuteMinutesByMode[priorities.commuteMode];

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

  const maxMinutes = priorities.commuteMaxMinutes;
  const overBy = commuteMinutes - maxMinutes;

  // A shorter commute now scores higher: exactly at the limit = 80,
  // zero minutes = 100, and each minute over the limit costs 4 points.
  const score =
    overBy <= 0
      ? clampScore(
          80 +
            (maxMinutes > 0
              ? ((maxMinutes - commuteMinutes) / maxMinutes) * 20
              : 0),
        )
      : clampScore(80 - overBy * 4);

  return {
    category: "commute",
    label: "Commute fit",
    score,
    weight: getImportance(priorities, "commute"),
    explanation:
      overBy <= 0
        ? `${commuteMinutes} min ${priorities.commuteMode} commute, within your ${maxMinutes} min limit.`
        : `${commuteMinutes} min ${priorities.commuteMode} commute, ${overBy} min over your ${maxMinutes} min limit.`,
    isRisk: overBy > 10,
  };
}

function scoreSpace(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
  const bedroomsOk = property.bedrooms >= priorities.minBedrooms;
  const bathroomsOk = property.bathrooms >= priorities.minBathrooms;

  let score = 100;
  const notes: string[] = [];

  if (!bedroomsOk) {
    score -= (priorities.minBedrooms - property.bedrooms) * 25;
    notes.push(
      `${property.bedrooms} bed vs. ${priorities.minBedrooms} needed`,
    );
  }

  if (!bathroomsOk) {
    score -= (priorities.minBathrooms - property.bathrooms) * 15;
    notes.push(
      `${property.bathrooms} bath vs. ${priorities.minBathrooms} needed`,
    );
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

function scoreSafety(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
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

function scoreSchools(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
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

function scoreLifestyle(
  property: Property,
  priorities: UserPriorities,
): MatchFactor {
  const wantedTags = cleanList(priorities.lifestyleTags);

  if (wantedTags.length === 0) {
    return {
      category: "lifestyle",
      label: "Lifestyle fit",
      score: 70,
      weight: getImportance(priorities, "lifestyle"),
      explanation: "No lifestyle preferences were specified.",
      isRisk: false,
    };
  }

  const propertyTags = property.lifestyleTags.map(normalize);

  const matched = wantedTags.filter((tag) =>
    propertyTags.includes(normalize(tag)),
  );

  const score = clampScore((matched.length / wantedTags.length) * 100);

  return {
    category: "lifestyle",
    label: "Lifestyle fit",
    score,
    weight: getImportance(priorities, "lifestyle"),
    explanation:
      matched.length > 0
        ? `Matches ${matched.length} of ${wantedTags.length} lifestyle preferences: ${matched.join(", ")}.`
        : "Doesn't match any of your stated lifestyle preferences.",
    isRisk: score < 40,
  };
}

function findViolatedDealBreaker(
  property: Property,
  priorities: UserPriorities,
): string | undefined {
  const description = property.description.toLowerCase();
  const amenities = property.amenities.map(normalize);
  const tags = property.lifestyleTags.map(normalize);

  // Empty deal-breakers are ignored. An empty string would otherwise
  // match every description and exclude ALL properties.
  return cleanList(priorities.dealBreakers).find((breaker) => {
    const normalizedBreaker = normalize(breaker);

    return (
      amenities.includes(normalizedBreaker) ||
      tags.includes(normalizedBreaker) ||
      description.includes(normalizedBreaker)
    );
  });
}

/**
 * Scores a property against the user's priorities.
 * Properties of the wrong housing type are always excluded.
 * Critical budget overruns and explicitly stated deal-breakers
 * also exclude a property.
 */
export function scoreProperty(
  property: Property,
  priorities: UserPriorities,
): MatchResult {
  // Only exclude on housing type when BOTH sides are known. Older data
  // (or a user who hasn't chosen buy/rent) must not exclude everything.
  const wrongHousingType =
    property.listingType !== undefined &&
    priorities.housingIntent !== undefined &&
    property.listingType !== priorities.housingIntent;

  const violatedDealBreaker = findViolatedDealBreaker(property, priorities);

  const budgetImportance = getImportance(priorities, "budget");
  const budgetExceededCritically =
    !wrongHousingType &&
    property.price > priorities.budgetMax &&
    budgetImportance >= CRITICAL_IMPORTANCE;

  const factors: MatchFactor[] = [
    scoreBudget(property, priorities),
    scoreCommute(property, priorities),
    scoreSpace(property, priorities),
    scoreSafety(property, priorities),
    scoreSchools(property, priorities),
    scoreLifestyle(property, priorities),
  ];

  const totalWeight = factors.reduce(
    (sum, factor) => sum + factor.weight,
    0,
  );

  // If all weights are 0, fall back to a plain average instead of 0.
  const weightedScore =
    totalWeight > 0
      ? factors.reduce(
          (sum, factor) => sum + factor.score * factor.weight,
          0,
        ) / totalWeight
      : factors.reduce((sum, factor) => sum + factor.score, 0) /
        factors.length;

  const mustHaves = cleanList(priorities.mustHaves);
  const propertyAmenities = property.amenities.map(normalize);

  const missedMustHaves = mustHaves.filter(
    (item) => !propertyAmenities.includes(normalize(item)),
  );

  const strengths = factors
    .filter((factor) => factor.score >= 75 && !factor.isRisk)
    .map((factor) => factor.explanation);

  const concerns = factors
    .filter((factor) => factor.isRisk)
    .map((factor) => factor.explanation);

  const criticalConcerns = factors
    .filter(
      (factor) =>
        factor.isRisk && factor.weight >= CRITICAL_IMPORTANCE,
    )
    .map((factor) => factor.explanation);

  const compromises = missedMustHaves.map(
    (item) => `Does not include "${item}", which you listed as a must-have.`,
  );

  const mustHavePenalty = missedMustHaves.length * 10;
  const score = clampScore(weightedScore - mustHavePenalty);

  const excluded =
    wrongHousingType ||
    Boolean(violatedDealBreaker) ||
    budgetExceededCritically;

  const exclusionReason = wrongHousingType
    ? priorities.housingIntent === "rent"
      ? "This is a property for sale, but your search is for rentals."
      : "This is a rental property, but your search is for a property to buy."
    : budgetExceededCritically
      ? `Exceeds your maximum ${priorities.housingIntent === "rent" ? "monthly rent" : "purchase price"} budget of ${formatPrice(priorities.budgetMax)}${priorities.housingIntent === "rent" ? " kr/month" : ""}, and budget is a critical priority.`
      : violatedDealBreaker
        ? `Contains deal-breaker: ${violatedDealBreaker}`
        : undefined;

  const summary = wrongHousingType
    ? priorities.housingIntent === "rent"
      ? "Excluded because this property is for sale, not for rent."
      : "Excluded because this property is for rent, not for purchase."
    : budgetExceededCritically
      ? "Excluded because the property exceeds your maximum budget, which you rated as a critical priority."
      : violatedDealBreaker
        ? `Excluded because it appears to include "${violatedDealBreaker}", which you listed as a deal-breaker.`
        : buildSummary(
            score,
            strengths.length,
            concerns.length,
            compromises.length,
          );

  return {
    property,
    score: excluded ? 0 : Math.round(score),
    factors,
    strengths,
    concerns,
    criticalConcerns,
    compromises,
    summary,
    excluded,
    exclusionReason,
  };
}

function buildSummary(
  score: number,
  strengthCount: number,
  concernCount: number,
  compromiseCount: number,
): string {
  if (score >= 80) {
    const tail =
      compromiseCount > 0
        ? `${compromiseCount} unmet must-have${compromiseCount === 1 ? "" : "s"}`
        : "few compromises";

    return `Strong match with ${strengthCount} standout strength${strengthCount === 1 ? "" : "s"} and ${tail}.`;
  }

  const total = concernCount + compromiseCount;

  if (score >= 60) {
    return `Reasonable match with real trade-offs — ${total} area${total === 1 ? "" : "s"} worth reviewing before deciding.`;
  }

  return `Weak match — ${total} significant concern${total === 1 ? "" : "s"} relative to your stated priorities.`;
}

/**
 * Ranks candidate properties, placing excluded properties after eligible ones.
 */
export function rankProperties(
  properties: Property[],
  priorities: UserPriorities,
): MatchResult[] {
  return properties
    .map((property) => scoreProperty(property, priorities))
    .sort((a, b) => {
      if (a.excluded !== b.excluded) {
        return a.excluded ? 1 : -1;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      // Tie-break: fewer critical concerns first.
      return a.criticalConcerns.length - b.criticalConcerns.length;
    });
}
