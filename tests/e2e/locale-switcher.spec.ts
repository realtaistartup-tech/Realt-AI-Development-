import { test, expect } from "@playwright/test";

test.describe("Locale switcher", () => {
  test.use({ locale: "sv-SE" });

  test("switches from Swedish to English and back via the header control", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Man köper inte en lägenhet");

    await page.getByLabel("Språk").click();
    await page.getByRole("option", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("People don't buy apartments");

    await page.getByLabel("Language").click();
    await page.getByRole("option", { name: "Svenska" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Man köper inte en lägenhet");
  });

  test("preserves the current page when switching locale", async ({ page }) => {
    await page.goto("/onboarding");
    await page.getByLabel("Språk").click();
    await page.getByRole("option", { name: "English" }).click();
    await expect(page).toHaveURL(/\/en\/onboarding$/);
    await expect(page.getByRole("heading", { name: "Tell us what you're looking for" })).toBeVisible();
  });
});
