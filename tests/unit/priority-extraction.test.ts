import { describe, expect, it } from "vitest";

import { extractPrioritiesHeuristically } from "@/services/ai/priority-extraction";

describe("extractPrioritiesHeuristically", () => {
  it("extracts a budget figure mentioned with a dollar sign", () => {
    const priorities = extractPrioritiesHeuristically("Looking for a home under $450,000.");
    expect(priorities.budgetMax).toBe(450_000);
  });

  it("extracts bedroom and bathroom counts", () => {
    const priorities = extractPrioritiesHeuristically("We need 3 bedrooms and 2 bathrooms.");
    expect(priorities.minBedrooms).toBe(3);
    expect(priorities.minBathrooms).toBe(2);
  });

  it("detects a transit commute preference", () => {
    const priorities = extractPrioritiesHeuristically("I'd like to commute by train.");
    expect(priorities.commuteMode).toBe("transit");
  });

  it("raises school importance when schools are mentioned", () => {
    const priorities = extractPrioritiesHeuristically("Good schools are important to us.");
    const schoolWeight = priorities.weights.find((w) => w.category === "schools");
    expect(schoolWeight?.importance).toBe(5);
  });

  it("does not fabricate lifestyle tags that were never mentioned", () => {
    const priorities = extractPrioritiesHeuristically("We need a 2 bedroom apartment.");
    expect(priorities.lifestyleTags).toHaveLength(0);
  });
});
