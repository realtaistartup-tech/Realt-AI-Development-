import { test, expect } from "@playwright/test";

test.describe("Saved searches", () => {
  test.use({ locale: "sv-SE" });

  test("requires sign-in to view saved searches", async ({ page }) => {
    await page.goto("/my-searches");
    await expect(
      page.getByRole("heading", { name: "Logga in för att se dina sparade sökningar" }),
    ).toBeVisible();
  });

  test("shows an honest 'not configured' message instead of a broken sign-in form", async ({ page }) => {
    // This environment has no real Supabase Auth credentials
    // (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY unset), so
    // the sign-in form must say so rather than pretend to work — see
    // features/account/sign-in-form.tsx's authConfigured guard.
    await page.goto("/");
    await page.getByRole("button", { name: "Logga in" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Inloggning är inte konfigurerad än.")).toBeVisible();
  });

  test.skip(
    "sign in, save a search, view it, then delete it",
    async ({ page }) => {
      // Full authenticated round-trip against real Supabase Auth (password
      // sign-up, saved-search create/view/delete, sign-out). Requires a
      // configured Supabase project — this sandbox has neither credentials
      // nor network access to supabase.co (blocked by policy; see
      // docs/supabase-auth-setup.md). The underlying logic this exercises
      // is covered instead by tests/unit/auth.test.ts (session resolution)
      // and tests/unit/supabase-persistence.test.ts (account linking,
      // saved-search CRUD) against a mocked client. Un-skip this once run
      // against a real project — selectors below are believed correct
      // against the current sign-in form but have not been executed.
      const email = `e2e-${Date.now()}@example.com`;
      const password = "correct horse battery staple";

      await page.goto("/");
      await page.getByRole("button", { name: "Logga in" }).click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("E-post").fill(email);
      await dialog.getByLabel("Lösenord").fill(password);
      await dialog.getByRole("button", { name: "Logga in" }).click();
      await expect(page.getByRole("button", { name: "Logga ut" })).toBeVisible();

      await page.goto("/onboarding");
      await page
        .getByLabel("Dina prioriteringar")
        .fill(
          "Vi letar efter ett hus med 3 sovrum under 5000000 kr, högst 20 minuters bilresa, nära bra skolor.",
        );
      await page.getByRole("button", { name: "Fortsätt" }).click();
      await expect(page.getByRole("heading", { name: "Så här uppfattade vi det" })).toBeVisible();
      await page.getByRole("button", { name: "Se mina matchningar" }).click();
      await expect(page.getByRole("heading", { name: "Ditt beslut, förklarat" })).toBeVisible();

      await page.getByRole("button", { name: "Spara den här sökningen" }).click();
      await expect(page.getByRole("button", { name: "Sparad" })).toBeVisible();

      await page.getByRole("link", { name: "Mina sökningar" }).click();
      await expect(page).toHaveURL(/\/my-searches$/);
      await expect(page.getByRole("heading", { name: "Mina sökningar" })).toBeVisible();
      await expect(page.getByText(/^Sparad /)).toBeVisible();

      await page.getByRole("button", { name: "Se matchningar" }).click();
      await expect(page).toHaveURL(/\/recommendations$/);
      await expect(page.getByRole("heading", { name: "Ditt beslut, förklarat" })).toBeVisible();

      await page.getByRole("link", { name: "Mina sökningar" }).click();
      await page.getByRole("button", { name: "Ta bort" }).click();
      await expect(page.getByRole("heading", { name: "Inga sparade sökningar än" })).toBeVisible();

      await page.getByRole("button", { name: "Logga ut" }).click();
      await expect(page.getByRole("button", { name: "Logga in" })).toBeVisible();
    },
  );
});
