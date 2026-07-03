/**
 * TanStack Query hooks for report data.
 *
 * useReportSummary — fleet summary computed from the devices table.
 * useReportTrends  — alert time series + device availability over a date range.
 * useRecentReports — list of previously generated report records.
 * useGenerateReport — mutation to create a new report.
 *
 * These hooks fetch from the backend API; live socket data is NOT merged
 * here because reports are computed/aggregate views, not real-time feeds.
 * The individual dashboard still overlays live data via `useLiveDeviceStore`
 * for freshness where appropriate.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getReportSummary, getReportTrends, getReports, generateReport } from "@/lib/reports";
import type { ReportParams, CreateReportPayload } from "@/lib/reports";
import { queryKeys } from "@/lib/query-keys";

// ─── useReportSummary ───────────────────────────────────────────────────────

export interface UseReportSummaryOptions {
  estateId?: string | null;
  siteId?: string | null;
  deviceId?: string | null;
}

/**
 * Fetch the fleet report summary from the API.
 * Supports optional estate/site/device filtering.
 */
export function useReportSummary(options: UseReportSummaryOptions = {}) {
  const { estateId, siteId, deviceId } = options;

  const params: ReportParams = {};
  if (estateId) params.estate_id = estateId;
  if (siteId) params.site_id = siteId;
  if (deviceId) params.device_id = deviceId;

  const query = useQuery({
    queryKey: [...queryKeys.reports.all, "summary", params],
    queryFn: () => getReportSummary(params),
    staleTime: 30_000, // 30s — aggregate data doesn't change second-to-second
    retry: 1,
  });

  return {
    summary: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useReportTrends ────────────────────────────────────────────────────────

export interface UseReportTrendsOptions {
  days: number;
  estateId?: string | null;
  siteId?: string | null;
  deviceId?: string | null;
}

/**
 * Fetch report trends (alert time series + device availability).
 */
export function useReportTrends(options: UseReportTrendsOptions) {
  const { days, estateId, siteId, deviceId } = options;

  const params: ReportParams & { days: number } = { days };
  if (estateId) params.estate_id = estateId;
  if (siteId) params.site_id = siteId;
  if (deviceId) params.device_id = deviceId;

  const query = useQuery({
    queryKey: [...queryKeys.reports.all, "trends", params],
    queryFn: () => getReportTrends(params),
    staleTime: 30_000,
    retry: 1,
  });

  return {
    trends: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useRecentReports ───────────────────────────────────────────────────────

/**
 * Fetch the list of previously generated reports.
 */
export function useRecentReports(page = 1, limit = 20) {
  const query = useQuery({
    queryKey: queryKeys.reports.list({ page, limit }),
    queryFn: () => getReports({ page, limit }),
    staleTime: 60_000,
  });

  return {
    reports: query.data?.data ?? [],
    total: query.data?.pagination?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useGenerateReport ──────────────────────────────────────────────────────

/**
 * Mutation to generate a new report.
 */
export function useGenerateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateReportPayload) => generateReport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    },
  });
}
