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
  { name: "my-searches signed out (sv)", path: "/my-searches" },
  { name: "my-searches signed out (en)", path: "/en/my-searches" },
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

test("decision report page has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/en/onboarding");
  await page
    .getByLabel("Your priorities")
    .fill("We need a 3 bedroom home under $500,000, no more than a 30 minute drive, near good schools.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();
  await page.getByRole("button", { name: "See my matches" }).click();
  await expect(page.getByRole("heading", { name: "Your decision, explained" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("decision report page with detected conflicts and an expanded property card has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await page
    .getByLabel("Your priorities")
    .fill(
      "4 bedroom home under 6000000 kr, 15 minute drive, quiet, family-friendly, good schools and safety. We have pets and want to be near nightlife.",
    );
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();
  await page.getByRole("button", { name: "See my matches" }).click();
  await expect(page.getByRole("heading", { name: "Your decision, explained" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Detected conflicts" })).toBeVisible();

  // Expand a conflict's compromises and a property card's full analysis so
  // axe scans the disclosed content too, not just the collapsed state.
  await page.getByText("See realistic compromises").first().click();
  await page.getByText("See the full analysis behind this score").first().click();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("guided onboarding clarifying-question screen has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await page.getByLabel("Your priorities").fill("Looking for a nice place to live.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "A couple of quick questions" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("guided onboarding summary screen has no automatically detectable accessibility violations", async ({
  page,
}) => {
  await page.goto("/en/onboarding");
  await page.getByLabel("Your priorities").fill("Looking for a nice place to live.");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "A couple of quick questions" })).toBeVisible();

  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Not sure — skip this" }).click();
  }
  await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});

test("sign-in dialog has no automatically detectable accessibility violations", async ({ page }) => {
  await page.goto("/en");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
