import { describe, expect, it } from "vitest";

import { detectPriorityConflicts } from "@/services/matching/conflict-detection";
import type { UserPriorities } from "@/types";

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

function withWeights(overrides: Record<string, number>): UserPriorities["weights"] {
  const base = { budget: 3, commute: 3, space: 3, safety: 3, schools: 3, lifestyle: 3, ...overrides };
  return Object.entries(base).map(([category, importance]) => ({
    category: category as UserPriorities["weights"][number]["category"],
    importance,
  }));
}

const ids = (priorities: UserPriorities) =>
  detectPriorityConflicts(priorities).map((conflict) => conflict.id);

describe("conflict-detection fixes", () => {
  describe("deal-breakers are not wishes", () => {
    it("does not create a nightlife conflict when nightlife is a deal-breaker", () => {
      expect(
        ids(makePriorities({ lifestyleTags: ["quiet"], dealBreakers: ["nightlife"] })),
      ).not.toContain("nightlife-vs-noise-sensitivity");
    });

    it("does not create a nature vs. city conflict when city center is a deal-breaker", () => {
      expect(
        ids(makePriorities({ lifestyleTags: ["nature"], dealBreakers: ["city center"] })),
      ).not.toContain("nature-vs-city-center");
    });

    it("still creates the conflict when both are real wishes", () => {
      expect(
        ids(makePriorities({ lifestyleTags: ["nightlife", "quiet"] })),
      ).toContain("nightlife-vs-noise-sensitivity");
    });
  });

  describe("whole-word matching", () => {
    it("does not read 'cat' inside 'location' as a pet", () => {
      expect(ids(makePriorities({ lifestyleTags: ["great location"] }))).not.toContain(
        "pets-vs-rental-restrictions",
      );
    });

    it("does not read 'pet' inside 'carpet' as a pet", () => {
      expect(ids(makePriorities({ mustHaves: ["carpet"] }))).not.toContain(
        "pets-vs-rental-restrictions",
      );
    });

    it("does not read 'nature' inside 'signature' as nature", () => {
      expect(
        ids(makePriorities({ lifestyleTags: ["signature", "nightlife"] })),
      ).not.toContain("nature-vs-city-center");
    });

    it("still recognizes plurals and hyphenated tags", () => {
      expect(ids(makePriorities({ lifestyleTags: ["dogs"] }))).toContain(
        "pets-vs-rental-restrictions",
      );
      expect(ids(makePriorities({ minBedrooms: 1, lifestyleTags: ["Home-Office"] }))).toContain(
        "wfh-vs-layout",
      );
    });

    it("does not treat 'flexible layout' as flexible tenure", () => {
      expect(
        ids(makePriorities({ lifestyleTags: ["forever home", "flexible layout"] })),
      ).not.toContain("ownership-vs-flexibility");
    });
  });

  describe("rentals are not judged by a purchase price", () => {
    const weights = withWeights({ safety: 5, budget: 5 });

    it("does not call a rent budget 'tight' for safety vs. affordability", () => {
      expect(
        ids(
          makePriorities({
            housingIntent: "rent",
            budgetMin: 8_000,
            budgetMax: 12_000,
            weights,
          }),
        ),
      ).not.toContain("safety-vs-affordability");
    });

    it("does not call a rent budget 'tight' for future plans vs. budget", () => {
      expect(
        ids(
          makePriorities({
            housingIntent: "rent",
            budgetMin: 8_000,
            budgetMax: 12_000,
            weights: withWeights({ budget: 5 }),
            lifestyleTags: ["family-growth-planned"],
          }),
        ),
      ).not.toContain("future-plans-vs-budget");
    });

    it("still flags a tight purchase budget", () => {
      expect(
        ids(makePriorities({ housingIntent: "buy", budgetMax: 3_000_000, weights })),
      ).toContain("safety-vs-affordability");
    });
  });
});
