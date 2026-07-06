/**
 * TanStack Query hooks for diagnostic tests and results.
 *
 * Provides list, detail, and mutation hooks following the established
 * pattern in this codebase (estates/sites/users).
 *
 * When Simulator Mode is active, all diagnostics run locally through
 * simulated-diagnostics.ts — no API calls are made, since simulated
 * device UUIDs don't exist in the database.
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getDiagnosticTests,
  getDiagnosticTest,
  runDiagnostic,
  getDiagnosticResults,
  getDiagnosticResult,
  type DiagnosticResultApiItem,
} from "@/lib/diagnostics";
import { getSimulatedTestsForDeviceType, simulateDiagnosticResult } from "@/lib/simulated-diagnostics";
import { useLiveDiagnosticStore } from "@/stores/live-diagnostic-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useAuditStore } from "@/stores/audit-store";
import { diagnosticExecuted } from "@/lib/simulated-audit-logs";
import type { RunDiagnosticRequest, DiagnosticResult, DiagnosticTest } from "@sentience/types";

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Map a live device store entry to the shape simulateDiagnosticResult expects.
 */
function getDeviceInfoForSim(deviceId: string) {
  const liveDevices = useLiveDeviceStore.getState().devices;
  const entry = liveDevices[deviceId];
  if (!entry) return null;
  return {
    deviceName: entry.deviceName ?? `Device ${deviceId.slice(0, 8)}`,
    deviceType: entry.deviceType ?? "unknown",
    deviceStatus: entry.status,
    battery: entry.telemetry?.battery ?? null,
    signalStrength: entry.telemetry?.signalStrength ?? null,
  };
}

// ─── useDiagnosticTests ───────────────────────────────────────────────────

export function useDiagnosticTests(deviceType?: string) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  const query = useQuery({
    queryKey: queryKeys.diagnostics.tests(deviceType),
    queryFn: () => getDiagnosticTests(deviceType),
    enabled: !simulatorMode,
  });

  // Simulator mode: return local test definitions matching the backend
  const simTests = useMemo<DiagnosticTest[]>(() => {
    if (!simulatorMode) return [];
    return getSimulatedTestsForDeviceType(deviceType);
  }, [simulatorMode, deviceType]);

  return {
    data: simulatorMode ? { tests: simTests } : query.data,
    tests: simulatorMode ? simTests : (query.data?.tests ?? []),
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
    refetch: query.refetch,
  };
}

// ─── useDiagnosticTest ────────────────────────────────────────────────────

export function useDiagnosticTest(id: string) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  const query = useQuery({
    queryKey: queryKeys.diagnostics.testDetail(id),
    queryFn: () => getDiagnosticTest(id),
    enabled: !!id && !simulatorMode,
  });

  // Simulator mode: find matching test from local definitions
  const simTest = useMemo(() => {
    if (!simulatorMode || !id) return undefined;
    const tests = getSimulatedTestsForDeviceType();
    return tests.find((t) => t.id === id);
  }, [simulatorMode, id]);

  return {
    data: simulatorMode ? simTest : query.data,
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
  };
}

// ─── useRunDiagnostic ─────────────────────────────────────────────────────

