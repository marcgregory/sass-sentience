/**
 * Dashboard data hook — provides metrics based on current Simulator Mode.
 *
 * Three modes:
 *   Simulator Mode ON + live store has data → live metrics from store
 *   Simulator Mode ON + live store empty    → zero state (no simulator running)
 *   Simulator Mode OFF                      → database summary from API
 *
 * These modes are mutually exclusive — never mix data sources.
 * No mock/fallback values are ever returned. If the data source has
 * nothing, all counts are zero. If the API fails, zeros with a retry.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import { queryKeys } from "@/lib/query-keys";
import { getDashboardSummary } from "@/lib/dashboard";
import type { LucideIcon } from "lucide-react";
import { Monitor, Wifi, WifiOff, AlertTriangle } from "lucide-react";
import {
  computeStatusCounts,
  computeBatteryDistribution,
  computeSignalDistribution,
  computeTemperatureDistribution,
  computeFleetHealthScore,
  computeSystemHealth,
  computeEstateSummary,
  type DistributionItem as SelectorDistributionItem,
  type EstateSummary as SelectorEstateSummary,
} from "@sentience/utils";

// ─── Public Types ─────────────────────────────────────────────────────

export interface DashboardKpi {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: LucideIcon;
  color: string;
  bg: string;
}

export interface SystemHealthItem {
  label: string;
  value: number;
  color: string;
}

export interface LiveAlert {
  id: string;
  title: string;
  severity: "critical" | "warning" | "info";
  time: string;
  site: string;
}

export type DistributionItem = SelectorDistributionItem;

export type EstateSummary = SelectorEstateSummary;

export interface OfflineDevice {
  id: string;
  name: string;
  site: string;
  lastSeen: string;
}

// ─── Zero state (when data source has no data) ────────────────────────

const ZERO_KPIS: DashboardKpi[] = [
  { label: "Total Devices", value: "0", change: "—", trend: "up", icon: Monitor, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30" },
  { label: "Online", value: "0", change: "—", trend: "up", icon: Wifi, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
  { label: "Offline", value: "0", change: "—", trend: "down", icon: WifiOff, color: "text-slate-600 dark:text-slate-400", bg: "bg-slate-50 dark:bg-slate-900/50" },
  { label: "Faults", value: "0", change: "—", trend: "down", icon: AlertTriangle, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30" },
  { label: "Warnings", value: "0", change: "—", trend: "down", icon: AlertTriangle, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/30" },
];

const ZERO_HEALTH: SystemHealthItem[] = [
  { label: "Online", value: 0, color: "bg-slate-300" },
  { label: "Offline", value: 0, color: "bg-slate-300" },
  { label: "Fault", value: 0, color: "bg-slate-300" },
  { label: "Warning", value: 0, color: "bg-slate-300" },
];

const ZERO_DISTRIBUTION: DistributionItem[] = [
  { label: "None", value: 0, count: 0, color: "bg-slate-300" },
];

const ZERO_ESTATES: EstateSummary[] = [];

export const SIM_DEVICE_COUNT_ATOM = { count: 0 };

export function useDashboardData() {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  // Always read the live store so we can react to incoming data
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const lastUpdatedAt = useLiveDeviceStore((s) => s.lastUpdatedAt);

  const deviceEntries = Object.values(devices);
  const hasRealSimData = simulatorMode && deviceEntries.length > 0;

  // Expose the live device count for the banner (even when no data yet)
  const simDeviceCount = deviceEntries.length;
  SIM_DEVICE_COUNT_ATOM.count = simDeviceCount;

  // ── Fetch database summary when simulator is OFF ──────────────────────
  const dbSummaryQuery = useQuery({
    queryKey: queryKeys.dashboard.summary,
    queryFn: getDashboardSummary,
    // Skip API call in simulator mode — live store is the source
    enabled: !simulatorMode,
    // Refetch every 30 seconds so the dashboard stays reasonably fresh
    refetchInterval: 30_000,
  });

  const hasDbData =
    !simulatorMode &&
    dbSummaryQuery.isSuccess &&
    (dbSummaryQuery.data?.totalDevices ?? 0) > 0;

  const isDbError =
    !simulatorMode && !dbSummaryQuery.isLoading && dbSummaryQuery.isError;

  // ─── Mode selection ─────────────────────────────────────────────────
  //   Sim ON + has data → live metrics
  //   Sim ON + no data  → zero state (sim is ON but nothing connected)
  //   Sim OFF + has DB data → database summary
  //   Sim OFF + empty DB  or API error → zero state

  const mode: "live" | "zero" | "database" = simulatorMode
    ? hasRealSimData ? "live" : "zero"
    : hasDbData ? "database" : "zero";

  // ─── KPI Derivation ─────────────────────────────────────────────────

  const kpis: DashboardKpi[] = useMemo(() => {
    if (mode === "live") {
      const counts = computeStatusCounts(deviceEntries);
      const onlinePct = counts.total > 0 ? Math.round((counts.online / counts.total) * 100) : 0;

      return [
        {
          label: "Total Devices",
          value: counts.total.toLocaleString(),
          change: `live: ${counts.total}`,
          trend: "up",
          icon: Monitor,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30",
        },
        {
          label: "Online",
          value: counts.online.toLocaleString(),
          change: `${onlinePct}%`,
          trend: "up",
          icon: Wifi,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        },
        {
          label: "Offline",
          value: counts.offline.toLocaleString(),
          change: counts.total > 0 ? `${Math.round((counts.offline / counts.total) * 100)}%` : "0%",
          trend: counts.offline > 0 ? "up" : "down",
          icon: WifiOff,
          color: "text-slate-600 dark:text-slate-400",
          bg: "bg-slate-50 dark:bg-slate-900/50",
        },
        {
          label: "Faults",
          value: counts.fault.toLocaleString(),
          change: counts.total > 0 ? `${Math.round((counts.fault / counts.total) * 100)}% of total` : "0%",
          trend: counts.fault > 0 ? "up" : "down",
          icon: AlertTriangle,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950/30",
        },
        {
          label: "Warnings",
          value: counts.warning.toLocaleString(),
          change: counts.total > 0 ? `${Math.round((counts.warning / counts.total) * 100)}% of total` : "0%",
          trend: counts.warning > 0 ? "up" : "down",
          icon: AlertTriangle,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        },
      ];
    }

    if (mode === "database") {
      const d = dbSummaryQuery.data!;
      const onlinePct = d.totalDevices > 0 ? Math.round((d.onlineDevices / d.totalDevices) * 100) : 0;

      return [
        {
          label: "Total Devices",
          value: d.totalDevices.toLocaleString(),
          change: onlinePct > 0 ? `${onlinePct}%` : "—",
          trend: "up",
          icon: Monitor,
          color: "text-blue-600 dark:text-blue-400",
          bg: "bg-blue-50 dark:bg-blue-950/30",
        },
        {
          label: "Online",
          value: d.onlineDevices.toLocaleString(),
          change: `${onlinePct}%`,
          trend: "up",
          icon: Wifi,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-950/30",
        },
        {
          label: "Offline",
          value: d.offlineDevices.toLocaleString(),
          change: d.totalDevices > 0 ? `${Math.round((d.offlineDevices / d.totalDevices) * 100)}%` : "0%",
          trend: d.offlineDevices > 0 ? "up" : "down",
          icon: WifiOff,
          color: "text-slate-600 dark:text-slate-400",
          bg: "bg-slate-50 dark:bg-slate-900/50",
        },
        {
          label: "Faults",
          value: d.faultCount.toLocaleString(),
          change: d.totalDevices > 0 ? `${Math.round((d.faultCount / d.totalDevices) * 100)}% of total` : "0%",
          trend: d.faultCount > 0 ? "up" : "down",
          icon: AlertTriangle,
          color: "text-red-600 dark:text-red-400",
          bg: "bg-red-50 dark:bg-red-950/30",
        },
        {
          label: "Warnings",
          value: d.warningCount.toLocaleString(),
          change: d.totalDevices > 0 ? `${Math.round((d.warningCount / d.totalDevices) * 100)}% of total` : "0%",
          trend: d.warningCount > 0 ? "up" : "down",
          icon: AlertTriangle,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-950/30",
        },
      ];
    }

    return ZERO_KPIS;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  const systemHealth: SystemHealthItem[] = useMemo(() => {
    if (mode === "live") return computeSystemHealth(deviceEntries);
    if (mode === "database") {
      const d = dbSummaryQuery.data!;
      const total = d.totalDevices || 1;
      return [
        { label: "Online", value: Math.round((d.onlineDevices / total) * 1000) / 10, color: "bg-emerald-500" },
        { label: "Offline", value: Math.round((d.offlineDevices / total) * 1000) / 10, color: "bg-slate-400" },
        { label: "Fault", value: Math.round((d.faultCount / total) * 1000) / 10, color: "bg-red-500" },
        { label: "Warning", value: Math.round((d.warningCount / total) * 1000) / 10, color: "bg-amber-500" },
      ];
    }
    return ZERO_HEALTH;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  const fleetHealthScore = useMemo((): number => {
    if (mode === "live") return computeFleetHealthScore(deviceEntries);
    if (mode === "database") return dbSummaryQuery.data!.fleetHealth;
    return 0;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (mode === "live") {
      const result = computeBatteryDistribution(deviceEntries);
      return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
    }
    if (mode === "database") {
      const d = dbSummaryQuery.data!.batteryDistribution;
      return d.every((item) => item.count === 0) ? ZERO_DISTRIBUTION : d;
    }
    return ZERO_DISTRIBUTION;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (mode === "live") {
      const result = computeSignalDistribution(deviceEntries);
      return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
    }
    if (mode === "database") {
      const d = dbSummaryQuery.data!.signalDistribution;
      return d.every((item) => item.count === 0) ? ZERO_DISTRIBUTION : d;
    }
    return ZERO_DISTRIBUTION;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  const temperatureDistribution: DistributionItem[] = useMemo(() => {
    if (mode === "live") {
      const result = computeTemperatureDistribution(deviceEntries);
      return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
    }
    if (mode === "database") {
      const d = dbSummaryQuery.data!.temperatureDistribution;
      return d.every((item) => item.count === 0) ? ZERO_DISTRIBUTION : d;
    }
    return ZERO_DISTRIBUTION;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  // ─── Live Alerts (severity-filtered events) ───────────────────────

  const liveAlerts: LiveAlert[] = useMemo(() => {
    if (mode === "live") {
      return recentEvents
        .filter((e) => e.severity === "critical" || e.severity === "warning")
        .slice(0, 4)
        .map((e) => ({
          id: e.eventId,
          title: e.title,
          severity: e.severity as "critical" | "warning" | "info",
          time: e.timestamp,
          site: e.siteName ?? e.siteId ?? "Unknown",
        }));
    }
    return [];
  }, [recentEvents, mode]);

  // ─── Recent Activity (latest 10 events) ───────────────────────────

  const recentActivity = useMemo(() => {
    if (mode !== "live") return [];
    return recentEvents.slice(0, 10);
  }, [recentEvents, mode]);

  // ─── Estate Summary ───────────────────────────────────────────────

  const estateSummary: EstateSummary[] = useMemo(() => {
    if (mode === "live") return computeEstateSummary(deviceEntries);
    if (mode === "database") return dbSummaryQuery.data!.estates;
    return ZERO_ESTATES;
  }, [deviceEntries, mode, dbSummaryQuery.data]);

  // ─── Devices Recently Offline ─────────────────────────────────────

  const devicesOffline: OfflineDevice[] = useMemo(() => {
    if (mode !== "live") return [];
    return deviceEntries
      .filter((d) => d.status === "offline")
      .map((d) => ({
        id: d.deviceId,
        name: d.deviceName ?? d.deviceId,
        site: d.siteName ?? d.siteId ?? "Unknown",
        lastSeen: d.lastSeen,
      }))
      .slice(0, 10);
  }, [deviceEntries, mode]);

  // ─── Events Today ─────────────────────────────────────────────────

  const eventsToday = useMemo(() => {
    if (mode === "live") return recentEvents.length.toLocaleString();
    return "0";
  }, [recentEvents.length, mode]);

  return {
    kpis,
    systemHealth,
    fleetHealthScore,
    liveAlerts,
    batteryDistribution,
    signalDistribution,
    temperatureDistribution,
    estateSummary,
    recentActivity,
    devicesOffline,
    eventsToday,
    hasLiveData: mode === "live",
    simDeviceCount,
    mode,
    isSocketConnected: simulatorMode ? isSocketConnected : false,
    lastUpdatedAt: simulatorMode ? lastUpdatedAt : null,
    // Expose API state for the page to show retry/error buttons
    isDbLoading: !simulatorMode && dbSummaryQuery.isLoading,
    isDbError,
  };
}
