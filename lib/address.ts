export interface ParsedAddress {
  street: string;
  houseNumber: string;
}

const TRAILING_NUMBER = /^(.*\S)\s+(\d+[A-Za-z]?)$/;

/**
 * Splits a Swedish street address like "Skånegatan 42" into a street name
 * and house number, so property cards can present them as the two distinct
 * fields the Realt Decision Report calls for. Mock data (lib/mock-properties.ts)
 * always has a trailing number, but this stays honest if that ever isn't
 * true — the whole string becomes the street name rather than guessing.
 */
export function parseAddress(address: string): ParsedAddress {
  const match = address.trim().match(TRAILING_NUMBER);
  if (!match) {
    return { street: address.trim(), houseNumber: "" };
  }
  return { street: match[1], houseNumber: match[2] };
}
