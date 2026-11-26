
import { test, expect } from "@playwright/test";

test.describe("Theme settings", () => {
  test("switches between light, dark and system themes and persists the selection", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/en/settings");

    const appearance = page.getByRole("group", {
      name: "Appearance",
      exact: true,
    });

    const light = appearance.getByRole("button", {
      name: "Light",
      exact: true,
    });

    const dark = appearance.getByRole("button", {
      name: "Dark",
      exact: true,
    });

    const system = appearance.getByRole("button", {
      name: "System",
      exact: true,
    });

    const html = page.locator("html");

    // Light theme
    await light.click();
    await expect(light).toHaveAttribute("aria-pressed", "true");
    await expect(html).toHaveClass(/\blight\b/);
    await expect(html).not.toHaveClass(/\bdark\b/);

    // Dark theme
    await dark.click();
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(html).toHaveClass(/\bdark\b/);

    // Verify that the selected theme survives a reload
    await page.reload();
    await expect(dark).toHaveAttribute("aria-pressed", "true");
    await expect(html).toHaveClass(/\bdark\b/);

    // System theme
    await system.click();
    await expect(system).toHaveAttribute("aria-pressed", "true");
    await expect(html).toHaveClass(/\bdark\b/);

    // Verify that system theme follows OS preferences
    await page.emulateMedia({ colorScheme: "light" });
    await expect(html).toHaveClass(/\blight\b/);
    await expect(html).not.toHaveClass(/\bdark\b/);
  });
});
