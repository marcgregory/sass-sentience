/**
 * Dashboard data hook — merges live realtime device state with mock data
 * fallback for the dashboard KPI display.
 *
 * When live socket data is present, KPIs reflect the actual devices in
 * the live-device store. When absent, they fall back to static mock values
 * so the UI is never empty.
 */

import { useMemo } from "react";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import type { LucideIcon } from "lucide-react";
import { Monitor, Wifi, WifiOff, AlertTriangle } from "lucide-react";

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
    change: "+8",
    trend: "up",
    icon: Wifi,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
  },
  {
    label: "Offline",
    value: "142",
    change: "-3",
    trend: "down",
    icon: WifiOff,
    color: "text-slate-600 dark:text-slate-400",
    bg: "bg-slate-50 dark:bg-slate-900/50",
  },
  {
    label: "Faults",
    value: "37",
    change: "+5",
    trend: "up",
    icon: AlertTriangle,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    label: "Warnings",
    value: "89",
    change: "-2",
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

export function useDashboardData() {
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);

  const deviceEntries = Object.values(devices);
  const hasLiveData = deviceEntries.length > 0;

  const kpis: DashboardKpi[] = useMemo(() => {
    if (!hasLiveData) return MOCK_KPIS;

    const total = deviceEntries.length;
    const online = deviceEntries.filter((d) => d.status === "online").length;
    const offline = deviceEntries.filter((d) => d.status === "offline").length;
    const faults = deviceEntries.filter((d) => d.status === "fault").length;
    const warnings = deviceEntries.filter((d) => d.status === "warning").length;

    return [
      {
        label: "Total Devices",
        value: total.toLocaleString(),
        change: `live: ${total}`,
        trend: "up",
        icon: Monitor,
        color: "text-blue-600 dark:text-blue-400",
        bg: "bg-blue-50 dark:bg-blue-950/30",
      },
      {
        label: "Online",
        value: online.toLocaleString(),
        change: total > 0 ? `${Math.round((online / total) * 100)}%` : "0%",
        trend: "up",
        icon: Wifi,
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/30",
      },
      {
        label: "Offline",
        value: offline.toLocaleString(),
        change: total > 0 ? `${Math.round((offline / total) * 100)}%` : "0%",
        trend: offline > 0 ? "up" : "down",
        icon: WifiOff,
        color: "text-slate-600 dark:text-slate-400",
        bg: "bg-slate-50 dark:bg-slate-900/50",
      },
      {
        label: "Faults",
        value: faults.toLocaleString(),
        change: total > 0 ? `${Math.round((faults / total) * 100)}% of total` : "0%",
        trend: faults > 0 ? "up" : "down",
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
        bg: "bg-red-50 dark:bg-red-950/30",
      },
      {
        label: "Warnings",
        value: warnings.toLocaleString(),
        change: total > 0 ? `${Math.round((warnings / total) * 100)}% of total` : "0%",
        trend: warnings > 0 ? "up" : "down",
        icon: AlertTriangle,
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/30",
      },
    ];
  }, [deviceEntries, hasLiveData]);

  const systemHealth: SystemHealthItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_HEALTH;
    const total = deviceEntries.length;
    if (total === 0) return MOCK_HEALTH;
    const online = deviceEntries.filter((d) => d.status === "online").length;
    const offline = deviceEntries.filter((d) => d.status === "offline").length;
    const faults = deviceEntries.filter((d) => d.status === "fault").length;
    const warnings = deviceEntries.filter((d) => d.status === "warning").length;
    const pct = (n: number) => Math.round((n / total) * 1000) / 10;
    return [
      { label: "Online", value: pct(online), color: "bg-emerald-500" },
      { label: "Offline", value: pct(offline), color: "bg-slate-400" },
      { label: "Fault", value: pct(faults), color: "bg-red-500" },
      { label: "Warning", value: pct(warnings), color: "bg-amber-500" },
    ];
  }, [deviceEntries, hasLiveData]);

  const liveAlerts: LiveAlert[] = useMemo(() => {
    return recentEvents
      .filter((e) => e.severity === "critical" || e.severity === "warning")
      .slice(0, 4)
      .map((e) => ({
        id: e.eventId,
        title: e.title,
        severity: e.severity as "critical" | "warning" | "info",
        time: e.timestamp,
        site: e.siteId ?? "Unknown",
      }));
  }, [recentEvents]);

  const batteryCounts = useMemo(() => {
    if (!hasLiveData) return null;
    const entries = Object.values(devices).filter((d) => d.telemetry);
    if (entries.length === 0) return null;
    const good = entries.filter((d) => d.telemetry!.battery > 80).length;
    const fair = entries.filter(
      (d) => d.telemetry!.battery >= 40 && d.telemetry!.battery <= 80,
    ).length;
    const low = entries.filter((d) => d.telemetry!.battery < 40).length;
    const total = entries.length;
    return {
      good: Math.round((good / total) * 100),
      fair: Math.round((fair / total) * 100),
      low: Math.round((low / total) * 100),
    };
  }, [devices, hasLiveData]);

  const eventsToday = useMemo(() => {
    if (!hasLiveData) return "1,247";
    return recentEvents.length.toLocaleString();
  }, [recentEvents.length, hasLiveData]);

  return {
    kpis,
    systemHealth,
    liveAlerts,
    batteryCounts,
    eventsToday,
    hasLiveData,
    isSocketConnected,
  };
}
