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

describe("detectPriorityConflicts", () => {
  it("returns no conflicts for reasonable, non-competing priorities", () => {
    expect(detectPriorityConflicts(makePriorities())).toHaveLength(0);
  });

  it("every conflict includes a title, description, severity, and at least one option with a consequence", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ budgetMin: 600_000, budgetMax: 400_000 }),
    );
    for (const conflict of conflicts) {
      expect(conflict.id).toBeTruthy();
      expect(conflict.title).toBeTruthy();
      expect(conflict.description).toBeTruthy();
      expect(["low", "medium", "high"]).toContain(conflict.severity);
      expect(conflict.options.length).toBeGreaterThan(0);
      for (const option of conflict.options) {
        expect(option.label).toBeTruthy();
        expect(option.description).toBeTruthy();
        expect(option.longTermConsequence).toBeTruthy();
      }
    }
  });

  it("flags an inverted budget range as high severity", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ budgetMin: 600_000, budgetMax: 400_000 }),
    );
    expect(conflicts.find((c) => c.id === "inverted-budget-range")?.severity).toBe("high");
  });

  it("flags budget vs. location when both a short commute and budget are critical", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ commuteMaxMinutes: 10, weights: withWeights({ commute: 5, budget: 5 }) }),
    );
    expect(conflicts.some((c) => c.id === "budget-vs-location")).toBe(true);
  });

  it("flags space vs. budget at scale for 4+ bedrooms with both weighted critical", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ minBedrooms: 4, weights: withWeights({ space: 5, budget: 5 }) }),
    );
    expect(conflicts.some((c) => c.id === "space-vs-budget-scale")).toBe(true);
  });

  it("flags commute vs. a nature lifestyle when the commute is also short and critical", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({
        commuteMaxMinutes: 15,
        weights: withWeights({ commute: 5 }),
        lifestyleTags: ["nature"],
      }),
    );
    expect(conflicts.some((c) => c.id === "commute-vs-lifestyle-nature")).toBe(true);
  });

  it("does not flag commute vs. nature when the commute tolerance is generous", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ commuteMaxMinutes: 45, lifestyleTags: ["nature"] }),
    );
    expect(conflicts.some((c) => c.id === "commute-vs-lifestyle-nature")).toBe(false);
  });

  it("flags family growth plans against a small current bedroom requirement", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ minBedrooms: 1, lifestyleTags: ["family-growth-planned"] }),
    );
    expect(conflicts.some((c) => c.id === "family-growth-vs-space")).toBe(true);
  });

  it("does not flag family growth when the bedroom count already allows for it", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ minBedrooms: 4, lifestyleTags: ["family-growth-planned"] }),
    );
    expect(conflicts.some((c) => c.id === "family-growth-vs-space")).toBe(false);
  });

  it("flags safety vs. affordability for a tight, critical budget with critical safety", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({
        budgetMax: 3_000_000,
        weights: withWeights({ safety: 5, budget: 5 }),
      }),
    );
    expect(conflicts.some((c) => c.id === "safety-vs-affordability")).toBe(true);
  });

  it("flags nature vs. city-center when both are stated as lifestyle preferences", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ lifestyleTags: ["nature", "city center"] }),
    );
    const conflict = conflicts.find((c) => c.id === "nature-vs-city-center");
    expect(conflict?.severity).toBe("high");
  });

  it("flags nightlife vs. noise sensitivity when both are stated", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ lifestyleTags: ["nightlife", "quiet"] }),
    );
    const conflict = conflicts.find((c) => c.id === "nightlife-vs-noise-sensitivity");
    expect(conflict?.severity).toBe("high");
  });

  it("flags working from home vs. a studio/one-bedroom requirement", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ minBedrooms: 1, lifestyleTags: ["home-office"] }),
    );
    expect(conflicts.some((c) => c.id === "wfh-vs-layout")).toBe(true);
  });

  it("flags pets as narrowing the pool whenever pets are mentioned", () => {
    const conflicts = detectPriorityConflicts(makePriorities({ lifestyleTags: ["pets"] }));
    expect(conflicts.some((c) => c.id === "pets-vs-rental-restrictions")).toBe(true);
  });

  it("flags future plans vs. budget when family growth is planned on a tight, critical budget", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({
        budgetMax: 3_000_000,
        weights: withWeights({ budget: 5 }),
        lifestyleTags: ["family-growth-planned"],
      }),
    );
    expect(conflicts.some((c) => c.id === "future-plans-vs-budget")).toBe(true);
  });

  it("flags ownership vs. flexibility when both tenure signals are present", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ lifestyleTags: ["forever home", "flexible-tenure"] }),
    );
    const conflict = conflicts.find((c) => c.id === "ownership-vs-flexibility");
    expect(conflict?.severity).toBe("high");
  });

  it("flags parking vs. a central location when both are required", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({
        commuteMaxMinutes: 15,
        weights: withWeights({ commute: 5 }),
        mustHaves: ["parking"],
      }),
    );
    expect(conflicts.some((c) => c.id === "parking-vs-central-location")).toBe(true);
  });

  it("flags accessibility needs vs. a preference for historic buildings", () => {
    const conflicts = detectPriorityConflicts(
      makePriorities({ mustHaves: ["wheelchair accessible"], lifestyleTags: ["historic-character"] }),
    );
    expect(conflicts.some((c) => c.id === "accessibility-vs-older-buildings")).toBe(true);
  });

  it("does not flag accessibility alone without a competing historic preference", () => {
    const conflicts = detectPriorityConflicts(makePriorities({ mustHaves: ["wheelchair accessible"] }));
    expect(conflicts.some((c) => c.id === "accessibility-vs-older-buildings")).toBe(false);
  });
});
