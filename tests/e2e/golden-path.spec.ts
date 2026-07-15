import { test, expect } from "@playwright/test";

const SV_ANSWER =
  "Vi är en familj på fyra som letar efter ett hus med 4 sovrum under 6000000 kr, " +
  "helst högst 30 minuters bilresa till centrum, i ett lugnt område med bra skolor.";

const EN_ANSWER =
  "We're a family of four looking for a 4 bedroom home under $600,000, ideally a " +
  "30 minute drive or less to downtown, in a quiet neighborhood with good schools.";

test.describe("Golden path — Swedish (default locale)", () => {
  test.use({ locale: "sv-SE" });

  test("completes onboarding and reaches scored recommendations", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Man köper inte en lägenhet");

    await page.getByRole("link", { name: "Börja förstå mina prioriteringar" }).click();
    await expect(page).toHaveURL(/\/onboarding$/);

    await page.getByLabel("Dina prioriteringar").fill(SV_ANSWER);
    await page.getByRole("button", { name: "Fortsätt" }).click();

    await expect(page.getByRole("heading", { name: "Granska dina prioriteringar" })).toBeVisible();
    // No OPENAI_API_KEY in this environment, so the heuristic fallback runs —
    // the app must say so rather than silently pretending it used real AI.
    await expect(page.getByText("Körs i offlineläge")).toBeVisible();
    await expect(page.getByLabel("Maximum", { exact: true })).toHaveValue("6000000");
    await expect(page.getByLabel("Maximal pendlingstid (minuter)")).toHaveValue("30");

    await page.getByRole("button", { name: "Se mina matchningar" }).click();
    await expect(page).toHaveURL(/\/recommendations$/);
    await expect(page.getByRole("heading", { name: "Dina matchningar" })).toBeVisible();

    await expect(page.getByText("VARFÖR DEN PASSAR").first()).toBeVisible();
    await expect(page.getByText(/matchning/).first()).toBeVisible();
  });
});

test.describe("Golden path — English", () => {
  test.use({ locale: "en-US" });

  test("completes onboarding and reaches scored recommendations", async ({ page }) => {
    await page.goto("/en");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("People don't buy apartments");

    await page.getByRole("link", { name: "Start understanding my priorities" }).click();
    await expect(page).toHaveURL(/\/en\/onboarding$/);

    await page.getByLabel("Your priorities").fill(EN_ANSWER);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "Review your priorities" })).toBeVisible();
    await expect(page.getByText("Running in offline mode")).toBeVisible();
    await expect(page.getByLabel("Maximum", { exact: true })).toHaveValue("600000");

    await page.getByRole("button", { name: "See my matches" }).click();
    await expect(page).toHaveURL(/\/en\/recommendations$/);
    await expect(page.getByRole("heading", { name: "Your matches" })).toBeVisible();
    await expect(page.getByText("Why it fits").first()).toBeVisible();
  });
});
