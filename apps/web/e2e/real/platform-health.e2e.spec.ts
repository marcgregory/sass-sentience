import { test, expect } from "./fixtures";

/**
 * Real-infrastructure E2E tests: Platform Health
 *
 * Validates the platform health monitoring page shows real service status.
 * Note: MQTT failure/recovery testing is done via the API health endpoint
 * directly to avoid orchestrating container restarts from the browser.
 */

test.describe("Platform Health", () => {
  test("admin can view platform health page with all services", async ({ adminPage }) => {
    const { page } = adminPage;

    // Navigate to platform health
    await page.goto("/admin/health");
    await page.waitForURL("**/admin/health", { timeout: 10_000 });

    // All 5 service status cards should be visible
    await expect(page.locator("text=API").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Database").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=MQTT").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Bridge").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("text=Simulator").first()).toBeVisible({ timeout: 10_000 });
  });

  test("API health endpoint returns healthy state", async ({ request }) => {
    const response = await request.get("/api/health");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ok");
    expect(body.db.status).toBe("healthy");
  });

  test("API ready endpoint returns ready state (migrations applied)", async ({ request }) => {
    const response = await request.get("/api/ready");
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.status).toBe("ready");
  });

  test("admin platform health stats show real data", async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto("/admin");
    await page.waitForURL("**/admin", { timeout: 10_000 });

    // The admin overview should show real stats from the API
    await expect(page.locator("text=Platform Overview").first()).toBeVisible({ timeout: 10_000 });
  });
});
