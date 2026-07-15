// Property prices are SEK and areas are square meters (see
// lib/mock-properties.ts — Sweden is the initial market). Formatted with
// sv-SE regardless of UI language, the same way a real listing site shows
// local currency/units no matter what language you're browsing in — these
// are facts about the data, not UI chrome that next-intl should translate.

const CURRENCY_FORMATTER = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  maximumFractionDigits: 0,
});

const AREA_FORMATTER = new Intl.NumberFormat("sv-SE");

export function formatPrice(amount: number): string {
  return CURRENCY_FORMATTER.format(amount);
}

export function formatArea(sqm: number): string {
  return `${AREA_FORMATTER.format(sqm)} m²`;
}