export function useRunDiagnostic() {
  const queryClient = useQueryClient();
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const addSimResult = useLiveDiagnosticStore((s) => s.addResult);

  return useMutation({
    mutationFn: async (payload: RunDiagnosticRequest) => {
      if (simulatorMode) {
        // Simulator mode: run entirely client-side.
        // Artificial delay so the progress UI is visible (2-4 seconds).
        const delay = 2000 + Math.round(Math.random() * 2000);
        const startedAt = new Date();

        // Find which test we're running from local definitions.
        const tests = getSimulatedTestsForDeviceType();
        const test = tests.find((t) => t.id === payload.testId);
        if (!test) {
          throw new Error(`Diagnostic test not found: ${payload.testId}`);
        }

        // Get device info from the live store
        const deviceInfo = getDeviceInfoForSim(payload.deviceId);
        if (!deviceInfo) {
          throw new Error("Simulated device not found in live feed");
        }

        // Wait so the user sees the progress indicators
        await new Promise((r) => setTimeout(r, delay));

        // Generate simulated result
        const simResult = simulateDiagnosticResult(test.type, deviceInfo);

        // Build the result object matching DiagnosticResultApiItem shape
        const result: DiagnosticResultApiItem = {
          id: `sim-diag-${crypto.randomUUID()}`,
          testId: test.id,
          testName: test.name,
          testType: test.type,
          deviceId: payload.deviceId,
          deviceName: deviceInfo.deviceName,
          deviceType: deviceInfo.deviceType as any,
          status: simResult.status,
          message: simResult.message,
          details: simResult.details,
          ranBy: "simulator",
          ranByName: "Simulator",
          startedAt: startedAt.toISOString(),
          completedAt: new Date(startedAt.getTime() + delay).toISOString(),
          durationMs: delay,
        };

        // Store in local state for the results list
        addSimResult(result);

        // Generate a simulated audit entry for this diagnostic run
        useAuditStore.getState().addSimulatedEntry(
          diagnosticExecuted(
            test.name,
            simResult.status === "passed" ? "Passed" : simResult.status === "warning" ? "Warning" : "Failed",
            deviceInfo.deviceName,
          ),
        );

        return result;
      }

      // Normal mode: call the API
      return runDiagnostic(payload);
    },
    onSuccess: () => {
      // In simulator mode there's nothing to invalidate (no API cache)
      if (!simulatorMode) {
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
      }
    },
  });
}

// ─── useDiagnosticResults ─────────────────────────────────────────────────

export function useDiagnosticResults(params?: {
  deviceId?: string;
  testId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const storeResults = useLiveDiagnosticStore((s) => s.results);

  const query = useQuery({
    queryKey: queryKeys.diagnostics.results(params as Record<string, unknown>),
    queryFn: () => getDiagnosticResults(params),
    enabled: !simulatorMode,
  });

  // Simulator mode: return results from the local store only
  const simFiltered = useMemo(() => {
    if (!simulatorMode) return [];
    let filtered = storeResults;

    // Apply filters matching the API
    if (params?.deviceId) {
      filtered = filtered.filter((r) => r.deviceId === params.deviceId);
    }
    if (params?.testId) {
      filtered = filtered.filter((r) => r.testId === params.testId);
    }
    if (params?.status) {
      filtered = filtered.filter((r) => r.status === params.status);
    }

    // Paginate
    const page = params?.page ?? 1;
    const limit = params?.limit ?? 20;
    const start = (page - 1) * limit;
    const paged = filtered.slice(start, start + limit);

    return paged;
  }, [simulatorMode, storeResults, params?.deviceId, params?.testId, params?.status, params?.page, params?.limit]);

  const simTotal = useMemo(() => {
    if (!simulatorMode) return 0;
    let filtered = storeResults;
    if (params?.deviceId) filtered = filtered.filter((r) => r.deviceId === params.deviceId);
    if (params?.testId) filtered = filtered.filter((r) => r.testId === params.testId);
    if (params?.status) filtered = filtered.filter((r) => r.status === params.status);
    return filtered.length;
  }, [simulatorMode, storeResults, params?.deviceId, params?.testId, params?.status]);

  const limit = params?.limit ?? 20;
  const simTotalPages = Math.max(1, Math.ceil(simTotal / limit));

  return {
    data: simulatorMode
      ? { data: simFiltered, pagination: { page: params?.page ?? 1, limit, total: simTotal, totalPages: simTotalPages } }
      : query.data,
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
  };
}

// ─── useDiagnosticResult ──────────────────────────────────────────────────

export function useDiagnosticResult(id: string) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const storeResults = useLiveDiagnosticStore((s) => s.results);

  const query = useQuery({
    queryKey: queryKeys.diagnostics.resultDetail(id),
    queryFn: () => getDiagnosticResult(id),
    enabled: !!id && !simulatorMode,
  });

  // Simulator mode: find result in local store
  const simResult = useMemo(() => {
    if (!simulatorMode || !id) return undefined;
    return storeResults.find((r) => r.id === id);
  }, [simulatorMode, id, storeResults]);

  return {
    data: simulatorMode ? simResult : query.data,
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
  };
}
