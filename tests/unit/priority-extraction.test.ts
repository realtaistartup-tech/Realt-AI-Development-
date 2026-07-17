import { describe, expect, it } from "vitest";

import { extractPrioritiesHeuristically } from "@/services/ai/priority-extraction";

describe("extractPrioritiesHeuristically", () => {
  it("extracts a budget figure mentioned with a dollar sign", () => {
    const { priorities } = extractPrioritiesHeuristically("Looking for a home under $450,000.");
    expect(priorities.budgetMax).toBe(450_000);
  });

  it("extracts bedroom and bathroom counts", () => {
    const { priorities } = extractPrioritiesHeuristically("We need 3 bedrooms and 2 bathrooms.");
    expect(priorities.minBedrooms).toBe(3);
    expect(priorities.minBathrooms).toBe(2);
  });

  it("extracts a Swedish bedroom count (sovrum)", () => {
    const { priorities, confidence } = extractPrioritiesHeuristically("Vi behöver 4 sovrum.");
    expect(priorities.minBedrooms).toBe(4);
    expect(confidence.space).toBe(true);
  });

  it("detects a transit commute preference", () => {
    const { priorities } = extractPrioritiesHeuristically("I'd like to commute by train.");
    expect(priorities.commuteMode).toBe("transit");
  });

  it("raises school importance when schools are mentioned", () => {
    const { priorities } = extractPrioritiesHeuristically("Good schools are important to us.");
    const schoolWeight = priorities.weights.find((w) => w.category === "schools");
    expect(schoolWeight?.importance).toBe(5);
  });

  it("raises school importance for the Swedish word (skolor)", () => {
    const { priorities, confidence } = extractPrioritiesHeuristically("Nära bra skolor är viktigt.");
    const schoolWeight = priorities.weights.find((w) => w.category === "schools");
    expect(schoolWeight?.importance).toBe(5);
    expect(confidence.weights).toBe(true);
  });

  it("raises safety importance for Swedish safety words (säker/trygg)", () => {
    const { priorities } = extractPrioritiesHeuristically("Vi vill ha ett tryggt och säkert område.");
    const safetyWeight = priorities.weights.find((w) => w.category === "safety");
    expect(safetyWeight?.importance).toBe(5);
  });

  it("does not fabricate lifestyle tags that were never mentioned", () => {
    const { priorities } = extractPrioritiesHeuristically("We need a 2 bedroom apartment.");
    expect(priorities.lifestyleTags).toHaveLength(0);
  });

  it("recognizes a pets signal", () => {
    const { priorities } = extractPrioritiesHeuristically("We have two dogs and need a pet-friendly place.");
    expect(priorities.lifestyleTags).toContain("pets");
  });

  it("recognizes a work-from-home signal", () => {
    const { priorities } = extractPrioritiesHeuristically("I work from home most days and need a home office.");
    expect(priorities.lifestyleTags).toContain("home-office");
  });

  it("recognizes parking as a must-have", () => {
    const { priorities } = extractPrioritiesHeuristically("We need dedicated parking for two cars.");
    expect(priorities.mustHaves).toContain("parking");
  });

  it("recognizes conflicting tenure signals in the same text", () => {
    const { priorities } = extractPrioritiesHeuristically(
      "Looking for our forever home, but we might relocate for work in a year so want to stay flexible.",
    );
    expect(priorities.lifestyleTags).toContain("long-term-ownership");
    expect(priorities.lifestyleTags).toContain("flexible-tenure");
  });

  describe("confidence", () => {
    it("is false on every field for a vague description", () => {
      const { confidence } = extractPrioritiesHeuristically("Looking for a nice place to live.");
      expect(confidence).toEqual({ budget: false, commute: false, space: false, weights: false });
    });

    it("is true on every field for a fully specified description", () => {
      const { confidence } = extractPrioritiesHeuristically(
        "We need a 3 bedroom home under $500,000, no more than a 30 minute commute, near good schools.",
      );
      expect(confidence).toEqual({ budget: true, commute: true, space: true, weights: true });
    });

    it("reflects only the fields actually mentioned, not the ones defaulted", () => {
      const { confidence } = extractPrioritiesHeuristically("Under $500,000 please.");
      expect(confidence.budget).toBe(true);
      expect(confidence.commute).toBe(false);
      expect(confidence.space).toBe(false);
      expect(confidence.weights).toBe(false);
    });
  });
});
