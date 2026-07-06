/**
 * Diagnostics API functions.
 *
 * Provides typed functions for fetching diagnostic tests, running them,
 * and listing results. Used by TanStack Query hooks — never call these
 * directly from components.
 */

import { get, post } from "./api-client";
import type {
  DiagnosticTest,
  DiagnosticResult,
  DiagnosticTestListResponse,
  DiagnosticResultListResponse,
  RunDiagnosticRequest,
} from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface DiagnosticResultApiItem extends DiagnosticResult {
  ranByName: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch available diagnostic tests, optionally filtered by device type.
 */
export async function getDiagnosticTests(
  deviceType?: string,
): Promise<DiagnosticTestListResponse> {
  return get<DiagnosticTestListResponse>("/diagnostics/tests", {
    params: deviceType ? { deviceType } as Record<string, string> : undefined,
  });
}

/**
 * Fetch a single diagnostic test by ID.
 */
export async function getDiagnosticTest(
  id: string,
): Promise<DiagnosticTest> {
  return get<DiagnosticTest>(`/diagnostics/tests/${id}`);
}

/**
 * Run a diagnostic test on a device.
 */
export async function runDiagnostic(
  payload: RunDiagnosticRequest,
): Promise<DiagnosticResultApiItem> {
  return post<DiagnosticResultApiItem>("/diagnostics/run", payload);
}

/**
 * Fetch paginated diagnostic results.
 */
export async function getDiagnosticResults(params?: {
  deviceId?: string;
  testId?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<DiagnosticResultListResponse> {
  return get<DiagnosticResultListResponse>("/diagnostics/results", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single diagnostic result by ID.
 */
export async function getDiagnosticResult(
  id: string,
): Promise<DiagnosticResult> {
  return get<DiagnosticResult>(`/diagnostics/results/${id}`);
}
