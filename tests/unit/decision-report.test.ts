import { describe, expect, it } from "vitest";

import { MAX_TOP_MATCHES, buildDecisionReport, confidenceTier } from "@/services/report/decision-report";
import type { PriorityConfidence, Property, UserPriorities } from "@/types";

const FULL_CONFIDENCE: PriorityConfidence = {
  budget: true,
  commute: true,
  space: true,
  weights: true,
};

function makePriorities(overrides: Partial<UserPriorities> = {}): UserPriorities {
  return {
    budgetMin: 3_000_000,
    budgetMax: 5_000_000,
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
    price: 4_000_000,
    bedrooms: 3,
    bathrooms: 2,
    areaSqm: 90,
    commuteMinutesByMode: { drive: 20 },
    amenities: ["parking", "dishwasher"],
    lifestyleTags: ["quiet"],
    yearBuilt: 2010,
    neighborhoodSafetyScore: 85,
    schoolRating: 8,
    imageUrl: "/test.svg",
    description: "A test property.",
    ...overrides,
  };
}

describe("confidenceTier", () => {
  it("is high at 100 and 75", () => {
    expect(confidenceTier(100)).toBe("high");
    expect(confidenceTier(75)).toBe("high");
  });

  it("is medium at 50", () => {
    expect(confidenceTier(50)).toBe("medium");
  });

  it("is low below 50", () => {
    expect(confidenceTier(25)).toBe("low");
    expect(confidenceTier(0)).toBe("low");
  });
});

