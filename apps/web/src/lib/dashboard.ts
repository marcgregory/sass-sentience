/**
 * Dashboard API functions.
 *
 * Provides typed functions for fetching dashboard summary data from
 * the backend API. Used by TanStack Query hooks — never call these
 * directly from components.
 */

import { get } from "./api-client";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface DashboardDistItem {
  label: string;
  value: number;
  count: number;
  color: string;
}

export interface DashboardEstateSummary {
  id: string;
  name: string;
  total: number;
  online: number;
  offline: number;
  fault: number;
  warning: number;
}

export interface DashboardSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultCount: number;
  warningCount: number;
  batteryDistribution: DashboardDistItem[];
  signalDistribution: DashboardDistItem[];
  temperatureDistribution: DashboardDistItem[];
  fleetHealth: number;
  estates: DashboardEstateSummary[];
  sites: number;
  openAlerts: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

/**
 * Fetch dashboard summary (computed from persisted database records).
 * Returns statistics with no mock/fallback values — when DB is empty,
 * all counts are zero.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  return get<DashboardSummary>("/dashboard/summary");
}
