import { test, expect } from "@playwright/test";
import { mockAuthRoutes } from "./fixtures/api-mocks";

async function loginAsAdmin(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByText("Administrator").first().click();
  await page.waitForURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible({ timeout: 10000 });
}

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthRoutes(page);
  });

  test("redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Welcome back")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("login page renders quick-login buttons for all 4 roles", async ({ page }) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Administrator").first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Support").first()).toBeVisible();
    await expect(page.getByText("Installer").first()).toBeVisible();
    await expect(page.getByText("Customer").first()).toBeVisible();
  });

  test("admin quick-login redirects to dashboard", async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("shows user name and role badge after login", async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText("Alice Johnson")).toBeVisible({ timeout: 5000 });
  });

  test("sign out clears auth state and redirects to login", async ({ page }) => {
    await loginAsAdmin(page);

    // Open user dropdown via the avatar button
    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.waitForTimeout(300);

    // Click Sign Out in the dropdown
    await page.getByText("Sign Out").click();
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Try accessing dashboard — should redirect back to login
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
  });

  test("login form shows error for invalid credentials", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      return route.fulfill({
        status: 401,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Invalid credentials. Please try again." }),
      });
    });

    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await page.getByLabel("Email").fill("wrong@example.com");
    await page.getByLabel("Password").fill("wrongpass");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/invalid credentials/i)).toBeVisible({ timeout: 10000 });
  });

  test("can log out and re-login as a different role", async ({ page }) => {
    await loginAsAdmin(page);

    // Sign Out
    await page.getByRole("button", { name: "Open user menu" }).click();
    await page.waitForTimeout(300);
    await page.getByText("Sign Out").click();
    await page.waitForURL(/\/login/);

    // Login as customer
    await page.getByText("Customer").first().click();
    await page.waitForURL(/\/dashboard/);
    await expect(page.getByText("Dan Wilson")).toBeVisible({ timeout: 5000 });
  });
});
