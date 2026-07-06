/**
 * Audit log API functions.
 *
 * Provides typed functions for fetching audit log data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get } from "./api-client";
import type { AuditAction } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface AuditLogApiItem {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  resource: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  /** Simulated entries are generated client-side during Simulator Mode. */
  isSimulated?: boolean;
}

export interface AuditLogListResponse {
  data: AuditLogApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuditLogParams {
  action?: string;
  resource?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  [key: string]: unknown;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch the list of audit log entries with optional filtering and pagination.
 */
export async function getAuditLogs(params?: AuditLogParams): Promise<AuditLogListResponse> {
  return get<AuditLogListResponse>("/audit-logs", { params: params as Record<string, string | number | undefined> });
}

/**
 * Fetch a single audit log entry by ID.
 */
export async function getAuditLog(id: string): Promise<AuditLogApiItem> {
  return get<AuditLogApiItem>(`/audit-logs/${id}`);
}
