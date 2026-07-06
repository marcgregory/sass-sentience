/**
 * TanStack Query hooks for diagnostic tests and results.
 *
 * Provides list, detail, and mutation hooks following the established
 * pattern in this codebase (estates/sites/users).
 */

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
import type { RunDiagnosticRequest } from "@sentience/types";

// ─── useDiagnosticTests ───────────────────────────────────────────────────

export function useDiagnosticTests(deviceType?: string) {
  return useQuery({
    queryKey: queryKeys.diagnostics.tests(deviceType),
    queryFn: () => getDiagnosticTests(deviceType),
  });
}

// ─── useDiagnosticTest ────────────────────────────────────────────────────

export function useDiagnosticTest(id: string) {
  return useQuery({
    queryKey: queryKeys.diagnostics.testDetail(id),
    queryFn: () => getDiagnosticTest(id),
    enabled: !!id,
  });
}

// ─── useRunDiagnostic ─────────────────────────────────────────────────────

export function useRunDiagnostic() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RunDiagnosticRequest) => runDiagnostic(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.diagnostics.all });
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
  return useQuery({
    queryKey: queryKeys.diagnostics.results(params as Record<string, unknown>),
    queryFn: () => getDiagnosticResults(params),
  });
}

// ─── useDiagnosticResult ──────────────────────────────────────────────────

export function useDiagnosticResult(id: string) {
  return useQuery({
    queryKey: queryKeys.diagnostics.resultDetail(id),
    queryFn: () => getDiagnosticResult(id),
    enabled: !!id,
  });
}
