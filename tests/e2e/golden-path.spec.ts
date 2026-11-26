import { test, expect } from "@playwright/test";

const SV_ANSWER =
  "Vi är en familj på fyra som letar efter ett hus med 4 sovrum under 6000000 kr, " +
  "helst högst 30 minuters bilresa till centrum, i ett lugnt område med bra skolor.";

const EN_ANSWER =
  "We're a family of four looking for a 4 bedroom home under $600,000, ideally a " +
  "30 minute drive or less to downtown, in a quiet neighborhood with good schools.";

test.describe("Golden path — Swedish", () => {
  test.use({ locale: "sv-SE" });

  test("completes onboarding and reaches scored recommendations", async ({ page }) => {
    await page.goto("/sv/onboarding");

    await page.getByLabel("Dina prioriteringar").fill(SV_ANSWER);
    await page.getByRole("button", { name: "Fortsätt" }).click();

    await expect(
      page.getByRole("heading", { name: "Så här uppfattade vi det" })
    ).toBeVisible();

    await expect(page.getByText("Några snabba frågor")).toHaveCount(0);
    await expect(page.getByText("Körs i offlineläge")).toBeVisible();
    await expect(page.getByText(/6.000.000\s*kr/)).toBeVisible();
    await expect(page.getByText(/30 min/)).toBeVisible();

    await page.getByRole("button", { name: "Se mina matchningar" }).click();

    await expect(page).toHaveURL(/\/sv\/recommendations$/);

    await expect(
      page.getByRole("heading", { name: "Ditt beslut, förklarat" })
    ).toBeVisible();

    await expect(page.getByText("Realt Score")).toBeVisible();
    await expect(page.getByText("Confidence Score")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Föreslagna bostadsmatchningar" })
    ).toBeVisible();

    await expect(page.getByText("Varför den passar").first()).not.toBeVisible();

    await page
      .getByText("Se hela analysen bakom den här poängen")
      .first()
      .click();

    await expect(page.getByText("Varför den passar").first()).toBeVisible();
  });
});

test.describe("Golden path — English", () => {
  test.use({ locale: "en-US" });

  test("completes onboarding and reaches scored recommendations", async ({ page }) => {
    await page.goto("/onboarding");

    await page.getByLabel("Your priorities").fill(EN_ANSWER);
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(
      page.getByRole("heading", { name: "Here's what we understood" })
    ).toBeVisible();

    await expect(page.getByText("A couple of quick questions")).toHaveCount(0);
    await expect(page.getByText("Running in offline mode")).toBeVisible();
    await expect(page.getByText(/600.000\s*kr/)).toBeVisible();

    await page.getByRole("button", { name: "See my matches" }).click();

    await expect(page).toHaveURL(/\/recommendations$/);

    await expect(
      page.getByRole("heading", { name: "Your decision, explained" })
    ).toBeVisible();

    await expect(page.getByText("Realt Score")).toBeVisible();
    await expect(page.getByText("Confidence Score")).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Suggested property matches" })
    ).toBeVisible();

    await expect(page.getByText("Why it fits").first()).not.toBeVisible();

    await page
      .getByText("See the full analysis behind this score")
      .first()
      .click();

    await expect(page.getByText("Why it fits").first()).toBeVisible();
  });
});

test.describe("Homepage navigation", () => {
  test("English homepage opens the AI assistant", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { level: 1 })
    ).toContainText("Looking for a new home?");

   await page.locator("#main-content").getByRole("link", { name: "Find my next home", exact: true }).click();

    await expect(page).toHaveURL(/\/assistant$/);
  });
});