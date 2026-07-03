/**
 * Alert API functions.
 *
 * Provides typed functions for fetching and mutating alert data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, patch } from "./api-client";
import type { AlertSeverity, AlertStatus, AlertCategory } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface AlertApiItem {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
  deviceId: string | null;
  siteId: string | null;
  siteName?: string;
  estateId: string | null;
  estateName?: string;
  customerId: string | null;
  assignedTo: string | null;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolution: string | null;
  source: "system" | "rule" | "manual";
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertListResponse {
  data: AlertApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AlertsParams {
  severity?: string;
  status?: string;
  category?: string;
  device_id?: string;
  estate_id?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

// ─── Mutation Types ───────────────────────────────────────────────────────

export interface UpdateAlertPayload {
  status: AlertStatus;
  resolution?: string;
  acknowledgedBy?: string;
  resolvedBy?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated alert list from the backend.
 * Supports server-side filtering by severity, status, category, device, and estate.
 */
export async function getAlerts(
  params?: AlertsParams,
): Promise<AlertListResponse> {
  return get<AlertListResponse>("/alerts", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single alert by ID.
 */
export async function getAlert(
  id: string,
): Promise<AlertApiItem> {
  return get<AlertApiItem>(`/alerts/${id}`);
}

/**
 * Update an alert's status (acknowledge, resolve, reopen).
 * Used by TanStack Query mutations with optimistic updates.
 */
export async function updateAlert(
  id: string,
  payload: UpdateAlertPayload,
): Promise<AlertApiItem> {
  return patch<AlertApiItem>(`/alerts/${id}`, payload);
}
