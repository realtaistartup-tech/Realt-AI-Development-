import { describe, expect, it } from "vitest";
import type { MatchFactor, Property, UserPriorities } from "@/types";
import {
  rankProperties,
  scoreProperty,
} from "@/services/matching/score-engine";

function makeWeights(importance: number): UserPriorities["weights"] {
  return [
    { category: "budget", importance },
    { category: "commute", importance },
    { category: "space", importance },
    { category: "safety", importance },
    { category: "schools", importance },
    { category: "lifestyle", importance },
  ];
}

function makePriorities(
  overrides: Partial<UserPriorities> = {},
): UserPriorities {
  return {
    budgetMin: 2_000_000,
    budgetMax: 4_000_000,
    housingIntent: "buy",
    commuteMaxMinutes: 30,
    commuteMode: "transit",
    minBedrooms: 2,
    minBathrooms: 1,
    mustHaves: [],
    dealBreakers: [],
    lifestyleTags: [],
    weights: makeWeights(3),
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "test-1",
    title: "Test property",
    address: "Testgatan 1",
    city: "Stockholm",
    price: 3_000_000,
    listingType: "buy",
    bedrooms: 3,
    bathrooms: 1,
    areaSqm: 80,
    commuteMinutesByMode: { transit: 20 },
    amenities: ["balcony"],
    lifestyleTags: [],
    yearBuilt: 2010,
    neighborhoodSafetyScore: 80,
    schoolRating: 8,
    imageUrl: "",
    description: "A normal apartment.",
    ...overrides,
  };
}

function getFactor(
  factors: MatchFactor[],
  category: MatchFactor["category"],
): MatchFactor {
  const factor = factors.find((item) => item.category === category);

  if (!factor) {
    throw new Error(`Factor "${category}" was not found in the result.`);
  }

  return factor;
}