describe("buildDecisionReport", () => {
  it("sets the Realt Score to the best non-excluded match's score", () => {
    const properties = [
      makeProperty({ id: "weak", price: 9_000_000 }),
      makeProperty({ id: "strong", price: 4_000_000 }),
    ];
    const report = buildDecisionReport(makePriorities(), FULL_CONFIDENCE, properties);
    const best = report.topMatches[0];
    expect(report.realtScore).toBe(best.score);
    expect(best.property.id).toBe("strong");
  });

  it("computes the confidence score as a percentage of confirmed fields", () => {
    const report = buildDecisionReport(
      makePriorities(),
      { budget: true, commute: true, space: false, weights: false },
      [makeProperty()],
    );
    expect(report.confidenceScore).toBe(50);
    expect(report.confidenceTier).toBe("medium");
  });

  it("ranks priorities by importance, descending, with a stable tie-break", () => {
    const report = buildDecisionReport(
      makePriorities({
        weights: [
          { category: "budget", importance: 3 },
          { category: "commute", importance: 5 },
          { category: "space", importance: 3 },
          { category: "safety", importance: 5 },
          { category: "schools", importance: 1 },
          { category: "lifestyle", importance: 3 },
        ],
      }),
      FULL_CONFIDENCE,
      [makeProperty()],
    );
    expect(report.priorityRanking[0]).toEqual({ category: "commute", importance: 5, rank: 1 });
    expect(report.priorityRanking[1]).toEqual({ category: "safety", importance: 5, rank: 2 });
    expect(report.priorityRanking.at(-1)).toEqual({ category: "schools", importance: 1, rank: 6 });
  });

  it("surfaces the top match's missed must-haves as compromises", () => {
    const report = buildDecisionReport(
      makePriorities({ mustHaves: ["gym"] }),
      FULL_CONFIDENCE,
      [makeProperty({ amenities: ["parking"] })],
    );
    expect(report.compromises.length).toBeGreaterThan(0);
    expect(report.compromises[0]).toContain("gym");
  });

  it("returns no compromises when the top match has everything asked for", () => {
    const report = buildDecisionReport(
      makePriorities({ mustHaves: ["parking"] }),
      FULL_CONFIDENCE,
      [makeProperty({ amenities: ["parking"] })],
    );
    expect(report.compromises).toEqual([]);
  });

  it("derives long-term consequences from detected conflicts, most severe first", () => {
    const report = buildDecisionReport(
      makePriorities({ budgetMin: 600_000, budgetMax: 400_000 }),
      FULL_CONFIDENCE,
      [makeProperty()],
    );
    expect(report.longTermConsequences.length).toBeGreaterThan(0);
    expect(report.longTermConsequences[0]).toContain("Fix the numbers");
  });

  it("derives likely-to-appreciate statements from the top match's strong factors", () => {
    const report = buildDecisionReport(
      makePriorities({ budgetMax: 10_000_000, budgetMin: 0 }),
      FULL_CONFIDENCE,
      [makeProperty({ price: 4_000_000 })],
    );
    expect(report.likelyToAppreciate.length).toBeGreaterThan(0);
    expect(report.likelyToAppreciate.some((s) => s.includes("matter more, not less"))).toBe(true);
  });

  it("derives likely-to-regret statements from the top match's risk factors", () => {
    const report = buildDecisionReport(
      makePriorities({ minBedrooms: 5 }),
      FULL_CONFIDENCE,
      [makeProperty({ bedrooms: 1 })],
    );
    expect(report.likelyToRegret.length).toBeGreaterThan(0);
  });

  it("never lists the same factor in both likelyToAppreciate and likelyToRegret", () => {
    // Short by exactly one bedroom scores 75 (the appreciate threshold)
    // while still being a risk factor — this must resolve to regret only.
    const report = buildDecisionReport(
      makePriorities({ minBedrooms: 4 }),
      FULL_CONFIDENCE,
      [makeProperty({ bedrooms: 3 })],
    );
    const overlap = report.likelyToAppreciate.filter((s) => report.likelyToRegret.includes(s));
    expect(overlap).toEqual([]);
    expect(report.likelyToRegret.some((s) => s.includes("Falls short on space"))).toBe(true);
  });

  it("returns empty appreciate/regret when there is no qualifying match", () => {
    const report = buildDecisionReport(
      makePriorities({ dealBreakers: ["no elevator"] }),
      FULL_CONFIDENCE,
      [makeProperty({ amenities: ["no elevator"] })],
    );
    expect(report.realtScore).toBe(0);
    expect(report.likelyToAppreciate).toEqual([]);
    expect(report.likelyToRegret).toEqual([]);
    expect(report.compromises).toEqual([]);
    expect(report.topMatches).toEqual([]);
  });

  it("asks about every unconfirmed field", () => {
    const report = buildDecisionReport(
      makePriorities(),
      { budget: false, commute: false, space: true, weights: true },
      [makeProperty()],
    );
    expect(report.openQuestions.some((q) => q.toLowerCase().includes("budget"))).toBe(true);
    expect(report.openQuestions.some((q) => q.toLowerCase().includes("commute"))).toBe(true);
  });

  it("excludes low-severity conflicts from open questions", () => {
    const report = buildDecisionReport(
      makePriorities({
        commuteMaxMinutes: 15,
        lifestyleTags: ["nature"],
        weights: [
          { category: "budget", importance: 3 },
          { category: "commute", importance: 4 },
          { category: "space", importance: 3 },
          { category: "safety", importance: 3 },
          { category: "schools", importance: 3 },
          { category: "lifestyle", importance: 3 },
        ],
      }),
      FULL_CONFIDENCE,
      [makeProperty()],
    );
    const lowConflictPresent = report.conflicts.some((c) => c.id === "commute-vs-lifestyle-nature");
    expect(lowConflictPresent).toBe(true);
    expect(
      report.openQuestions.some((q) => q.includes("peaceful, natural setting")),
    ).toBe(false);
  });

  it("caps top matches at MAX_TOP_MATCHES", () => {
    const properties = Array.from({ length: MAX_TOP_MATCHES + 5 }, (_, i) =>
      makeProperty({ id: `p-${i}`, price: 3_000_000 + i * 10_000 }),
    );
    const report = buildDecisionReport(makePriorities(), FULL_CONFIDENCE, properties);
    expect(report.topMatches.length).toBe(MAX_TOP_MATCHES);
  });

  it("excludes deal-breaker matches from top matches entirely", () => {
    const properties = [
      makeProperty({ id: "excluded", amenities: ["no elevator"] }),
      makeProperty({ id: "included" }),
    ];
    const report = buildDecisionReport(
      makePriorities({ dealBreakers: ["no elevator"] }),
      FULL_CONFIDENCE,
      properties,
    );
    expect(report.topMatches.every((m) => m.property.id !== "excluded")).toBe(true);
  });
});
