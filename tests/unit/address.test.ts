import { describe, expect, it } from "vitest";

import { parseAddress } from "@/lib/address";

describe("parseAddress", () => {
  it("splits a street name and house number", () => {
    expect(parseAddress("Skånegatan 42")).toEqual({ street: "Skånegatan", houseNumber: "42" });
  });

  it("handles a multi-word street name", () => {
    expect(parseAddress("Klostergårdsvägen 22")).toEqual({
      street: "Klostergårdsvägen",
      houseNumber: "22",
    });
  });

  it("handles a house number with a letter suffix", () => {
    expect(parseAddress("Storgatan 12B")).toEqual({ street: "Storgatan", houseNumber: "12B" });
  });

  it("falls back to the whole string as the street when there is no trailing number", () => {
    expect(parseAddress("Gamla Stan")).toEqual({ street: "Gamla Stan", houseNumber: "" });
  });

  it("trims surrounding whitespace", () => {
    expect(parseAddress("  Odengatan 87  ")).toEqual({ street: "Odengatan", houseNumber: "87" });
  });
});
