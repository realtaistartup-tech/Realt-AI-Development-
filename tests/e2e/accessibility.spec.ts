import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  { name: "home (sv)", path: "/" },
  { name: "home (en)", path: "/en" },
  { name: "onboarding (sv)", path: "/onboarding" },
  { name: "onboarding (en)", path: "/en/onboarding" },
  { name: "privacy (sv)", path: "/privacy" },
  { name: "privacy (en)", path: "/en/privacy" },
  { name: "terms (sv)", path: "/terms" },
  { name: "terms (en)", path: "/en/terms" },
];

for (const { name, path } of PAGES) {
  test(`${name} has no automatically detectable accessibility violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("recommendations page has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/en/onboarding");
  await page
    .getByLabel("Your priorities")
    .fill("We need a 3 bedroom home under $500,000 near good schools.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Review your priorities" })).toBeVisible();
  await page.getByRole("button", { name: "See my matches" }).click();
  await expect(page.getByRole("heading", { name: "Your matches" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
