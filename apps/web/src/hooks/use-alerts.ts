/**
 * TanStack Query hooks for alert data.
 *
 * useAlerts   — paginated alert list from API, merged with live Socket.IO alerts.
 * useAlert    — single alert detail from API.
 * useAcknowledgeAlert — mutation with optimistic update.
 * useResolveAlert     — mutation with optimistic update.
 *
 * Live (socket) alerts are merged into the API list and deduplicated
 * by id so they appear instantly without waiting for a refetch.
 * Alerts that only exist in the live feed (not yet persisted) remain visible.
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getAlerts, getAlert, updateAlert } from "@/lib/alerts";
import type { AlertApiItem } from "@/lib/alerts";
import { queryKeys } from "@/lib/query-keys";
import { useLiveAlertStore, type LiveAlertEntry } from "@/stores/live-alert-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";

// ─── Display Row Type ───────────────────────────────────────────────────

export interface AlertDisplayRow {
  id: string;
  title: string;
  description: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "acknowledged" | "resolved";
  category: string;
  deviceId?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  source: "system" | "rule" | "manual";
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Mappers ──────────────────────────────────────────────────────────────

/**
 * Map an API alert item to the display row shape the page expects.
 */
function mapApiAlertToRow(a: AlertApiItem): AlertDisplayRow {
  return {
    id: a.id,
    title: a.title,
    description: a.description,
    severity: a.severity,
    status: a.status,
    category: a.category,
    deviceId: a.deviceId ?? undefined,
    siteId: a.siteId ?? undefined,
    siteName: a.siteName ?? undefined,
    estateId: a.estateId ?? undefined,
    estateName: a.estateName ?? undefined,
    source: a.source,
    acknowledgedBy: a.acknowledgedBy ?? undefined,
    acknowledgedAt: a.acknowledgedAt ?? undefined,
    resolvedBy: a.resolvedBy ?? undefined,
    resolvedAt: a.resolvedAt ?? undefined,
    resolution: a.resolution ?? undefined,
    occurredAt: a.occurredAt,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };
}

/**
 * Map a live store alert entry to the display row shape.
 */
function mapLiveAlertToRow(e: LiveAlertEntry): AlertDisplayRow {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    severity: e.severity,
    status: e.status,
    category: e.category,
    deviceId: e.deviceId,
    siteId: e.siteId,
    siteName: e.siteName,
    estateId: e.estateId,
    estateName: e.estateName,
    source: e.source,
    acknowledgedBy: e.acknowledgedBy,
    acknowledgedAt: e.acknowledgedAt,
    resolvedBy: e.resolvedBy,
    resolvedAt: e.resolvedAt,
    resolution: e.resolution,
    occurredAt: e.occurredAt,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

// ─── useAlerts ────────────────────────────────────────────────────────────

export interface UseAlertsOptions {
  severity?: string;
  status?: string;
  category?: string;
  deviceId?: string;
  estateId?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch alerts from the API and merge live socket alerts on top.
 *
 * API alerts form the history baseline. Live alerts from the Zustand store
 * are prepended and deduplicated so they appear instantly.
 * Alerts that only exist in the live feed (not yet persisted) remain visible.
 */
export function useAlerts(options: UseAlertsOptions = {}) {
  const { severity, status, category, deviceId, estateId, page = 1, limit = 100 } = options;

  // Build API params from filter options
  const apiParams = useMemo(() => {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (severity && severity !== "all") params.severity = severity;
    if (status && status !== "all") params.status = status;
    if (category && category !== "all") params.category = category;
    if (deviceId && deviceId !== "all") params.device_id = deviceId;
    if (estateId) params.estate_id = estateId;
    params.page = page;
    params.limit = limit;
    return params;
  }, [severity, status, category, deviceId, estateId, page, limit]);

  const query = useQuery({
    queryKey: queryKeys.alerts.list(apiParams),
    queryFn: () => getAlerts(apiParams),
  });

  const storeAlerts = useLiveAlertStore((s) => s.alerts);
  const storeAlertIds = useLiveAlertStore((s) => s.alertIds);
  const isSocketConnected = useLiveAlertStore((s) => s.isSocketConnected);
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  // Merge API alerts with live store (when simulator mode is ON, show ONLY live alerts)

  // NOTE: When simulator mode is ON, ONLY live socket alerts are shown.
  // This is exclusive — no database alerts are mixed in — so the user
  // sees a clean simulator-only view. Toggle Sim OFF to see database data.
  const alerts = useMemo<AlertDisplayRow[]>(() => {
    if (!simulatorMode) {
      // Normal mode: API data only
      return (query.data?.data ?? []).map(mapApiAlertToRow);
    }

    // Simulator mode: live alerts ONLY (exclusive, no API merge)
    const seenIds = new Set<string>();
    const result: AlertDisplayRow[] = [];

    for (const id of storeAlertIds) {
      const live = storeAlerts[id];
      if (!live || seenIds.has(live.id)) continue;
      seenIds.add(live.id);
      result.push(mapLiveAlertToRow(live));
    }

    return result;
  }, [query.data, storeAlerts, storeAlertIds, simulatorMode]);

  const total = simulatorMode
    ? storeAlertIds.length
    : (query.data?.pagination?.total ?? 0);

  return {
    alerts,
    total,
    apiTotal: total,
    // When simulator mode is ON, use live alerts directly — ignore API state
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
    error: query.error,
    isSocketConnected,
  };
}

// ─── useAlert ─────────────────────────────────────────────────────────────

/**
 * Fetch a single alert by ID from the API.
 */
export function useAlert(id: string) {
  const query = useQuery({
    queryKey: queryKeys.alerts.detail?.(id) ?? ["alerts", "detail", id],
    queryFn: () => getAlert(id),
    enabled: !!id,
  });

  return {
    alert: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────

/**
 * Acknowledge an alert — sets status to "acknowledged".
 * Updates both the backend API and the live Zustand store for instant UI feedback.
 */
export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();
  const storeAck = useLiveAlertStore((s) => s.acknowledgeAlert);

  return useMutation({
    mutationFn: ({ id, by }: { id: string; by?: string }) =>
      updateAlert(id, { status: "acknowledged", acknowledgedBy: by }),
    onMutate: async ({ id, by }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all });

      // Optimistically update live store
      storeAck(id, by);

      // Snapshot previous query data for rollback
      const previousData = queryClient.getQueryData(queryKeys.alerts.list());
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.alerts.list(), context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}

/**
 * Resolve an alert — sets status to "resolved".
 * Updates both the backend API and the live Zustand store for instant UI feedback.
 */
export function useResolveAlert() {
  const queryClient = useQueryClient();
  const storeResolve = useLiveAlertStore((s) => s.resolveAlert);

  return useMutation({
    mutationFn: ({ id, by, resolution }: { id: string; by?: string; resolution?: string }) =>
      updateAlert(id, { status: "resolved", resolvedBy: by, resolution }),
    onMutate: async ({ id, by, resolution }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.alerts.all });

      // Optimistically update live store
      storeResolve(id, by, resolution);

      // Snapshot previous query data for rollback
      const previousData = queryClient.getQueryData(queryKeys.alerts.list());
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.alerts.list(), context.previousData);
      }
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    },
  });
}
