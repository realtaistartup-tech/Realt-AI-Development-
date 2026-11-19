import type { PriorityConflict, UserPriorities } from "@/types";
import { getImportance } from "./priority-helpers";

/**
 * Step 2 of the Realt Thinking Framework, and one of Realt AI's core
 * differentiators: this doesn't just catch impossible combinations (a
 * min budget above the max). It surfaces hidden trade-offs, long-term
 * risks, and self-contradictions in what someone has told us they want —
 * the kind of tension a person often doesn't notice until they're already
 * disappointed by a property. The goal is never to choose for the user;
 * every conflict below explains why it exists, how much it matters, and
 * what realistic options exist, each with its own honest consequence.
 *
 * All of this operates on free-text signals in mustHaves and lifestyleTags
 * (things the person WANTS), because that's the open vocabulary the AI
 * extraction layer (and the manual review form) already writes into.
 * dealBreakers are things the person wants to AVOID, so they are
 * deliberately NOT read as wishes. New concepts (pets, working from home,
 * accessibility, tenure plans, ...) are added as keyword sets here rather
 * than new structured fields, so this stays extensible without onboarding
 * or schema changes.
 */

/**
 * Makes free text comparable: "Home-Office", "home_office" and
 * "home office" all become "home office".
 */
function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
}

// Word boundaries that also work for å, ä and ö (unlike \b).
const WORD_START = "(?<![\\p{L}\\p{N}])";
const WORD_END = "(?![\\p{L}\\p{N}])";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds one matcher for a keyword list.
 *
 * Keywords match WHOLE words only, with an optional plural "s". This is
 * what stops "cat" from matching "location", "pet" from matching "carpet"
 * and "nature" from matching "signature".
 *
 * A trailing "*" makes a keyword a stem that matches any word starting
 * with it, e.g. "accessib*" matches "accessible" and "accessibility".
 */
function buildMatcher(keywords: string[]): RegExp {
  const patterns = keywords.map((keyword) => {
    const isStem = keyword.endsWith("*");
    const base = escapeRegExp(
      normalizeText(isStem ? keyword.slice(0, -1) : keyword),
    );

    return isStem ? `${WORD_START}${base}` : `${WORD_START}${base}s?${WORD_END}`;
  });

  return new RegExp(patterns.join("|"), "iu");
}

const PETS = buildMatcher(["pet", "dog", "cat"]);
const HOME_OFFICE = buildMatcher([
  "home office",
  "work from home",
  "remote work",
  "wfh",
]);
const NATURE = buildMatcher([
  "nature",
  "green space",
  "countryside",
  "forest",
  "rural",
  "hiking",
]);
const URBAN_CENTER = buildMatcher([
  "nightlife",
  "city center",
  "city centre",
  "downtown",
  "urban core",
  "central location",
]);
const QUIET = buildMatcher([
  "quiet",
  "peaceful",
  "noise sensitive",
  "low noise",
  "calm street",
]);
const FAMILY_GROWTH = buildMatcher([
  "growing family",
  "planning a family",
  "more kids",
  "expecting",
  "family growth",
  "future kids",
]);
const ACCESSIBILITY = buildMatcher([
  "wheelchair",
  "step free",
  "accessib*",
  "mobility",
]);
const HISTORIC = buildMatcher([
  "historic*",
  "character*",
  "period property",
  "old building",
  "pre war",
  "charm*",
]);
// "flexible" alone also matches things like "flexible layout", which says
// nothing about tenure, so only tenure-related phrases count here.
const FLEXIBLE_TENURE = buildMatcher([
  "flexible tenure",
  "flexible lease",
  "flexible contract",
  "short term",
  "may relocate",
  "might relocate",
  "not ready to commit",
]);
const LONG_TERM_OWNERSHIP = buildMatcher([
  "forever home",
  "settle down",
  "long term home",
  "buying",
  "long term ownership",
  "permanent home",
]);
const PARKING = buildMatcher(["parking", "garage"]);

/**
 * What the person WANTS, as normalized text. Deal-breakers are excluded on
 * purpose: someone who lists "nightlife" as a deal-breaker is saying they
 * do NOT want it, so it must not create a nightlife conflict.
 */
