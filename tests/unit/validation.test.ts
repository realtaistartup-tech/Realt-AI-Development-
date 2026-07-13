import { describe, expect, it } from "vitest";

import { priorityIntakeRequestSchema, userPrioritiesSchema } from "@/lib/validation";

const VALID_PRIORITIES = {
  budgetMin: 100_000,
  budgetMax: 500_000,
  commuteMaxMinutes: 30,
  commuteMode: "drive" as const,
  minBedrooms: 2,
  minBathrooms: 1,
  mustHaves: ["parking"],
  dealBreakers: [],
  lifestyleTags: ["quiet"],
  weights: [{ category: "budget" as const, importance: 4 }],
};

describe("userPrioritiesSchema", () => {
  it("accepts a valid priorities payload", () => {
    expect(userPrioritiesSchema.safeParse(VALID_PRIORITIES).success).toBe(true);
  });

  it("rejects budgetMin greater than budgetMax", () => {
    const result = userPrioritiesSchema.safeParse({
      ...VALID_PRIORITIES,
      budgetMin: 600_000,
      budgetMax: 500_000,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unrecognized commute mode", () => {
    const result = userPrioritiesSchema.safeParse({
      ...VALID_PRIORITIES,
      commuteMode: "teleport",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative bedroom counts", () => {
    const result = userPrioritiesSchema.safeParse({ ...VALID_PRIORITIES, minBedrooms: -1 });
    expect(result.success).toBe(false);
  });

  it("rejects more must-haves than the allowed maximum", () => {
    const result = userPrioritiesSchema.safeParse({
      ...VALID_PRIORITIES,
      mustHaves: Array.from({ length: 11 }, (_, i) => `item-${i}`),
    });
    expect(result.success).toBe(false);
  });
});

describe("priorityIntakeRequestSchema", () => {
  it("rejects an empty answer", () => {
    expect(priorityIntakeRequestSchema.safeParse({ answers: "" }).success).toBe(false);
  });

  it("rejects an answer over the length limit", () => {
    const result = priorityIntakeRequestSchema.safeParse({ answers: "a".repeat(5000) });
    expect(result.success).toBe(false);
  });

  it("accepts a reasonable free-text answer", () => {
    const result = priorityIntakeRequestSchema.safeParse({
      answers: "We want a 3 bedroom home under $500,000 near good schools.",
    });
    expect(result.success).toBe(true);
  });
});
