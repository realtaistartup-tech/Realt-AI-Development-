import { test, expect } from "@playwright/test";

test.describe("Saved searches (mock auth + mock persistence)", () => {
  test.use({ locale: "sv-SE" });

  test("requires sign-in to view saved searches", async ({ page }) => {
    await page.goto("/my-searches");
    await expect(
      page.getByRole("heading", { name: "Logga in för att se dina sparade sökningar" }),
    ).toBeVisible();
  });

  test("sign in, save a search, view it, then delete it", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    // Sign in from the header.
    await page.goto("/");
    await page.getByRole("button", { name: "Logga in" }).click();
    await page.getByLabel("E-post").fill(email);
    await page.getByRole("button", { name: "Fortsätt" }).click();
    await expect(page.getByRole("button", { name: "Logga ut" })).toBeVisible();

    // Run the onboarding flow to reach recommendations.
    await page.goto("/onboarding");
    await page
      .getByLabel("Dina prioriteringar")
      .fill("Vi letar efter ett hus med 3 sovrum under 5000000 kr nara bra skolor.");
    await page.getByRole("button", { name: "Fortsätt" }).click();
    await expect(page.getByRole("heading", { name: "Granska dina prioriteringar" })).toBeVisible();
    await page.getByRole("button", { name: "Se mina matchningar" }).click();
    await expect(page.getByRole("heading", { name: "Dina matchningar" })).toBeVisible();

    // Save the search.
    await page.getByRole("button", { name: "Spara den här sökningen" }).click();
    await expect(page.getByRole("button", { name: "Sparad" })).toBeVisible();

    // Find it on the My Searches page.
    await page.getByRole("link", { name: "Mina sökningar" }).click();
    await expect(page).toHaveURL(/\/my-searches$/);
    await expect(page.getByRole("heading", { name: "Mina sökningar" })).toBeVisible();
    await expect(page.getByText(/^Sparad /)).toBeVisible();

    // View matches from the saved search takes us back to recommendations.
    await page.getByRole("button", { name: "Se matchningar" }).click();
    await expect(page).toHaveURL(/\/recommendations$/);
    await expect(page.getByRole("heading", { name: "Dina matchningar" })).toBeVisible();

    // Delete it and confirm the empty state appears.
    await page.getByRole("link", { name: "Mina sökningar" }).click();
    await page.getByRole("button", { name: "Ta bort" }).click();
    await expect(page.getByRole("heading", { name: "Inga sparade sökningar än" })).toBeVisible();

    // Sign out returns the header to its signed-out state.
    await page.getByRole("button", { name: "Logga ut" }).click();
    await expect(page.getByRole("button", { name: "Logga in" })).toBeVisible();
  });
});
