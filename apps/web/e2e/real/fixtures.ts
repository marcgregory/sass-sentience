import { test as base, type Page } from "@playwright/test";

/**
 * Shared fixtures for real-infrastructure E2E tests.
 *
 * Provides authenticated page contexts for each demo role
 * by performing a real login via the login page.
 */

export type AuthedPage = {
  page: Page;
  token: string;
};

// Demo account credentials matching the seed data
export const ACCOUNTS = {
  admin: { email: "admin@sentience.io", password: "admin123", name: "Alex Turner" },
  support: { email: "support@sentience.io", password: "support123", name: "Jordan Lee" },
  installer: { email: "installer@sentience.io", password: "installer123", name: "Sam Rivera" },
  customer: { email: "customer@sentience.io", password: "customer123", name: "Morgan Chen" },
} as const;

export type Role = keyof typeof ACCOUNTS;

/**
 * Logs in via the real login form and returns the page + JWT token.
 */
async function loginAs(page: Page, role: Role): Promise<string> {
  const account = ACCOUNTS[role];

  await page.goto("/login");
  await page.waitForSelector('input[type="email"]', { state: "visible" });

  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard (login success)
  await page.waitForURL("**/dashboard", { timeout: 15_000 });

  // Extract JWT token from localStorage (set by auth-store persist)
  const token = await page.evaluate(() => localStorage.getItem("sentience-auth"));
  if (!token) throw new Error("No auth token found after login");
  const parsed = JSON.parse(token);
  return parsed.state?.token ?? "";
}

/**
 * Extended test fixture that provides pre-authenticated pages.
 */
export const test = base.extend<{
  adminPage: AuthedPage;
  supportPage: AuthedPage;
  customerPage: AuthedPage;
}>({
  adminPage: async ({ page }, use) => {
    const token = await loginAs(page, "admin");
    await use({ page, token });
  },
  supportPage: async ({ page }, use) => {
    const token = await loginAs(page, "support");
    await use({ page, token });
  },
  customerPage: async ({ page }, use) => {
    const token = await loginAs(page, "customer");
    await use({ page, token });
  },
});

export { expect } from "@playwright/test";
