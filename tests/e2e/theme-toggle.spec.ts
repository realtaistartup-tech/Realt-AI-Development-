import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test("cycles light → dark → system and updates the document class", async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: /Switch theme/ });
    const html = page.locator("html");

    await toggle.click();
    await expect(toggle).toHaveAccessibleName(/currently light/);
    await expect(html).not.toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName(/currently dark/);
    await expect(html).toHaveClass(/dark/);

    await toggle.click();
    await expect(toggle).toHaveAccessibleName(/currently system/);
  });
});
