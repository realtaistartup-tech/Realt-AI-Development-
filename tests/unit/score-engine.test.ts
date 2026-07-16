import { describe, expect, it } from "vitest";

import { rankProperties, scoreProperty } from "@/services/matching/score-engine";
import type { Property, UserPriorities } from "@/types";

function makePriorities(overrides: Partial<UserPriorities> = {}): UserPriorities {
  return {
    budgetMin: 300_000,
    budgetMax: 500_000,
    commuteMaxMinutes: 30,
    commuteMode: "drive",
    minBedrooms: 2,
    minBathrooms: 1,
    mustHaves: [],
    dealBreakers: [],
    lifestyleTags: [],
    weights: [
      { category: "budget", importance: 3 },
      { category: "commute", importance: 3 },
      { category: "space", importance: 3 },
      { category: "safety", importance: 3 },
      { category: "schools", importance: 3 },
      { category: "lifestyle", importance: 3 },
    ],
    ...overrides,
  };
}

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: "test-1",
    title: "Test Property",
    address: "1 Test St",
    city: "Testville",
    price: 400_000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 110,
    commuteMinutesByMode: { drive: 20 },
    amenities: ["parking", "dishwasher"],
    lifestyleTags: ["quiet"],
    yearBuilt: 2010,
    neighborhoodSafetyScore: 80,
    schoolRating: 7,
    imageUrl: "/test.svg",
    description: "A test property.",
    ...overrides,
  };
}

describe("scoreProperty", () => {
  it("scores a property within budget and requirements highly", () => {
    const result = scoreProperty(makeProperty(), makePriorities());
    expect(result.excluded).toBe(false);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("penalizes a property priced above the max budget", () => {
    const withinBudget = scoreProperty(makeProperty({ price: 450_000 }), makePriorities());
    const overBudget = scoreProperty(makeProperty({ price: 900_000 }), makePriorities());
    expect(overBudget.score).toBeLessThan(withinBudget.score);
  });

  it("penalizes a property with fewer bedrooms than required", () => {
    const result = scoreProperty(makeProperty({ bedrooms: 1 }), makePriorities({ minBedrooms: 3 }));
    const spaceFactor = result.factors.find((f) => f.category === "space");
    expect(spaceFactor?.isRisk).toBe(true);
    expect(result.concerns.length).toBeGreaterThan(0);
  });

  it("excludes a property that matches a stated deal-breaker", () => {
    const result = scoreProperty(
      makeProperty({ amenities: ["parking", "no elevator"] }),
      makePriorities({ dealBreakers: ["no elevator"] }),
    );
    expect(result.excluded).toBe(true);
    expect(result.score).toBe(0);
  });

  it("lists missed must-haves as compromises and lowers the score", () => {
    const withMustHave = scoreProperty(
      makeProperty({ amenities: ["parking", "gym"] }),
      makePriorities({ mustHaves: ["gym"] }),
    );
    const withoutMustHave = scoreProperty(
      makeProperty({ amenities: ["parking"] }),
      makePriorities({ mustHaves: ["gym"] }),
    );
    expect(withoutMustHave.compromises.length).toBeGreaterThan(0);
    expect(withoutMustHave.score).toBeLessThan(withMustHave.score);
  });

  it("never returns a score outside the 0-100 range", () => {
    const result = scoreProperty(
      makeProperty({ price: 5_000_000, bedrooms: 0, bathrooms: 0 }),
      makePriorities({ minBedrooms: 5, minBathrooms: 4, mustHaves: ["a", "b", "c"] }),
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("flags a risk as a critical concern when the user rated that factor critical", () => {
    const priorities = makePriorities({
      minBedrooms: 5,
      weights: [
        { category: "budget", importance: 3 },
        { category: "commute", importance: 3 },
        { category: "space", importance: 5 },
        { category: "safety", importance: 3 },
        { category: "schools", importance: 3 },
        { category: "lifestyle", importance: 3 },
      ],
    });
    const result = scoreProperty(makeProperty({ bedrooms: 1 }), priorities);

    const spaceFactor = result.factors.find((f) => f.category === "space");
    expect(spaceFactor?.isRisk).toBe(true);
    expect(result.criticalConcerns).toContain(spaceFactor?.explanation);
  });

  it("does not flag a risk as critical when the user rated that factor low importance", () => {
    const priorities = makePriorities({
      minBedrooms: 5,
      weights: [
        { category: "budget", importance: 3 },
        { category: "commute", importance: 3 },
        { category: "space", importance: 1 },
        { category: "safety", importance: 3 },
        { category: "schools", importance: 3 },
        { category: "lifestyle", importance: 3 },
      ],
    });
    const result = scoreProperty(makeProperty({ bedrooms: 1 }), priorities);

    const spaceFactor = result.factors.find((f) => f.category === "space");
    expect(spaceFactor?.isRisk).toBe(true);
    expect(result.concerns).toContain(spaceFactor?.explanation);
    expect(result.criticalConcerns).not.toContain(spaceFactor?.explanation);
  });

  it("returns no critical concerns when nothing critical is at risk", () => {
    const result = scoreProperty(makeProperty(), makePriorities());
    expect(result.criticalConcerns).toEqual([]);
  });
});

describe("rankProperties", () => {
  it("sorts properties by descending score", () => {
    const priorities = makePriorities();
    const results = rankProperties(
      [
        makeProperty({ id: "cheap-far", price: 200_000, commuteMinutesByMode: { drive: 90 } }),
        makeProperty({ id: "ideal", price: 400_000, commuteMinutesByMode: { drive: 15 } }),
      ],
      priorities,
    );
    expect(results[0].property.id).toBe("ideal");
  });

  it("always places excluded properties after non-excluded ones", () => {
    const priorities = makePriorities({ dealBreakers: ["basement"] });
    const results = rankProperties(
      [
        makeProperty({ id: "excluded", price: 200_000, amenities: ["basement"] }),
        makeProperty({ id: "weak-but-included", price: 2_000_000 }),
      ],
      priorities,
    );
    expect(results[results.length - 1].property.id).toBe("excluded");
  });
});
