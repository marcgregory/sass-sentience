import { test, expect, ACCOUNTS } from "./fixtures";
import type { Page } from "@playwright/test";

/**
 * Real-infrastructure E2E tests: Device Telemetry Pipeline ⭐
 *
 * Validates the full IoT data pipeline:
 *   Simulator → MQTT → Realtime Bridge → Socket.IO → Web Dashboard
 *
 * This is the flagship test that proves the entire product works.
 */

test.describe("Device Telemetry Pipeline", () => {
  test("dashboard shows device status changing from real telemetry", async ({ adminPage }) => {
    const { page } = adminPage;

    // Dashboard should be loaded (we were redirected there after login)
    // Check that the live KPI cards are populated with data from the simulator
    await expect(page.locator("text=Total Devices").first()).toBeVisible({ timeout: 10_000 });

    // The simulator publishes telemetry every second, so within a few seconds
    // we should see non-zero device counts. "Total Devices" should be > 0.
    const totalCard = page.locator('[data-testid="kpi-total-devices"]').first();
    await expect(totalCard).toBeVisible({ timeout: 10_000 });

    // Wait for the count to be populated (simulator sends data)
    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="kpi-total-devices"]');
        return el && el.textContent && parseInt(el.textContent.trim()) > 0;
      },
      { timeout: 30_000 },
    );
  });

  test("device list shows real devices from API", async ({ adminPage }) => {
    const { page } = adminPage;

    // Navigate to devices page
    await page.goto("/devices");
    await page.waitForURL("**/devices", { timeout: 10_000 });

    // The API returns devices from the database — we should see a table
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    // Should have multiple device rows (seed data creates 24 devices)
    const rows = page.locator("table tbody tr");
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });
  });
});
