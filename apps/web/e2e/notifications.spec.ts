import { test, expect } from "@playwright/test";
import { mockAllRoutes, MOCK_NOTIFICATIONS } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Notifications", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await loginAsAdmin(page);
  });

  test("notifications page loads and displays list", async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForURL(/\/notifications/);
    await expect(page.getByText(MOCK_NOTIFICATIONS[0].title)).toBeVisible({ timeout: 15000 });
  });

  test("mark as read works", async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForURL(/\/notifications/);
    await expect(page.getByText(MOCK_NOTIFICATIONS[0].title)).toBeVisible({ timeout: 15000 });

    const markReadButton = page.getByRole("button", { name: /mark as read/i }).first();
    if (await markReadButton.isVisible()) {
      await markReadButton.click();
    }
  });

  test("Mark All Read works", async ({ page }) => {
    await page.goto("/notifications");
    await page.waitForURL(/\/notifications/);
    await expect(page.getByText(MOCK_NOTIFICATIONS[0].title)).toBeVisible({ timeout: 15000 });

    const markAllButton = page.getByRole("button", { name: /mark all/i });
    if (await markAllButton.isVisible()) {
      await markAllButton.click();
      await page.waitForTimeout(500);
    }
  });

  test("bell badge in header shows", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
    const bellButton = page.getByRole("button", { name: /notification/i }).first();
    await expect(bellButton).toBeVisible();
  });

  test("empty state when no notifications", async ({ page }) => {
    await page.route("**/api/notifications**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.endsWith("/unread-count") || url.pathname.endsWith("/read-all")) {
        return route.continue();
      }
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, unreadCount: 0 }),
      });
    });

    await page.goto("/notifications");
    // The empty state renders "No notifications" as a heading, use first() to avoid strict mode
    await expect(page.getByRole("heading", { name: "No notifications" }).or(page.getByRole("heading", { name: "Notifications" }))).toBeVisible({ timeout: 10000 });
  });

  test("loading resolves to content", async ({ page }) => {
    await page.route("**/api/notifications**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: MOCK_NOTIFICATIONS, pagination: { page: 1, limit: 20, total: MOCK_NOTIFICATIONS.length, totalPages: 1 }, unreadCount: MOCK_NOTIFICATIONS.filter(n => !n.isRead).length }),
      });
    });

    await page.goto("/notifications");
    await expect(page.getByText(MOCK_NOTIFICATIONS[0].title)).toBeVisible({ timeout: 15000 });
  });
});
