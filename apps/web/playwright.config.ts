import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration for Sentience IoT Platform.
 *
 * Tests run against the Next.js dev server. All API calls are intercepted
 * via page.route() in the shared mock fixtures — no backend required.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 1,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  outputDir: "playwright-results",

  use: {
    baseURL: "http://localhost:3000",
    trace: process.env.CI ? "on-first-retry" : "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],

  webServer: {
    command: "next dev",
    url: "http://localhost:3000/login",
    reuseExistingServer: false,
    timeout: 120_000,
    cwd: ".",
    env: {
      NEXT_PUBLIC_ENABLE_DEMO_LOGIN: "true",
    },
  },
});
