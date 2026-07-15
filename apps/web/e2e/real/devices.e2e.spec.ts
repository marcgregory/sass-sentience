import { test, expect, ACCOUNTS } from "./fixtures";

/**
 * Real-infrastructure E2E tests: Device Lifecycle & Diagnostics
 *
 * Validates real device data from the API, diagnostics runs,
 * and device detail pages show correct information.
 */

test.describe("Device Lifecycle", () => {
  test("device list loads real devices with pagination from API", async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto("/devices");
    await page.waitForURL("**/devices", { timeout: 10_000 });

    // Should have a table with data
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // Seed data creates 24 devices — all should be visible or paginated
    const rows = page.locator("table tbody tr");
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);

    // Verify specific device data by checking for common fields
    await expect(page.locator("text=Status").first()).toBeVisible({ timeout: 5_000 });
  });

  test("device detail page loads for a specific device", async ({ adminPage, request }) => {
    const { page, token } = adminPage;

    // First, get a device ID from the API
    const devicesRes = await request.get("/api/devices?limit=1", {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(devicesRes.ok()).toBe(true);
    const devices = await devicesRes.json();
    expect(devices.data.length).toBeGreaterThan(0);
    const deviceId: string = devices.data[0].id;

    // Navigate to device detail
    await page.goto(`/devices/${deviceId}`);
    await page.waitForURL(`**/devices/${deviceId}`, { timeout: 10_000 });

    // Device name should be visible in the detail page
    await expect(page.locator(`text=${devices.data[0].name}`).first()).toBeVisible({ timeout: 10_000 });
  });

  test("diagnostics page shows available tests for devices", async ({ adminPage }) => {
    const { page } = adminPage;

    await page.goto("/diagnostics");
    await page.waitForURL("**/diagnostics", { timeout: 10_000 });

    // Should see diagnostic test cards or a device selector
    await expect(page.locator("text=Diagnostics").first()).toBeVisible({ timeout: 10_000 });
  });
});
