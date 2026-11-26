import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test.use({ locale: "sv-SE" });

  test("footer links reach the privacy and terms pages", async ({ page }) => {
    await page.goto("/sv");

    await page.getByRole("link", { name: "Integritetspolicy" }).click();
    await expect(page).toHaveURL(/\/sv\/privacy$/);

    await expect(
      page.getByRole("heading", { name: "Integritetspolicy", level: 1 })
    ).toBeVisible();

    await expect(
      page.getByText("Utkast — ännu inte juridiskt granskat")
    ).toBeVisible();

    await page.goto("/sv");

    await page.getByRole("link", { name: "Användarvillkor" }).click();
    await expect(page).toHaveURL(/\/sv\/terms$/);

    await expect(
      page.getByRole("heading", { name: "Användarvillkor", level: 1 })
    ).toBeVisible();
  });

  test("back link on a legal page returns to the homepage", async ({ page }) => {
    await page.goto("/sv/privacy");

    await page.getByRole("link", { name: "Tillbaka till startsidan" }).click();

    await expect(page).toHaveURL(/\/sv\/?$/);
  });
});