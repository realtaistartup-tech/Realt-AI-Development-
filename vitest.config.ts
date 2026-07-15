import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest-setup.ts"],
    globals: true,
    // tests/e2e runs under Playwright's own test runner (`npm run test:e2e`),
    // not Vitest — its specs use @playwright/test globals that are
    // incompatible with Vitest's runner.
    include: ["tests/unit/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
