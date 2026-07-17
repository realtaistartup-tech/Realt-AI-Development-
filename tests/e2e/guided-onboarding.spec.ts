import { test, expect } from "@playwright/test";

test.describe("Guided onboarding — clarifying questions", () => {
  test.use({ locale: "en-US" });

  test("asks one field at a time, in order, and stops once confident", async ({ page }) => {
    await page.goto("/en/onboarding");
    await page.getByLabel("Your priorities").fill("Looking for a nice place to live.");
    await page.getByRole("button", { name: "Continue" }).click();

    // Budget first.
    await expect(page.getByRole("heading", { name: "What's your budget range?" })).toBeVisible();
    await page.getByLabel("Minimum").fill("2000000");
    await page.getByLabel("Maximum").fill("3500000");
    await page.getByRole("button", { name: "Continue" }).click();

    // Then commute.
    await expect(
      page.getByRole("heading", { name: "How do you want to get around" }),
    ).toBeVisible();
    await page.getByLabel("Maximum commute (minutes)").fill("25");
    await page.getByRole("button", { name: "Continue" }).click();

    // Then space.
    await expect(page.getByRole("heading", { name: "How many bedrooms" })).toBeVisible();
    await page.getByLabel("Bedrooms").fill("2");
    await page.getByLabel("Bathrooms").fill("1");
    await page.getByRole("button", { name: "Continue" }).click();

    // Then what matters most — pick two categories.
    await expect(page.getByRole("heading", { name: "Which of these matters most" })).toBeVisible();
    await page.getByRole("button", { name: "Safety" }).click();
    await page.getByRole("button", { name: "Schools" }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    // Exactly four questions — straight to the summary, no fifth question.
    await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();
    await expect(page.getByText(/3.500.000\s*kr/)).toBeVisible();
    await expect(page.getByText(/25 min/)).toBeVisible();
    await expect(page.getByText("2 bed / 1 bath, minimum")).toBeVisible();
    await expect(page.getByText("Safety, Schools")).toBeVisible();
  });

  test("lets the user skip a question and discloses the assumed default transparently", async ({
    page,
  }) => {
    await page.goto("/en/onboarding");
    await page.getByLabel("Your priorities").fill("Looking for a nice place to live.");
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByRole("heading", { name: "What's your budget range?" })).toBeVisible();
    await page.getByRole("button", { name: "Not sure — skip this" }).click();

    // Moves on to the next question rather than getting stuck.
    await expect(
      page.getByRole("heading", { name: "How do you want to get around" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Not sure — skip this" }).click();
    await expect(page.getByRole("heading", { name: "How many bedrooms" })).toBeVisible();
    await page.getByRole("button", { name: "Not sure — skip this" }).click();
    await expect(page.getByRole("heading", { name: "Which of these matters most" })).toBeVisible();
    await page.getByRole("button", { name: "Not sure — skip this" }).click();

    await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();
    await expect(
      page.getByText("We used a default for: budget, commute, space, priority ranking"),
    ).toBeVisible();
  });

  test("edit details returns to the summary rather than losing progress", async ({ page }) => {
    await page.goto("/en/onboarding");
    await page
      .getByLabel("Your priorities")
      .fill("We need a 3 bedroom home under $500,000, no more than a 30 minute drive, near good schools.");
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();

    await page.getByRole("button", { name: "Edit details" }).click();
    await expect(page.getByRole("heading", { name: "Review your priorities" })).toBeVisible();
    await expect(page.getByLabel("Maximum", { exact: true })).toHaveValue("500000");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByRole("heading", { name: "Here's what we understood" })).toBeVisible();
  });
});
