import { test, expect } from "@playwright/test";
import { mockAllRoutes } from "./fixtures/api-mocks";

async function loginAs(page: import("@playwright/test").Page, roleLabel: string) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText(roleLabel).first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("RBAC — Navigation Filtering", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
  });

  test("admin sees all nav items (14)", async ({ page }) => {
    await loginAs(page, "Administrator");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    for (const item of ["Dashboard", "Estates", "Sites", "Devices", "Alerts", "Events", "Reports", "Diagnostics", "Users", "Roles", "Notifications", "Audit Log", "Settings", "Admin"]) {
      await expect(nav.getByRole("link", { name: item })).toBeVisible({ timeout: 3000 });
    }
  });

  test("support sees dashboard and device links but not admin-only items", async ({ page }) => {
    await loginAs(page, "Support");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Devices" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alerts" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Users" })).not.toBeVisible();
    await expect(nav.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });

  test("customer sees limited nav items", async ({ page }) => {
    await loginAs(page, "Customer");
    const nav = page.getByRole("navigation", { name: "Main navigation" });
    await expect(nav.getByRole("link", { name: "Dashboard" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Devices" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alerts" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Events" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reports" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Notifications" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Admin" })).not.toBeVisible();
  });
});

test.describe("RBAC — Route Guards", () => {
  test.beforeEach(async ({ page }) => {
    await mockAllRoutes(page);
  });

  test("admin can access /users page", async ({ page }) => {
    await loginAs(page, "Administrator");
    await page.goto("/users", { waitUntil: "networkidle" });
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 15000 });
  });

  test("customer accessing /users sees Access Denied", async ({ page }) => {
    await loginAs(page, "Customer");
    // Navigate with waitUntil networkidle to let the page fully load
    await page.goto("/users", { waitUntil: "networkidle" });
    // The RequirePermission component shows "Access Denied" as an h2
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible({ timeout: 15000 });
  });

  test("admin can access /admin hub page", async ({ page }) => {
    await loginAs(page, "Administrator");
    await page.goto("/admin");
    await page.waitForURL(/\/admin/);
    await expect(page.locator("h1, h2").first()).toBeAttached({ timeout: 10000 });
  });

  test("support accessing /admin sees Access Denied", async ({ page }) => {
    await loginAs(page, "Support");
    await page.goto("/admin", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible({ timeout: 10000 });
  });

  test("customer accessing /admin/api-keys sees Access Denied", async ({ page }) => {
    await loginAs(page, "Customer");
    await page.goto("/admin/api-keys", { waitUntil: "networkidle" });
    await expect(page.getByRole("heading", { name: "Access Denied" })).toBeVisible({ timeout: 10000 });
  });
});
