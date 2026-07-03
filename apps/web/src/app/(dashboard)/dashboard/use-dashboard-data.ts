/**
 * Dashboard data hook — merges live realtime device state with mock data
 * fallback for the dashboard operations center display.
 *
 * When live socket data is present, all metrics reflect the actual devices
 * in the live-device store using shared selectors from @sentience/utils.
 * When absent, they fall back to static mock values so the UI is never empty.
 *
 * All derived metrics use the shared selectors so every page displays
 * identical values for identical live data.
 */

import { useMemo } from "react";
import { useLiveDeviceStore } from "@/stores/live-device-store";
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

// ─── Mock Fallbacks ───────────────────────────────────────────────────

const MOCK_KPIS: DashboardKpi[] = [
  {
    label: "Total Devices",
    value: "2,847",
    change: "+12",
    trend: "up",
    icon: Monitor,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    label: "Online",
    value: "2,631",
    change: "92.4%",
    trend: "up",
    icon: Wifi,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Offline",
    value: "142",
    change: "5.0%",
    trend: "down",
    icon: WifiOff,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    label: "Faults",
    value: "37",
    change: "1.3%",
    trend: "up",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    label: "Warnings",
    value: "89",
    change: "3.1%",
    trend: "down",
    icon: AlertTriangle,
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-950/30",
  },
];

const MOCK_HEALTH: SystemHealthItem[] = [
  { label: "Online", value: 92.4, color: "bg-emerald-500" },
  { label: "Offline", value: 5.0, color: "bg-slate-400" },
  { label: "Fault", value: 1.3, color: "bg-red-500" },
  { label: "Warning", value: 1.3, color: "bg-amber-500" },
];

const MOCK_BATTERY: DistributionItem[] = [
  { label: "Good (>60%)", value: 68, count: 1937, color: "bg-emerald-500" },
  { label: "Fair (20–60%)", value: 22, count: 626, color: "bg-amber-500" },
  { label: "Low (<20%)", value: 10, count: 284, color: "bg-red-500" },
];

const MOCK_SIGNAL: DistributionItem[] = [
  { label: "Excellent", value: 35, count: 996, color: "bg-emerald-500" },
  { label: "Good", value: 30, count: 854, color: "bg-blue-500" },
  { label: "Fair", value: 22, count: 626, color: "bg-amber-500" },
  { label: "Poor", value: 13, count: 371, color: "bg-red-500" },
];

const MOCK_TEMPERATURE: DistributionItem[] = [
  { label: "Normal", value: 78, count: 2220, color: "bg-emerald-500" },
  { label: "High", value: 17, count: 484, color: "bg-amber-500" },
  { label: "Critical", value: 5, count: 143, color: "bg-red-500" },
];

const MOCK_ESTATES: EstateSummary[] = [
  { id: "estate-riverside", name: "Riverside Complex", total: 312, online: 287, offline: 15, fault: 3, warning: 7 },
  { id: "estate-techvalley", name: "Tech Valley Park", total: 245, online: 228, offline: 10, fault: 2, warning: 5 },
  { id: "estate-harbour", name: "Harbour Terminal", total: 189, online: 172, offline: 9, fault: 3, warning: 5 },
  { id: "estate-greenfield", name: "Greenfield Data Centre", total: 156, online: 148, offline: 4, fault: 1, warning: 3 },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(id: string): boolean {
  return UUID_RE.test(id);
}

export function useDashboardData() {
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);
  const lastUpdatedAt = useLiveDeviceStore((s) => s.lastUpdatedAt);

  // Only include live entries whose deviceId is a UUID — non-UUID
  // entries are simulator-only devices that don't exist in the DB and
  // should not inflate dashboard counts.
  const deviceEntries = Object.values(devices).filter((d) => isUUID(d.deviceId));
  const hasLiveData = deviceEntries.length > 0;

  // ─── Debug: log all tracked devices with classification ─────────
  if (hasLiveData && process.env.NODE_ENV === "development") {
    const counts = computeStatusCounts(deviceEntries);
    console.log(`[dashboard] Total=${counts.total} Online=${counts.online} Offline=${counts.offline} Fault=${counts.fault} Warning=${counts.warning}`);
  }

  // ─── KPI Cards ─────────────────────────────────────────────────────

  const kpis: DashboardKpi[] = useMemo(() => {
    if (!hasLiveData) return MOCK_KPIS;

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
  }, [deviceEntries, hasLiveData]);

  // ─── System Health (status distribution) ──────────────────────────

  const systemHealth: SystemHealthItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_HEALTH;
    if (deviceEntries.length === 0) return MOCK_HEALTH;
    return computeSystemHealth(deviceEntries);
  }, [deviceEntries, hasLiveData]);

  // ─── Fleet Health Score ───────────────────────────────────────────

  const fleetHealthScore = useMemo((): number => {
    if (!hasLiveData) return 87.2;
    return computeFleetHealthScore(deviceEntries);
  }, [deviceEntries, hasLiveData]);

  // ─── Battery Distribution ─────────────────────────────────────────

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_BATTERY;
    const result = computeBatteryDistribution(deviceEntries);
    // When there are entries with telemetry, use real results; when no telemetry available, fall back to mock
    return result.every((d) => d.count === 0) ? MOCK_BATTERY : result;
  }, [deviceEntries, hasLiveData]);

  // ─── Signal Distribution ──────────────────────────────────────────

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_SIGNAL;
    const result = computeSignalDistribution(deviceEntries);
    return result.every((d) => d.count === 0) ? MOCK_SIGNAL : result;
  }, [deviceEntries, hasLiveData]);

  // ─── Temperature Distribution ─────────────────────────────────────

  const temperatureDistribution: DistributionItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_TEMPERATURE;
    const result = computeTemperatureDistribution(deviceEntries);
    return result.every((d) => d.count === 0) ? MOCK_TEMPERATURE : result;
  }, [deviceEntries, hasLiveData]);

  // ─── Live Alerts (severity-filtered events) ───────────────────────

  const liveAlerts: LiveAlert[] = useMemo(() => {
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
  }, [recentEvents]);

  // ─── Recent Activity (latest 10 events) ───────────────────────────

  const recentActivity = useMemo(() => {
    return recentEvents.slice(0, 10);
  }, [recentEvents]);

  // ─── Estate Summary ───────────────────────────────────────────────

  const estateSummary: EstateSummary[] = useMemo(() => {
    if (!hasLiveData) return MOCK_ESTATES;
    return computeEstateSummary(deviceEntries);
  }, [deviceEntries, hasLiveData]);

  // ─── Devices Recently Offline ─────────────────────────────────────

  const devicesOffline: OfflineDevice[] = useMemo(() => {
    if (!hasLiveData) return [];
    return deviceEntries
      .filter((d) => d.status === "offline")
      .map((d) => ({
        id: d.deviceId,
        name: `Device ${d.deviceId.slice(0, 8)}`,
        site: d.siteName ?? d.siteId ?? "Unknown",
        lastSeen: d.lastSeen,
      }))
      .slice(0, 10);
  }, [deviceEntries, hasLiveData]);

  // ─── Events Today (count from recent events) ──────────────────────

  const eventsToday = useMemo(() => {
    if (!hasLiveData) return "1,247";
    return recentEvents.length.toLocaleString();
  }, [recentEvents.length, hasLiveData]);

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
    hasLiveData,
    isSocketConnected,
    lastUpdatedAt,
  };
}