function wantedTags(priorities: UserPriorities): string[] {
  return [...priorities.mustHaves, ...priorities.lifestyleTags]
    .map(normalizeText)
    .filter((tag) => tag.length > 0);
}

function hasSignal(tags: string[], matcher: RegExp): boolean {
  return tags.some((tag) => matcher.test(tag));
}

/**
 * Below this PURCHASE price, a Swedish urban budget is tight enough that
 * "critical" priorities start competing directly for the same limited
 * supply. This is a purchase price in SEK, so it is never applied to
 * rental searches, where the budget is a monthly rent.
 */
const TIGHT_BUDGET_SEK = 4_000_000;

export function detectPriorityConflicts(priorities: UserPriorities): PriorityConflict[] {
  const conflicts: PriorityConflict[] = [];
  const tags = wantedTags(priorities);

  const budgetImportance = getImportance(priorities, "budget");
  const commuteImportance = getImportance(priorities, "commute");
  const spaceImportance = getImportance(priorities, "space");
  const safetyImportance = getImportance(priorities, "safety");

  // A monthly rent (e.g. 12 000 kr) is always far below 4 000 000, so
  // without this check every renter was treated as having a "tight" budget.
  // Rental searches get no tight-budget conflicts until a rent threshold
  // has been decided. An unknown intent is treated as a purchase.
  const isBuying = priorities.housingIntent !== "rent";
  const isTightBudget =
    isBuying && priorities.budgetMax > 0 && priorities.budgetMax <= TIGHT_BUDGET_SEK;
  const wantsShortCentralCommute = priorities.commuteMaxMinutes <= 20 && commuteImportance >= 4;

  if (priorities.budgetMin > priorities.budgetMax) {
    conflicts.push({
      id: "inverted-budget-range",
      categories: ["budget"],
      title: "Your budget range doesn't make sense as entered",
      description:
        "The minimum budget you entered is higher than the maximum, which isn't a real range — it's most likely a data entry issue rather than an actual preference.",
      severity: "high",
      options: [
        {
          label: "Fix the numbers",
          description:
            "Swap or correct the minimum and maximum so the range reflects what you can actually spend.",
          longTermConsequence:
            "Until this is fixed, every match score is being computed against a budget range that can't exist, so none of the ranking below can be trusted.",
        },
      ],
    });
  }

  if (wantsShortCentralCommute && budgetImportance >= 4) {
    conflicts.push({
      id: "budget-vs-location",
      categories: ["commute", "budget"],
      title: "Budget vs. location",
      description:
        "You've asked for both a short commute and a strict budget, treating each as critical. Properties close to major job centers and transit hubs are consistently priced higher than equivalent space further out — this is one of the most reliable patterns in the Swedish housing market, not a coincidence of this search.",
      severity: "medium",
      options: [
        {
          label: "Prioritize location",
          description: "Keep the short commute and let the budget flex upward for the right property.",
          longTermConsequence:
            "You gain time back every day for as long as you live there, at the cost of a higher payment or a smaller financial buffer.",
        },
        {
          label: "Prioritize budget",
          description: "Keep the budget firm and accept a longer commute or a less central neighborhood.",
          longTermConsequence:
            "You preserve financial flexibility, but the extra commute time compounds — over a few years it adds up to weeks of your life spent traveling.",
        },
        {
          label: "Split the difference",
          description: "Loosen the commute limit moderately (for example from 15 to 30 minutes) rather than treating either as absolute.",
          longTermConsequence:
            "You keep more properties in play without fully sacrificing either priority, though it's worth deciding which one actually matters more day to day.",
        },
      ],
    });
  }

  if (priorities.minBedrooms >= 4 && budgetImportance >= 4 && spaceImportance >= 4) {
    conflicts.push({
      id: "space-vs-budget-scale",
      categories: ["space", "budget"],
      title: "Space requirements vs. budget at scale",
      description:
        "Four or more bedrooms is a meaningful jump in both price and square meters, and you've marked space and budget as equally critical. Larger homes that also fit a strict budget are the exception, not the rule, in most Swedish metros.",
      severity: "medium",
      options: [
        {
          label: "Hold the bedroom count, relax the budget",
          description: "Keep the space requirement and treat the budget ceiling as a starting point you're willing to stretch.",
          longTermConsequence:
            "You get the room you need now, but a higher payment is a long-term commitment that outlasts the reasons you needed the space.",
        },
        {
          label: "Hold the budget, relax the bedroom count",
          description: "Consider whether 3 bedrooms with a flexible layout (a study that converts later) could work instead of 4.",
          longTermConsequence:
            "You stay within budget today, but may need to move again sooner if the space genuinely runs out — and moving has its own real cost.",
        },
      ],
    });
  }

  if (hasSignal(tags, NATURE) && wantsShortCentralCommute) {
    conflicts.push({
      id: "commute-vs-lifestyle-nature",
      categories: ["commute", "lifestyle"],
      title: "A peaceful, natural setting usually means a longer commute",
      description:
        "You've said you want a nature-oriented or green setting, but also want a short commute. Properties with real green space and quiet surroundings are typically further from dense job centers — the two pull in opposite directions.",
      severity: "low",
      options: [
        {
          label: "Extend the commute tolerance",
          description: "Give yourself 10–15 more minutes of commute time to reach areas with genuine access to nature.",
          longTermConsequence:
            "A slightly longer daily commute is a small, predictable cost in exchange for a living environment you'll experience every day at home.",
        },
        {
          label: "Look for pocket green space instead",
          description: "Prioritize properties near parks or waterfronts within the city rather than true suburban nature.",
          longTermConsequence:
            "You keep your commute short, but the sense of space and quiet will be more limited than a fully suburban or rural setting would offer.",
        },
      ],
    });
  }

  if (hasSignal(tags, FAMILY_GROWTH) && priorities.minBedrooms <= 2) {
    conflicts.push({
      id: "family-growth-vs-space",
      categories: ["space", "lifestyle"],
      title: "Planning for a growing family vs. your current space requirement",
      description:
        "You've indicated you're planning for a growing family, but your minimum bedroom count only reflects your household today. A home that fits now can feel cramped within a few years if this materializes.",
      severity: "medium",
      options: [
        {
          label: "Buy ahead of need",
          description: "Raise your minimum bedroom count by one now, even if it isn't strictly necessary yet.",
          longTermConsequence:
            "Higher upfront cost today, but you avoid the disruption and expense of moving again in a few years.",
        },
        {
          label: "Buy for today, plan to move later",
          description: "Keep the current requirement and treat this as a deliberately temporary home.",
          longTermConsequence:
            "Lower cost now, but moving again later carries its own real costs — agent fees, moving costs, and disruption, this time with a growing family.",
        },
      ],
    });
  }

  if (safetyImportance >= 4 && budgetImportance >= 4 && isTightBudget) {
    conflicts.push({
      id: "safety-vs-affordability",
      categories: ["safety", "budget"],
      title: "Safety vs. affordability",
      description:
        "You've marked both neighborhood safety and budget as critical, but a tight budget in the Swedish market often narrows you toward areas with lower safety scores — the two are correlated more often than not.",
      severity: "medium",
      options: [
        {
          label: "Protect the safety threshold",
          description: "Keep safety non-negotiable and let the budget absorb the difference.",
          longTermConsequence:
            "You're paying for peace of mind that compounds over years of daily life, at the cost of less financial slack elsewhere.",
        },
        {
          label: "Widen the search radius",
          description: "Look further from the city center, where safety scores and affordability are often both better than closer-in alternatives at the same price.",
          longTermConsequence:
            "You may trade some commute time for a neighborhood that satisfies both — worth testing before assuming the two are truly incompatible.",
        },
      ],
    });
  }

  if (hasSignal(tags, NATURE) && hasSignal(tags, URBAN_CENTER)) {
    conflicts.push({
      id: "nature-vs-city-center",
      categories: ["lifestyle"],
      title: "Nature and city-center living are difficult to have simultaneously",
      description:
        "You've listed both a preference for nature or green surroundings and a preference for city-center or downtown living. These describe genuinely different environments — it's worth clarifying which one actually matters more, since a single property is unlikely to strongly deliver both.",
      severity: "high",
      options: [
        {
          label: "Choose nature",
          description: "Prioritize green space and quiet, and accept being further from the urban core.",
          longTermConsequence: "You gain a calmer daily environment, at the cost of convenient access to city amenities and nightlife.",
        },
        {
          label: "Choose city center",
          description: "Prioritize walkability and urban energy, and accept less green space nearby.",
          longTermConsequence:
            "You gain convenience and vibrancy day to day, but daily contact with nature will require deliberate effort rather than a backyard.",
        },
        {
          label: "Look for a middle ground",
          description: "Consider neighborhoods known for parks or waterfront access within a still-central location.",
          longTermConsequence: "Fewer properties will qualify, since this combination is genuinely rarer and often priced at a premium.",
        },
      ],
    });
  }

  if (hasSignal(tags, URBAN_CENTER) && hasSignal(tags, QUIET)) {
    conflicts.push({
      id: "nightlife-vs-noise-sensitivity",
      categories: ["lifestyle"],
      title: "Nightlife and noise sensitivity are in direct tension",
      description:
        "You've said you want to be near nightlife, but have also flagged noise or quiet as important. Areas with real nightlife are, almost by definition, louder — especially in the evenings and on weekends, which is exactly when you're likely to be home.",
      severity: "high",
      options: [
        {
          label: "Prioritize nightlife",
          description: "Accept some ambient noise as the cost of being close to bars, restaurants, and evening activity.",
          longTermConsequence:
            "This tends to matter less if you're out often, but can wear on you over time if your habits change and you're home more.",
        },
        {
          label: "Prioritize quiet",
          description: "Move a short distance from the nightlife district rather than in the middle of it — close enough to walk, far enough to sleep.",
          longTermConsequence: "You give up some spontaneity and walking distance, but this is usually the most durable compromise for this exact conflict.",
        },
      ],
    });
  }

  if (hasSignal(tags, HOME_OFFICE) && priorities.minBedrooms <= 1) {
    conflicts.push({
      id: "wfh-vs-layout",
      categories: ["space", "lifestyle"],
      title: "Working from home vs. your space requirement",
      description:
        "You've indicated you work from home, but your minimum bedroom count doesn't leave obvious room for a dedicated workspace. Working from a bedroom or living area long-term is a common source of regret once the novelty wears off.",
      severity: "medium",
      options: [
        {
          label: "Add a room for it",
          description: "Raise your minimum bedroom count by one to allow for a dedicated office, even a small one.",
          longTermConsequence:
            "Higher cost now, but a real work/life boundary at home — this consistently matters more after the first few months of remote work than it does during the search.",
        },
        {
          label: "Plan around a flexible space",
          description: "Look for a larger living area or alcove that can host a desk instead of a full extra room.",
          longTermConsequence: "Lower cost, but it's worth being honest about whether you can actually concentrate and switch off in a shared space.",
        },
      ],
    });
  }

  if (hasSignal(tags, PETS)) {
    conflicts.push({
      id: "pets-vs-rental-restrictions",
      categories: ["lifestyle"],
      title: "Pets can significantly narrow your options",
      description:
        "You've indicated you have pets. Many buildings — rentals in particular, but also some cooperative (bostadsrätt) associations — restrict or prohibit pets. This won't always show up clearly in a listing, and it's worth confirming directly rather than assuming.",
      severity: "medium",
      options: [
        {
          label: "Confirm the pet policy early",
          description: "Ask directly about pet rules — building bylaws (stadgar) for cooperatives, or the landlord's policy for rentals — before getting attached to a place.",
          longTermConsequence:
            "A small amount of upfront diligence avoids the much larger disappointment of being turned down after you've already committed emotionally.",
        },
        {
          label: "Make pet-friendliness an explicit must-have",
          description: "If you haven't already, add it to your must-haves rather than leaving it implicit.",
          longTermConsequence: "It becomes a visible, ranked factor instead of something you discover late in the process.",
        },
      ],
    });
  }

  if (
    (hasSignal(tags, FAMILY_GROWTH) || hasSignal(tags, LONG_TERM_OWNERSHIP)) &&
    budgetImportance >= 4 &&
    isTightBudget
  ) {
    conflicts.push({
      id: "future-plans-vs-budget",
      categories: ["budget", "lifestyle"],
      title: "Future plans vs. what your current budget can stretch to",
      description:
        "You've indicated plans that typically mean higher future housing needs — growing your family or settling long-term — while also treating your budget as tightly critical today. Committing at the very edge of your current budget leaves little room to adapt if those plans materialize.",
      severity: "medium",
      options: [
        {
          label: "Build in a buffer now",
          description: "Leave some slack between your maximum budget and what you're actually approved for or willing to spend.",
          longTermConsequence: "You give up some property options today, but you're not financially stretched if your circumstances change as planned.",
        },
        {
          label: "Accept you may move again",
          description: "Optimize fully for today's budget and treat this as a stepping-stone home rather than a final one.",
          longTermConsequence: "Lower risk now, but moving again later carries real transaction costs — a reasonable choice only if you go in expecting it.",
        },
      ],
    });
  }

  if (hasSignal(tags, LONG_TERM_OWNERSHIP) && hasSignal(tags, FLEXIBLE_TENURE)) {
    conflicts.push({
      id: "ownership-vs-flexibility",
      categories: ["lifestyle"],
      title: "You've described wanting both long-term stability and flexibility",
      description:
        "You've mentioned wanting a long-term or permanent home, but also flexibility or a short-term arrangement. These usually point to different property types entirely — buying vs. renting, or a long lease vs. a short one — and are worth resolving before searching further, since they lead to different neighborhoods and property types.",
      severity: "high",
      options: [
        {
          label: "Clarify the real time horizon",
          description: "Decide honestly whether the next move is 1–2 years out or genuinely open-ended — the answer changes what's worth optimizing for.",
          longTermConsequence:
            "Buying with a short real horizon risks transaction costs eating any gains; renting long-term when you're actually settled means paying for flexibility you're not using.",
        },
        {
          label: "Rent now, buy later",
          description: "Treat this as two separate decisions in sequence rather than one property that has to satisfy both.",
          longTermConsequence: "You keep flexibility while your plans firm up, at the cost of not building home equity during that period.",
        },
      ],
    });
  }

  if (hasSignal(tags, PARKING) && wantsShortCentralCommute) {
    conflicts.push({
      id: "parking-vs-central-location",
      categories: ["commute", "lifestyle"],
      title: "Parking vs. a central location",
      description:
        "You've listed parking as a must-have alongside a short, central commute. Dedicated parking is scarce and often expensive in dense, central Swedish neighborhoods — the two requirements compete for the same limited supply.",
      severity: "medium",
      options: [
        {
          label: "Keep parking, loosen the commute",
          description: "Allow a slightly longer commute in exchange for guaranteed, affordable parking.",
          longTermConsequence: "More predictable costs for your car, at the expense of a few extra minutes each day.",
        },
        {
          label: "Keep the location, rely on transit",
          description: "Consider whether you actually need a car if you're living somewhere this central — public transit may cover most of what parking was solving for.",
          longTermConsequence:
            "You could save meaningfully on parking, insurance, and possibly the car itself, but only if your actual usage pattern supports it.",
        },
      ],
    });
  }

  if (hasSignal(tags, ACCESSIBILITY) && hasSignal(tags, HISTORIC)) {
    conflicts.push({
      id: "accessibility-vs-older-buildings",
      categories: ["lifestyle"],
      title: "Accessibility needs vs. a preference for older, characterful buildings",
      description:
        "You've indicated both an accessibility requirement and a preference for historic or characterful buildings. Older buildings, especially in Swedish city centers, disproportionately lack elevators, step-free entries, or other accessibility features that newer construction is required to include.",
      severity: "medium",
      options: [
        {
          label: "Prioritize accessibility",
          description: "Treat accessibility as non-negotiable and look at well-designed newer buildings instead.",
          longTermConsequence:
            "You may give up some architectural character, but day-to-day livability is something you'll experience constantly, while charm is something you'll notice less over time.",
        },
        {
          label: "Look for renovated exceptions",
          description: "Some older buildings have been retrofitted with elevators or step-free access — these exist, but are less common and worth specifically asking about.",
          longTermConsequence: "This preserves both preferences if you find one, but narrows the realistic pool of options significantly.",
        },
      ],
    });
  }

  return conflicts;
}
