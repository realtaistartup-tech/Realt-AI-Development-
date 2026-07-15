import { defineConfig, devices } from "@playwright/test";

const PORT = 3200;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["dot"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          // This sandboxed dev environment pre-installs Chromium outside
          // Playwright's normal cache location; CI (and any other machine)
          // installs it the standard way via `playwright install`, so only
          // override the executable path here, never in CI.
          executablePath: process.env.CI ? undefined : "/opt/pw-browsers/chromium",
        },
      },
    },
  ],
  webServer: {
    // Run against a production build rather than `next dev`: dev mode compiles
    // routes on demand and can leave the page interactive-looking before React
    // has finished hydrating, which makes clicks/fills flaky for reasons that
    // have nothing to do with the app itself.
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
