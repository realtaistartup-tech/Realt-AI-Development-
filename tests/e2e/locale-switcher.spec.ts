import { test, expect } from "@playwright/test";

test.describe("Locale switcher", () => {
  test.use({ locale: "sv-SE" });

  test("switches from Swedish to English and back via the header control", async ({ page }) => {
    await page.goto("/sv");

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Letar du efter ett nytt hem? Du har hittat rätt.");

    await page.getByRole("button", { name: "Språk" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();

    await expect(page).toHaveURL(new URL("/", page.url()).href);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Looking for a new home? You've found the right place.");

    await page.getByRole("button", { name: "Language" }).click();
    await page.getByRole("menuitemradio", { name: "Svenska" }).click();

    await expect(page).toHaveURL(/\/sv\/?$/);

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Letar du efter ett nytt hem? Du har hittat rätt.");
  });

  test("preserves the current page when switching locale", async ({ page }) => {
    await page.goto("/sv/onboarding");

    await page.getByRole("button", { name: "Språk" }).click();
    await page.getByRole("menuitemradio", { name: "English" }).click();

    await expect(page).toHaveURL(new URL("/onboarding", page.url()).href);

    await expect(
      page.getByRole("heading", {
        name: "Tell us what you're looking for",
        level: 1,
      })
    ).toBeVisible();
  });
});