/**
 * Zustand store for live real-time alerts received via Socket.IO.
 *
 * This store holds ephemeral alert overlay data — it is NOT a replacement
 * for TanStack Query's server-state cache. Alerts arrive via the
 * `alert:created` and `alert:updated` Socket.IO events and are kept here
 * for instant UI updates. When the socket disconnects or the user navigates
 * away, this state is ephemeral.
 *
 * @see ADR-0003 — Socket.IO for Real-Time Events
 */

import { create } from "zustand";
import type { AlertSeverity, AlertStatus, AlertCategory } from "@sentience/types";

// ─── Types ──────────────────────────────────────────────────────────

export interface LiveAlertEntry {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: AlertCategory;
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

export interface AlertHistoryEntry {
  alertId: string;
  fromStatus: AlertStatus;
  toStatus: AlertStatus;
  by?: string;
  timestamp: string;
}

// ─── State ────────────────────────────────────────────────────────────

interface LiveAlertState {
  /** Map of alertId → alert entry */
  alerts: Record<string, LiveAlertEntry>;

  /** Timeline history per alertId */
  alertHistory: Record<string, AlertHistoryEntry[]>;

  /** Ordered list of alert IDs (newest first) */
  alertIds: string[];

  /** Socket connection status */
  isSocketConnected: boolean;

  /** Last time any alert data was received */
  lastUpdatedAt: string | null;

  // ─── Actions ──────────────────────────────────────────────────────

  addAlert: (payload: {
    alertId: string;
    title: string;
    description?: string;
    severity: AlertSeverity;
    status?: AlertStatus;
    category?: string;
    deviceId?: string;
    siteId?: string;
    siteName?: string;
    estateId?: string;
    estateName?: string;
    timestamp: string;
  }) => void;

  updateAlertStatus: (
    alertId: string,
    status: AlertStatus,
    by?: string,
    resolution?: string,
  ) => void;

  acknowledgeAlert: (alertId: string, by?: string) => void;
  resolveAlert: (alertId: string, by?: string, resolution?: string) => void;
  setSocketConnected: (connected: boolean) => void;
  clearAlerts: () => void;
}

const MAX_ALERTS = 100;

function categorizeSeverity(severity: string): AlertSeverity {
  if (severity === "critical" || severity === "error") return "critical";
  if (severity === "warning") return "warning";
  return "info";
}

function categorizeEvent(eventCategory: string): AlertCategory {
  const map: Record<string, AlertCategory> = {
    battery_low: "battery_low",
    signal_weak: "signal_weak",
    temperature_high: "temperature_high",
    device_offline: "device_offline",
    device_fault: "device_fault",
    threshold_breach: "threshold_breach",
    config_change: "config_change",
    firmware_outdated: "firmware_outdated",
    connection_lost: "connection_lost",
    voltage_drop: "voltage_drop",
    shutdown: "device_offline",
  };
  return map[eventCategory] ?? "system";
}

export const useLiveAlertStore = create<LiveAlertState>()((set) => ({
  alerts: {},
  alertHistory: {},
  alertIds: [],
  isSocketConnected: false,
  lastUpdatedAt: null,

  addAlert: (payload) => {
    set((state) => {
      // Deduplicate: if alert ID already exists, skip
      if (state.alerts[payload.alertId]) return state;

      const now = payload.timestamp;
      const category = categorizeEvent(payload.category ?? "system");
      const severity = categorizeSeverity(payload.severity);

      const entry: LiveAlertEntry = {
        id: payload.alertId,
        title: payload.title,
        description: payload.description ?? payload.title,
        severity,
        status: "open",
        category,
        deviceId: payload.deviceId,
        siteId: payload.siteId,
        siteName: payload.siteName,
        estateId: payload.estateId,
        estateName: payload.estateName,
        source: "system",
        occurredAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const historyEntry: AlertHistoryEntry = {
        alertId: payload.alertId,
        fromStatus: "open",
        toStatus: "open",
        timestamp: now,
      };

      return {
        alerts: { ...state.alerts, [payload.alertId]: entry },
        alertHistory: {
          ...state.alertHistory,
          [payload.alertId]: [
            historyEntry,
            ...(state.alertHistory[payload.alertId] ?? []),
          ],
        },
        alertIds: [payload.alertId, ...state.alertIds].slice(0, MAX_ALERTS),
        lastUpdatedAt: now,
      };
    });
  },

  updateAlertStatus: (alertId, status, by, resolution) => {
    set((state) => {
      const existing = state.alerts[alertId];
      if (!existing) return state;

      const now = new Date().toISOString();
      const fromStatus = existing.status;
      if (fromStatus === status) return state;

      const updated: LiveAlertEntry = {
        ...existing,
        status,
        updatedAt: now,
        ...(status === "acknowledged"
          ? { acknowledgedBy: by, acknowledgedAt: now }
          : {}),
        ...(status === "resolved"
          ? { resolvedBy: by, resolvedAt: now, resolution }
          : {}),
      };

      const historyEntry: AlertHistoryEntry = {
        alertId,
        fromStatus,
        toStatus: status,
        by,
        timestamp: now,
      };

      return {
        alerts: { ...state.alerts, [alertId]: updated },
        alertHistory: {
          ...state.alertHistory,
          [alertId]: [
            historyEntry,
            ...(state.alertHistory[alertId] ?? []),
          ],
        },
        lastUpdatedAt: now,
      };
    });
  },

  acknowledgeAlert: (alertId, by) => {
    set((state) => {
      const existing = state.alerts[alertId];
      if (!existing || existing.status === "acknowledged") return state;
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        status: "acknowledged" as AlertStatus,
        acknowledgedBy: by,
        acknowledgedAt: now,
        updatedAt: now,
      };
      const historyEntry: AlertHistoryEntry = {
        alertId,
        fromStatus: existing.status,
        toStatus: "acknowledged",
        by,
        timestamp: now,
      };
      return {
        alerts: { ...state.alerts, [alertId]: updated },
        alertHistory: {
          ...state.alertHistory,
          [alertId]: [historyEntry, ...(state.alertHistory[alertId] ?? [])],
        },
        lastUpdatedAt: now,
      };
    });
  },

  resolveAlert: (alertId, by, resolution) => {
    set((state) => {
      const existing = state.alerts[alertId];
      if (!existing || existing.status === "resolved") return state;
      const now = new Date().toISOString();
      const updated = {
        ...existing,
        status: "resolved" as AlertStatus,
        resolvedBy: by,
        resolvedAt: now,
        resolution,
        updatedAt: now,
      };
      const historyEntry: AlertHistoryEntry = {
        alertId,
        fromStatus: existing.status,
        toStatus: "resolved",
        by,
        timestamp: now,
      };
      return {
        alerts: { ...state.alerts, [alertId]: updated },
        alertHistory: {
          ...state.alertHistory,
          [alertId]: [historyEntry, ...(state.alertHistory[alertId] ?? [])],
        },
        lastUpdatedAt: now,
      };
    });
  },

  setSocketConnected: (connected) => {
    set({ isSocketConnected: connected });
  },

  clearAlerts: () => {
    set({
      alerts: {},
      alertHistory: {},
      alertIds: [],
      isSocketConnected: false,
      lastUpdatedAt: null,
    });
  },
}));
