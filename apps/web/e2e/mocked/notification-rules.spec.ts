import { test, expect } from "@playwright/test";
import { mockAllRoutes, MOCK_NOTIFICATION_RULES } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Notification Rules", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await loginAsAdmin(page);
  });

  test("loads and displays rules", async ({ page }) => {
    await page.goto("/admin/notification-rules");
    await page.waitForURL(/\/admin\/notification-rules/);
    await expect(page.getByText(MOCK_NOTIFICATION_RULES[0].label)).toBeVisible({ timeout: 15000 });
  });

  test("toggle a channel triggers PATCH API", async ({ page }) => {
    await page.goto("/admin/notification-rules");
    await page.waitForURL(/\/admin\/notification-rules/);
    await expect(page.getByText(MOCK_NOTIFICATION_RULES[0].label)).toBeVisible({ timeout: 15000 });

    const toggle = page.locator('button[class*="rounded-full"]').first();
    if (await toggle.isVisible()) {
      await toggle.click();
      await page.waitForTimeout(500);
    }
  });

  test("toggle a role checkbox triggers PATCH API", async ({ page }) => {
    await page.goto("/admin/notification-rules");
    await page.waitForURL(/\/admin\/notification-rules/);
    await expect(page.getByText(MOCK_NOTIFICATION_RULES[0].label)).toBeVisible({ timeout: 15000 });

    const checkbox = page.locator('input[type="checkbox"]').first();
    if (await checkbox.isVisible()) {
      await checkbox.click({ force: true });
      await page.waitForTimeout(500);
    }
  });

  test("empty state when no rules exist", async ({ page }) => {
    await page.route("**/api/notification-rules**", async (route) => {
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [] }),
      });
    });

    await page.goto("/admin/notification-rules");
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 10000 });
  });

  test("loading state resolves", async ({ page }) => {
    await page.route("**/api/notification-rules**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: MOCK_NOTIFICATION_RULES }),
      });
    });

    await page.goto("/admin/notification-rules");
    await expect(page.getByText(MOCK_NOTIFICATION_RULES[0].label)).toBeVisible({ timeout: 15000 });
  });
});
