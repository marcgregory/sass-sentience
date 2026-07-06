/**
 * Device Diagnostics types.
 *
 * Diagnostics are modeled as extensible entities:
 * - A `DiagnosticTest` defines what tests exist and which device types they apply to.
 * - A `DiagnosticResult` is one run of a test against a device.
 *
 * Adding new device types or tests requires no frontend changes —
 * the UI renders whatever tests the backend reports for a given device type.
 */

import type { DeviceType } from "./device";

/** Unique test types the system knows about. */
export type DiagnosticTestType =
  | "ping"
  | "connection"
  | "mqtt"
  | "signal"
  | "battery"
  | "firmware"
  | "cellular"
  | "gps"
  | "stream"
  | "lens"
  | "sd_card"
  | "relay_coil";

/** Outcome of a single diagnostic run. */
export type DiagnosticRunStatus = "passed" | "failed" | "warning";

/**
 * A diagnostic test definition.
 *
 * Each test declares which device types it supports so the UI can
 * automatically show/hide tests based on the selected device.
 */
export interface DiagnosticTest {
  id: string;
  name: string;
  /** Machine-readable type key (e.g. "ping", "battery", "stream"). */
  type: DiagnosticTestType;
  /** Short description shown on the test card. */
  description: string;
  /** Which device types this test applies to. */
  supportedDeviceTypes: DeviceType[];
  /** Max execution time in seconds. */
  timeout: number;
  /** JSON Schema describing the shape of the result payload. */
  resultSchema: Record<string, unknown>;
  /** Whether the test is active/enabled. */
  enabled: boolean;
  /** Display order on the diagnostics page. */
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * A single diagnostic run result.
 *
 * Stored in the database and returned by the API so the UI can
 * display a history of runs per device.
 */
export interface DiagnosticResult {
  id: string;
  testId: string;
  testName: string;
  testType: DiagnosticTestType;
  deviceId: string;
  deviceName: string;
  deviceType: DeviceType;
  status: DiagnosticRunStatus;
  /** Human-readable summary message (e.g. "Ping successful (12ms)"). */
  message: string;
  /** Structured payload matching the test's resultSchema. */
  details: Record<string, unknown> | null;
  ranBy: string;
  ranByName: string;
  startedAt: string;
  completedAt: string;
  durationMs: number;
}

/**
 * Request payload to run a diagnostic test on a device.
 */
export interface RunDiagnosticRequest {
  testId: string;
  deviceId: string;
}

/**
 * List of available tests for a given device type, grouped.
 */
export interface DiagnosticTestListResponse {
  tests: DiagnosticTest[];
}

/**
 * Paginated list of diagnostic results.
 */
export interface DiagnosticResultListResponse {
  data: DiagnosticResult[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
