/**
 * Report API functions.
 *
 * Provides typed functions for fetching report data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 *
 * Two categories:
 * 1. Computed report data (summary, trends) — fetched live from devices/events/alerts
 * 2. Generated report records — CRUD for persisted report entries
 */

import { get, post } from "./api-client";

// ─── Computed Report Responses ──────────────────────────────────────────────

export interface SummaryDistributionItem {
  label: string;
  value: number;
  count: number;
  color: string;
}

export interface FaultDistributionItem {
  category: string;
  count: number;
  color: string;
}

export interface ReportSummaryResponse {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultDevices: number;
  warningDevices: number;
  avgBattery: number;
  avgSignal: number;
  healthScore: number;
  onlinePct: number;
  batteryDistribution: SummaryDistributionItem[];
  signalDistribution: SummaryDistributionItem[];
  faultDistribution: FaultDistributionItem[];
}

export interface TimeSeriesPoint {
  date: string;
  label: string;
  critical: number;
  warning: number;
  info: number;
  online: number;
  offline: number;
  fault: number;
}

export interface AvailabilityPoint {
  name: string;
  online: number;
  offline: number;
  fault: number;
}

export interface ReportTrendsResponse {
  alertTrends: TimeSeriesPoint[];
  availability: AvailabilityPoint[];
  days: number;
}

export interface ReportParams {
  estate_id?: string;
  site_id?: string;
  device_id?: string;
  days?: number;
}

// ─── Generated Report Types ─────────────────────────────────────────────────

export interface GeneratedReport {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom" | "adhoc";
  status: "generating" | "ready" | "failed";
  format: "csv" | "pdf";
  dateRangeStart: string;
  dateRangeEnd: string;
  filters: Record<string, unknown> | null;
  metrics: unknown[];
  generatedBy: string;
  generatedAt: string | null;
  fileUrl: string | null;
  createdAt: string;
}

export interface ReportListResponse {
  data: GeneratedReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateReportPayload {
  name: string;
  type: "daily" | "weekly" | "monthly" | "custom" | "adhoc";
  format: "csv" | "pdf";
  dateRangeStart: string;
  dateRangeEnd: string;
  filters?: {
    estateId?: string;
    siteId?: string;
    deviceId?: string;
    severity?: string[];
  };
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Fetch the fleet report summary — computed from the devices table.
 * Supports optional estate/site/device filtering.
 */
export async function getReportSummary(
  params?: ReportParams,
): Promise<ReportSummaryResponse> {
  return get<ReportSummaryResponse>("/reports/summary", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch report trends (alert time series + device availability).
 * Supports optional date range (days) and estate/site/device filtering.
 */
export async function getReportTrends(
  params?: ReportParams & { days?: number },
): Promise<ReportTrendsResponse> {
  return get<ReportTrendsResponse>("/reports/trends", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch the list of previously generated reports.
 */
export async function getReports(
  params?: { page?: number; limit?: number; sort?: string; order?: string },
): Promise<ReportListResponse> {
  return get<ReportListResponse>("/reports", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single generated report by ID.
 */
export async function getReport(id: string): Promise<GeneratedReport> {
  return get<GeneratedReport>(`/reports/${id}`);
}

/**
 * Generate a new report. Creates a report record and returns it.
 */
export async function generateReport(
  payload: CreateReportPayload,
): Promise<GeneratedReport> {
  return post<GeneratedReport>("/reports", payload);
}
