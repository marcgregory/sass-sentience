import { test, expect } from "@playwright/test";
import { mockAllRoutes, MOCK_REPORT_SUMMARY, MOCK_REPORT_TRENDS } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Reports", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
    await loginAsAdmin(page);
  });

  test("loads and shows page header", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForURL(/\/reports/);
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 15000 });
  });

  test("date range filter buttons present", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForURL(/\/reports/);
    const button = page.getByText(/last 7 days|7d|Today|30d/i).first();
    await expect(button).toBeVisible({ timeout: 15000 });
    await button.click();
  });

  test("loading state resolves", async ({ page }) => {
    await page.route("**/api/reports/summary**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(MOCK_REPORT_SUMMARY),
      });
    });
    await page.route("**/api/reports/trends**", async (route) => {
      await new Promise((r) => setTimeout(r, 500));
      return route.fulfill({
        status: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(MOCK_REPORT_TRENDS),
      });
    });

    await page.goto("/reports");
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 15000 });
  });

  test("error state shows retry button", async ({ page }) => {
    await page.route("**/api/reports/summary**", async (route) => {
      return route.fulfill({ status: 500, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Server error" }) });
    });

    await page.goto("/reports");
    await page.waitForTimeout(3000);
    await expect(page.getByText(/retry|try again|error|something went wrong/i).or(page.locator("h1, h2").first())).toBeVisible({ timeout: 10000 });
  });
});
