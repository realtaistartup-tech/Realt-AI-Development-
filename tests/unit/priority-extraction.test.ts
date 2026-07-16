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

  it("recognizes a pets signal", () => {
    const priorities = extractPrioritiesHeuristically("We have two dogs and need a pet-friendly place.");
    expect(priorities.lifestyleTags).toContain("pets");
  });

  it("recognizes a work-from-home signal", () => {
    const priorities = extractPrioritiesHeuristically("I work from home most days and need a home office.");
    expect(priorities.lifestyleTags).toContain("home-office");
  });

  it("recognizes parking as a must-have", () => {
    const priorities = extractPrioritiesHeuristically("We need dedicated parking for two cars.");
    expect(priorities.mustHaves).toContain("parking");
  });

  it("recognizes conflicting tenure signals in the same text", () => {
    const priorities = extractPrioritiesHeuristically(
      "Looking for our forever home, but we might relocate for work in a year so want to stay flexible.",
    );
    expect(priorities.lifestyleTags).toContain("long-term-ownership");
    expect(priorities.lifestyleTags).toContain("flexible-tenure");
  });
});
