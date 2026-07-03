/**
 * TanStack Query hooks for audit log data.
 *
 * useAuditLogs  — paginated, filterable list of audit entries.
 * useAuditLog   — single audit entry detail.
 *
 * No live overlay needed — audit logs are historical data and don't
 * arrive via Socket.IO.
 */

import { useQuery } from "@tanstack/react-query";
import { getAuditLogs, getAuditLog } from "@/lib/audit-logs";
import { queryKeys } from "@/lib/query-keys";
import type { AuditLogParams } from "@/lib/audit-logs";

// ─── useAuditLogs ─────────────────────────────────────────────────────────

/**
 * Fetch a paginated, filterable list of audit log entries.
 */
export function useAuditLogs(params?: AuditLogParams) {
  const query = useQuery({
    queryKey: queryKeys.auditLogs.list(params),
    queryFn: () => getAuditLogs(params),
  });

  return {
    entries: query.data?.data ?? [],
    pagination: query.data?.pagination ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useAuditLog ──────────────────────────────────────────────────────────

/**
 * Fetch a single audit log entry by ID.
 */
export function useAuditLog(id: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.auditLogs.detail(id!),
    queryFn: () => getAuditLog(id!),
    enabled: !!id,
  });

  return {
    entry: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
