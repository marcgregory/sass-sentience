import { defineConfig, devices } from "@playwright/test";

/**
 * E2E test configuration for Sentience IoT Platform.
 *
 * Tests run against REAL infrastructure (Docker Compose):
 *   PostgreSQL, Mosquitto, API server, Realtime Bridge, Simulator.
 *
 * No API mocking is used — all requests go to the running backend.
 *
 * Use:  pnpm test:e2e:real
 * Or:   docker compose -f docker-compose.e2e.yml run playwright
 */
export default defineConfig({
  testDir: "./e2e/real",
  testMatch: "**/*.e2e.spec.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ["html", { outputFolder: "playwright-report" }],
    ["list"],
    ["junit", { outputFile: "playwright-results/e2e-junit.xml" }],
  ],
  outputDir: "playwright-results",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },

  projects: [
    {
      name: "e2e-chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        },
      },
    },
  ],

  // No webServer — the E2E environment is assumed to be running externally
  // (Docker Compose). Tests connect to http://web:3000 or http://localhost:3000.
});
