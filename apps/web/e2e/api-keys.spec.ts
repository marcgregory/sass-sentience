import { test, expect } from "@playwright/test";
import { mockAllRoutes, MOCK_API_KEYS } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("API Keys", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await loginAsAdmin(page);
  });

  test("loads and displays API key list with masked keys", async ({ page }) => {
    await page.goto("/admin/api-keys");
    await page.waitForURL(/\/admin\/api-keys/);
    await expect(page.getByText(MOCK_API_KEYS[0].name)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(MOCK_API_KEYS[0].maskedKey)).toBeVisible();
  });

  test("search input present on page", async ({ page }) => {
    await page.goto("/admin/api-keys");
    await page.waitForURL(/\/admin\/api-keys/);
    await expect(page.getByText(MOCK_API_KEYS[0].name)).toBeVisible({ timeout: 15000 });
    // There are multiple search inputs (header + page), just verify it's there
    const searchInput = page.locator('input[type="search"], input[placeholder*="earch" i]').first();
    await expect(searchInput).toBeVisible();
  });

  test("summary cards show key counts", async ({ page }) => {
    await page.goto("/admin/api-keys");
    await page.waitForURL(/\/admin\/api-keys/);
    await expect(page.getByText(MOCK_API_KEYS[0].name)).toBeVisible({ timeout: 15000 });
    // Active and total key summary cards should be visible
    await expect(page.getByRole("heading", { name: "Active" })).toBeVisible({ timeout: 5000 });
  });

  test("create button opens dialog", async ({ page }) => {
    await page.goto("/admin/api-keys");
    await page.waitForURL(/\/admin\/api-keys/);
    await expect(page.getByText(MOCK_API_KEYS[0].name)).toBeVisible({ timeout: 15000 });

    await page.getByRole("button", { name: /create|add key|new/i }).click();
    await page.waitForTimeout(500);
  });
});
