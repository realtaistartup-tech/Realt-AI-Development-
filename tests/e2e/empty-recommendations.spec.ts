import { test, expect } from "@playwright/test";

test.describe("Recommendations without prior priorities", () => {
  test.use({ locale: "en-US" });

  test("shows a guided empty state instead of erroring", async ({ page }) => {
    await page.goto("/recommendations");

    await expect(
      page.getByRole("heading", {
        name: "Let's start with your priorities first",
      }),
    ).toBeVisible();

    const cta = page.getByRole("link", {
      name: "Tell us what you're looking for",
    });

    await expect(cta).toBeVisible();

    await cta.click();

    await expect(page).toHaveURL(
      new URL("/assistant", page.url()).href,
    );
  });
});