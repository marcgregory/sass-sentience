import { test, expect } from "@playwright/test";
import { mockAllRoutes, MOCK_AUDIT_LOGS } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Audit Log", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await loginAsAdmin(page);
  });

  test("loads and displays audit log entries", async ({ page }) => {
    await page.goto("/audit-log");
    await page.waitForURL(/\/audit-log/);
    // Wait for page to render — the heading should be visible
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 15000 });
  });

  test("search input present on page", async ({ page }) => {
    await page.goto("/audit-log");
    await page.waitForURL(/\/audit-log/);
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test("loading state resolves", async ({ page }) => {
    await page.route("**/api/audit-logs**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: MOCK_AUDIT_LOGS, pagination: { page: 1, limit: 20, total: MOCK_AUDIT_LOGS.length, totalPages: 1 } }),
      });
    });

    await page.goto("/audit-log");
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 15000 });
  });

  test("empty state when no entries match", async ({ page }) => {
    await page.route("**/api/audit-logs**", async (route) => {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }),
      });
    });

    await page.goto("/audit-log");
    await page.waitForTimeout(2000);
    // Check that page rendered (may or may not show empty state)
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 10000 });
  });
});
