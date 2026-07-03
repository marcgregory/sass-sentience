/**
 * Dashboard data hook — provides metrics based on current Simulator Mode.
 *
 * Three states:
 *   Simulator Mode ON + live store has data → live metrics from store
 *   Simulator Mode ON + live store empty    → zero state (no simulator running)
 *   Simulator Mode OFF                      → mock data only
 *
 * These modes are mutually exclusive — never mix data sources.
 */

import { useMemo } from "react";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
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

// ─── Mock Fallbacks (Sim Mode OFF, no API data) ───────────────────────

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

// ─── Zero state (Sim Mode ON, no simulator running) ───────────────────

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

  // ─── Mode selection ─────────────────────────────────────────────────
  //   Sim ON + has data → live metrics
  //   Sim ON + no data  → zero state (sim is ON but nothing connected)
  //   Sim OFF           → mock data

  const mode: "live" | "zero" | "mock" = simulatorMode
    ? hasRealSimData ? "live" : "zero"
    : "mock";

  const kpis: DashboardKpi[] = useMemo(() => {
    if (mode === "mock") return MOCK_KPIS;
    if (mode === "zero") return ZERO_KPIS;

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
  }, [deviceEntries, mode]);

  const systemHealth: SystemHealthItem[] = useMemo(() => {
    if (mode === "mock") return MOCK_HEALTH;
    if (mode === "zero") return ZERO_HEALTH;
    return computeSystemHealth(deviceEntries);
  }, [deviceEntries, mode]);

  const fleetHealthScore = useMemo((): number => {
    if (mode === "mock") return 87.2;
    if (mode === "zero") return 0;
    return computeFleetHealthScore(deviceEntries);
  }, [deviceEntries, mode]);

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (mode !== "live") return mode === "mock" ? MOCK_BATTERY : ZERO_DISTRIBUTION;
    const result = computeBatteryDistribution(deviceEntries);
    return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
  }, [deviceEntries, mode]);

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (mode !== "live") return mode === "mock" ? MOCK_SIGNAL : ZERO_DISTRIBUTION;
    const result = computeSignalDistribution(deviceEntries);
    return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
  }, [deviceEntries, mode]);

  const temperatureDistribution: DistributionItem[] = useMemo(() => {
    if (mode !== "live") return mode === "mock" ? MOCK_TEMPERATURE : ZERO_DISTRIBUTION;
    const result = computeTemperatureDistribution(deviceEntries);
    return result.every((d) => d.count === 0) ? ZERO_DISTRIBUTION : result;
  }, [deviceEntries, mode]);

  // ─── Live Alerts (severity-filtered events) ───────────────────────

  const liveAlerts: LiveAlert[] = useMemo(() => {
    if (mode !== "live") return [];
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
  }, [recentEvents, mode]);

  // ─── Recent Activity (latest 10 events) ───────────────────────────

  const recentActivity = useMemo(() => {
    if (mode !== "live") return [];
    return recentEvents.slice(0, 10);
  }, [recentEvents, mode]);

  // ─── Estate Summary ───────────────────────────────────────────────

  const estateSummary: EstateSummary[] = useMemo(() => {
    if (mode === "mock") return MOCK_ESTATES;
    if (mode === "zero") return ZERO_ESTATES;
    return computeEstateSummary(deviceEntries);
  }, [deviceEntries, mode]);

  // ─── Devices Recently Offline ─────────────────────────────────────

  const devicesOffline: OfflineDevice[] = useMemo(() => {
    if (mode !== "live") return [];
    return deviceEntries
      .filter((d) => d.status === "offline")
      .map((d) => ({
        id: d.deviceId,
        name: d.deviceName ?? `Device ${d.deviceId.slice(0, 8)}`,
        site: d.siteName ?? d.siteId ?? "Unknown",
        lastSeen: d.lastSeen,
      }))
      .slice(0, 10);
  }, [deviceEntries, mode]);

  // ─── Events Today (count from recent events) ──────────────────────

  const eventsToday = useMemo(() => {
    if (mode === "mock") return "1,247";
    if (mode === "zero") return "0";
    return recentEvents.length.toLocaleString();
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
  };
}
