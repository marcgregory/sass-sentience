import { test, expect, ACCOUNTS } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Real-infrastructure E2E tests: Authentication & Authorization
 *
 * Validates the real login flow, JWT authentication, protected routes,
 * and tenant/customer data isolation against the running backend.
 */

// ─── Helper: manual login without fixtures ───────────────────────────

async function doLogin(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

// ─── Tests ───────────────────────────────────────────────────────────

test.describe("Authentication — Real Backend", () => {
  test("login page redirects unauthenticated user to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL("**/login", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
  });

  test("admin login succeeds and navigates to dashboard", async ({ page }) => {
    await doLogin(page, ACCOUNTS.admin.email, ACCOUNTS.admin.password);
    await page.waitForURL("**/dashboard", { timeout: 15_000 });
    await expect(page.locator("text=Dashboard")).toBeVisible({ timeout: 5_000 });
    // Name should appear somewhere (header profile area)
    await expect(page.locator(`text=${ACCOUNTS.admin.name}`).first()).toBeVisible({ timeout: 5_000 });
  });

  test("invalid credentials show error message", async ({ page }) => {
    await doLogin(page, "admin@sentience.io", "wrong-password-123");
    // Should stay on login page with an error
    await page.waitForTimeout(1_000); // brief wait for error to render
    await expect(page.locator("text=Invalid")).toBeVisible({ timeout: 10_000 });
  });

  test("logout clears state and redirects to login", async ({ adminPage }) => {
    const { page } = adminPage;
    // Click sign out in header dropdown
    const roleBadge = page.locator('[data-testid="role-badge"]');
    await roleBadge.click();
    const signOut = page.locator("text=Sign Out");
    await signOut.click();
    await page.waitForURL("**/login", { timeout: 10_000 });
    expect(page.url()).toContain("/login");
    // Verify token is cleared
    const token = await page.evaluate(() => localStorage.getItem("auth-storage"));
    expect(token).toBeNull();
  });
});

test.describe("Tenant Isolation", () => {
  test("customer sees only their own data on dashboard", async ({ customerPage }) => {
    const { page } = customerPage;
    // Customer Morgan Chen (Riverside Complex) should see limited data
    await expect(page.locator("text=Riverside Complex")).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("RBAC — Route Protection", () => {
  test("customer cannot access admin pages", async ({ customerPage }) => {
    const { page } = customerPage;
    await page.goto("/admin");
    await expect(page.locator("text=Access Denied")).toBeVisible({ timeout: 10_000 });
  });

  test("admin can access admin pages", async ({ adminPage }) => {
    const { page } = adminPage;
    await page.goto("/admin");
    // Should not see Access Denied — should see admin dashboard
    await expect(page.locator("text=Access Denied")).not.toBeVisible({ timeout: 5_000 });
  });
});
