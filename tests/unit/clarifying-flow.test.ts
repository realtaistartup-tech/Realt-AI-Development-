import { describe, expect, it } from "vitest";

import {
  MAX_FOLLOW_UP_QUESTIONS,
  isReadyForReview,
  nextClarifyingField,
} from "@/services/onboarding/clarifying-flow";
import type { PriorityConfidence } from "@/types";

const ALL_CONFIDENT: PriorityConfidence = { budget: true, commute: true, space: true, weights: true };
const NONE_CONFIDENT: PriorityConfidence = {
  budget: false,
  commute: false,
  space: false,
  weights: false,
};

describe("nextClarifyingField", () => {
  it("returns null when every field is already confident", () => {
    expect(nextClarifyingField(ALL_CONFIDENT, [])).toBeNull();
  });

  it("returns budget first when nothing is confident", () => {
    expect(nextClarifyingField(NONE_CONFIDENT, [])).toBe("budget");
  });

  it("follows priority order: budget, then commute, then space, then weights", () => {
    expect(nextClarifyingField({ ...NONE_CONFIDENT, budget: true }, [])).toBe("commute");
    expect(nextClarifyingField({ ...NONE_CONFIDENT, budget: true, commute: true }, [])).toBe("space");
    expect(
      nextClarifyingField({ ...NONE_CONFIDENT, budget: true, commute: true, space: true }, []),
    ).toBe("weights");
  });

  it("skips a field once it has already been asked, even if still unconfident", () => {
    expect(nextClarifyingField(NONE_CONFIDENT, ["budget"])).toBe("commute");
  });

  it("returns null once every unconfident field has been asked", () => {
    expect(nextClarifyingField(NONE_CONFIDENT, ["budget", "commute", "space", "weights"])).toBeNull();
  });

  it("never asks more than MAX_FOLLOW_UP_QUESTIONS regardless of confidence", () => {
    expect(MAX_FOLLOW_UP_QUESTIONS).toBe(4);
    const askedThree: Array<keyof PriorityConfidence> = ["budget", "commute", "space"];
    // A 4th field is still legitimately askable...
    expect(nextClarifyingField(NONE_CONFIDENT, askedThree)).toBe("weights");
    // ...but once 4 have been asked, the cap stops a 5th regardless of state.
    const askedFour: Array<keyof PriorityConfidence> = ["budget", "commute", "space", "weights"];
    expect(nextClarifyingField(NONE_CONFIDENT, askedFour)).toBeNull();
  });
});

describe("isReadyForReview", () => {
  it("is true when nothing needs asking", () => {
    expect(isReadyForReview(ALL_CONFIDENT, [])).toBe(true);
  });

  it("is false while a field still needs asking", () => {
    expect(isReadyForReview(NONE_CONFIDENT, [])).toBe(false);
  });

  it("becomes true once every field has been asked or is confident", () => {
    expect(isReadyForReview(NONE_CONFIDENT, ["budget", "commute", "space", "weights"])).toBe(true);
  });
});