describe("score-engine fixes", () => {
  describe("commute scoring", () => {
    it("gives a shorter commute a higher score than a longer one within the limit", () => {
      const priorities = makePriorities();

      const short = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 5 } }),
        priorities,
      );
      const long = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 25 } }),
        priorities,
      );

      expect(getFactor(short.factors, "commute").score).toBeGreaterThan(
        getFactor(long.factors, "commute").score,
      );
    });

    it("scores exactly at the limit as 80 and a zero-minute commute as 100", () => {
      const priorities = makePriorities();

      const atLimit = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 30 } }),
        priorities,
      );
      const zero = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 0 } }),
        priorities,
      );

      expect(getFactor(atLimit.factors, "commute").score).toBe(80);
      expect(getFactor(zero.factors, "commute").score).toBe(100);
    });

    it("penalizes a commute that is over the limit", () => {
      const priorities = makePriorities();

      const over = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 40 } }),
        priorities,
      );

      const factor = getFactor(over.factors, "commute");

      expect(factor.score).toBeLessThan(80);
      expect(factor.isRisk).toBe(false); // exactly 10 min over is not yet a risk

      const wayOver = scoreProperty(
        makeProperty({ commuteMinutesByMode: { transit: 50 } }),
        priorities,
      );

      expect(getFactor(wayOver.factors, "commute").isRisk).toBe(true);
    });
  });

  describe("deal-breakers", () => {
    it("ignores empty or whitespace-only deal-breakers", () => {
      const result = scoreProperty(
        makeProperty(),
        makePriorities({ dealBreakers: ["", "   "] }),
      );

      expect(result.excluded).toBe(false);
      expect(result.score).toBeGreaterThan(0);
    });

    it("still excludes a property that has a real deal-breaker", () => {
      const result = scoreProperty(
        makeProperty({ amenities: ["Ground floor"] }),
        makePriorities({ dealBreakers: ["  ground floor "] }),
      );

      expect(result.excluded).toBe(true);
      expect(result.score).toBe(0);
      expect(result.exclusionReason).toContain("deal-breaker");
    });
  });

  describe("must-haves", () => {
    it("matches must-haves regardless of case and surrounding spaces", () => {
      const result = scoreProperty(
        makeProperty({ amenities: ["Balcony"] }),
        makePriorities({ mustHaves: ["  balcony "] }),
      );

      expect(result.compromises).toHaveLength(0);
    });

    it("ignores empty must-haves", () => {
      const result = scoreProperty(
        makeProperty(),
        makePriorities({ mustHaves: ["", "  "] }),
      );

      expect(result.compromises).toHaveLength(0);
    });

    it("lists a missing must-have as a compromise and lowers the score by 10", () => {
      const withMustHave = scoreProperty(
        makeProperty(),
        makePriorities({ mustHaves: ["elevator"] }),
      );
      const without = scoreProperty(makeProperty(), makePriorities());

      expect(withMustHave.compromises).toHaveLength(1);
      expect(without.score - withMustHave.score).toBe(10);
    });
  });

  describe("weights", () => {
    it("does not score everything as 0 when all weights are 0", () => {
      const result = scoreProperty(
        makeProperty(),
        makePriorities({ weights: makeWeights(0) }),
      );

      expect(result.excluded).toBe(false);
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe("summary", () => {
    it("mentions unmet must-haves in a strong match instead of saying 'few compromises'", () => {
      const perfect = makeProperty({
        price: 2_000_000,
        commuteMinutesByMode: { transit: 0 },
        neighborhoodSafetyScore: 100,
        schoolRating: 10,
      });

      const result = scoreProperty(
        perfect,
        makePriorities({ mustHaves: ["elevator"] }),
      );

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.summary).toContain("unmet must-have");
      expect(result.summary).not.toContain("few compromises");
    });
  });

  describe("housing type", () => {
    it("excludes a property of the wrong housing type", () => {
      const result = scoreProperty(
        makeProperty({ listingType: "rent" }),
        makePriorities({ housingIntent: "buy" }),
      );

      expect(result.excluded).toBe(true);
      expect(result.score).toBe(0);
    });

    it("does not exclude anything when the housing type is unknown", () => {
      const result = scoreProperty(
        makeProperty({ listingType: undefined }),
        makePriorities({ housingIntent: "buy" }),
      );

      expect(result.excluded).toBe(false);
    });

    it("does not exclude anything when the user has not chosen buy or rent", () => {
      const result = scoreProperty(
        makeProperty({ listingType: "rent" }),
        makePriorities({ housingIntent: undefined }),
      );

      expect(result.excluded).toBe(false);
    });
  });

  describe("critical budget", () => {
    it("excludes a property over budget when budget is critical", () => {
      const result = scoreProperty(
        makeProperty({ price: 5_000_000 }),
        makePriorities({
          weights: [
            { category: "budget", importance: 5 },
            { category: "commute", importance: 3 },
            { category: "space", importance: 3 },
            { category: "safety", importance: 3 },
            { category: "schools", importance: 3 },
            { category: "lifestyle", importance: 3 },
          ],
        }),
      );

      expect(result.excluded).toBe(true);
      expect(result.exclusionReason).toContain("critical");
    });

    it("keeps an over-budget property when budget is not critical", () => {
      const result = scoreProperty(
        makeProperty({ price: 5_000_000 }),
        makePriorities(),
      );

      expect(result.excluded).toBe(false);
    });
  });

  describe("ranking", () => {
    it("places excluded properties after eligible ones and sorts by score", () => {
      const priorities = makePriorities();

      const ranked = rankProperties(
        [
          makeProperty({ id: "wrong-type", listingType: "rent" }),
          makeProperty({ id: "weaker", neighborhoodSafetyScore: 40 }),
          makeProperty({ id: "stronger", neighborhoodSafetyScore: 95 }),
        ],
        priorities,
      );

      expect(ranked.map((item) => item.property.id)).toEqual([
        "stronger",
        "weaker",
        "wrong-type",
      ]);
    });
  });
});
