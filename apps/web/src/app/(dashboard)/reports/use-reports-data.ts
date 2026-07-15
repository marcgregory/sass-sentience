/**
 * Reports data hook — fetches report summary and trends from the API
 * via TanStack Query, then overlays live device/alert state for realtime freshness.
 *
 * Three modes:
 *   Simulator Mode ON + live store has data → live metrics from store
 *   Simulator Mode ON + live store empty    → zero state (simulator banner)
 *   Simulator Mode OFF                      → API data (or zero fallback)
 *
 * Chart data (alert trends, availability, distributions) uses live store
 * when simulator mode is active with data, otherwise falls back to the API.
 */

import { useMemo, useState, useCallback } from "react";
import { useReportSummary, useReportTrends } from "@/hooks/use-reports";
import { useLiveDeviceStore, type LiveDeviceEntry } from "@/stores/live-device-store";
import { useLiveAlertStore, type LiveAlertEntry } from "@/stores/live-alert-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import {
  computeFleetSummary,
  computeStatusCounts,
  computeBatteryDistribution,
  computeSignalDistribution,
  type FleetSummary,
  type DistributionItem,
} from "@sentience/utils";
import type {
  TimeSeriesPoint,
  AvailabilityPoint,
  FaultDistributionItem,
  SummaryDistributionItem,
} from "@/lib/reports";

// ─── Types ─────────────────────────────────────────────────────────────

export interface ReportFilter {
  dateRange: "today" | "7d" | "30d" | "90d";
  estateId: string | null;
  siteId: string | null;
  deviceId: string | null;
}

export interface RecentExport {
  id: string;
  name: string;
  filters: string;
  dateRange: string;
  format: "CSV" | "PDF";
  exportedAt: string;
}

// ─── Date Range helpers ──────────────────────────────────────────────

const DATE_RANGE_LABELS: Record<ReportFilter["dateRange"], string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
};

function dateRangeToDays(range: ReportFilter["dateRange"]): number {
  switch (range) {
    case "today": return 1;
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    default: return 30;
  }
}

// ─── DistributionItem adapter ─────────────────────────────────────────

function apiDistToDistItem(d: SummaryDistributionItem): DistributionItem {
  return {
    label: d.label,
    value: d.value,
    count: d.count,
    color: d.color,
  };
}

// ─── Live alert → FaultDistributionItem ───────────────────────────────

const FAULT_CATEGORY_COLORS: Record<string, string> = {
  device_offline: "#94a3b8",
  device_fault: "#ef4444",
  battery_low: "#f59e0b",
  signal_weak: "#3b82f6",
  temperature_high: "#ef4444",
  threshold_breach: "#f59e0b",
  firmware_outdated: "#8b5cf6",
  connection_lost: "#94a3b8",
  voltage_drop: "#f59e0b",
  config_change: "#6366f1",
  system: "#6b7280",
};

function deriveFaultDistributionFromLive(
  deviceEntries: LiveDeviceEntry[],
  alerts: Record<string, LiveAlertEntry>,
): FaultDistributionItem[] {
  // Collect fault categories from devices in fault/warning status and open alerts
  const categoryCounts = new Map<string, number>();

  // Count from devices with fault/warning derived status
  const counts = computeStatusCounts(deviceEntries);
  if (counts.fault > 0) categoryCounts.set("device_fault", counts.fault);
  if (counts.warning > 0) categoryCounts.set("threshold_breach", counts.warning);

  // Count from alert categories
  for (const alert of Object.values(alerts)) {
    const cat = alert.category ?? "system";
    categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + 1);
  }

  if (categoryCounts.size === 0) {
    return [];
  }

  return Array.from(categoryCounts.entries())
    .map(([category, count]) => ({
      category,
      count,
      color: FAULT_CATEGORY_COLORS[category] ?? "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);
}

// ─── Live → TimeSeriesPoint (alert trends grouped by date) ────────────

function deriveAlertTrendsFromLive(
  alerts: Record<string, LiveAlertEntry>,
  days: number,
): TimeSeriesPoint[] {
  const alertList = Object.values(alerts);
  if (alertList.length === 0) {
    // Return blank series for the requested day range
    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      date: "",
      label: `Day ${i + 1}`,
      critical: 0,
      warning: 0,
      info: 0,
      online: 0,
      offline: 0,
      fault: 0,
    }));
  }

  // Group alerts by their occurrence date label
  const buckets = new Map<string, { critical: number; warning: number; info: number }>();

  for (const alert of alertList) {
    const d = new Date(alert.occurredAt);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!buckets.has(label)) {
      buckets.set(label, { critical: 0, warning: 0, info: 0 });
    }
    const bucket = buckets.get(label)!;
    if (alert.severity === "critical") bucket.critical++;
    else if (alert.severity === "warning") bucket.warning++;
    else bucket.info++;
  }

  // Sort by date and return as TimeSeriesPoint[]
  return Array.from(buckets.entries())
    .sort(([a], [b]) => {
      // Parse "Mon DD" → comparable date
      const da = new Date(`${a}, ${new Date().getFullYear()}`);
      const db = new Date(`${b}, ${new Date().getFullYear()}`);
      return da.getTime() - db.getTime();
    })
    .map(([label, counts]) => ({
      date: label,
      label,
      critical: counts.critical,
      warning: counts.warning,
      info: counts.info,
      online: 0,
      offline: 0,
      fault: 0,
    }));
}

// ─── Live → AvailabilityPoint ─────────────────────────────────────────

function deriveAvailabilityFromLive(
  deviceEntries: LiveDeviceEntry[],
  days: number,
): AvailabilityPoint[] {
  if (deviceEntries.length === 0) {
    return Array.from({ length: Math.min(days, 7) }, (_, i) => ({
      name: `Day ${i + 1}`,
      online: 0,
      offline: 0,
      fault: 0,
    }));
  }

  const counts = computeStatusCounts(deviceEntries);
  // Return a single data point for "current" since the live store only has current state
  return [
    { name: "Current", online: counts.online, offline: counts.offline, fault: counts.fault },
  ];
}

// ─── Hook ──────────────────────────────────────────────────────────────

export function useReportsData(filter: ReportFilter) {
  const days = dateRangeToDays(filter.dateRange);

  // API data via TanStack Query (used when simulator mode is OFF)
  const summaryQuery = useReportSummary({
    estateId: filter.estateId,
    siteId: filter.siteId,
    deviceId: filter.deviceId,
  });

  const trendsQuery = useReportTrends({
    days,
    estateId: filter.estateId,
    siteId: filter.siteId,
    deviceId: filter.deviceId,
  });

  // Live device/alert stores for realtime freshness
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const alerts = useLiveAlertStore((s) => s.alerts);
  const alertIds = useLiveAlertStore((s) => s.alertIds);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);

  // Simulator Mode OFF → ignore live store entirely, use API data only
  const deviceEntries = Object.values(devices);
  const hasLiveData = simulatorMode && deviceEntries.length > 0;
  const liveDataSource = hasLiveData ? deviceEntries : [];

  // ─── FleetSummary ──────────────────────────────────────────────────
  // Sim ON + live data → derive from store. Sim OFF → use API.

  const api = summaryQuery.summary;

  const fleetSummary: FleetSummary = useMemo(() => {
    if (hasLiveData) {
      return computeFleetSummary(liveDataSource);
    }
    if (!api) {
      return {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        faultDevices: 0,
        warningDevices: 0,
        avgBattery: 0,
        avgSignal: 0,
        healthScore: 0,
        onlinePct: 0,
      };
    }
    return {
      totalDevices: api.totalDevices,
      onlineDevices: api.onlineDevices,
      offlineDevices: api.offlineDevices,
      faultDevices: api.faultDevices,
      warningDevices: api.warningDevices,
      avgBattery: api.avgBattery,
      avgSignal: api.avgSignal,
      healthScore: api.healthScore,
      onlinePct: api.onlinePct,
    };
  }, [hasLiveData, liveDataSource, api]);

  // ─── Alert Trends ────────────────────────────────────────────────

  const alertTrends: TimeSeriesPoint[] = useMemo(() => {
    if (hasLiveData) {
      return deriveAlertTrendsFromLive(alerts, days);
    }
    return trendsQuery.trends?.alertTrends ?? [];
  }, [hasLiveData, alerts, days, trendsQuery.trends]);

  // ─── Device Availability ──────────────────────────────────────────

  const availability: AvailabilityPoint[] = useMemo(() => {
    if (hasLiveData) {
      return deriveAvailabilityFromLive(liveDataSource, days);
    }
    return trendsQuery.trends?.availability ?? [];
  }, [hasLiveData, liveDataSource, days, trendsQuery.trends]);

  // ─── Battery Distribution ────────────────────────────────────────

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (hasLiveData) {
      return computeBatteryDistribution(liveDataSource);
    }
    if (!api?.batteryDistribution) {
      return [
        { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
        { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
        { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
      ];
    }
    return api.batteryDistribution.map(apiDistToDistItem);
  }, [hasLiveData, liveDataSource, api]);

  // ─── Signal Distribution ─────────────────────────────────────────

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (hasLiveData) {
      return computeSignalDistribution(liveDataSource);
    }
    if (!api?.signalDistribution) {
      return [
        { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
        { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
        { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
        { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
      ];
    }
    return api.signalDistribution.map(apiDistToDistItem);
  }, [hasLiveData, liveDataSource, api]);

  // ─── Fault Distribution ──────────────────────────────────────────

  const faultDistribution: FaultDistributionItem[] = useMemo(() => {
    if (hasLiveData) {
      return deriveFaultDistributionFromLive(liveDataSource, alerts);
    }
    return api?.faultDistribution ?? [];
  }, [hasLiveData, liveDataSource, alerts, api]);

  // ─── Open alerts (live overlay) ──────────────────────────────────

  const openAlerts = useMemo(() => {
    return Object.values(alerts).filter((a) => a.status === "open").length;
  }, [alerts]);

  // ─── Events in scope (live overlay) ──────────────────────────────

  const eventsInScope = useMemo(() => {
    return Math.max(recentEvents.length, recentEvents.length * (days > 1 ? days : 1));
  }, [recentEvents.length, days]);

  // ─── Recent Exports (session-only tracking) ─────────────────────
  // Track exports during this browser session. List clears on page refresh.

  const [recentExports, setRecentExports] = useState<RecentExport[]>([]);

  const addExport = useCallback((name: string, filters: string, format: "CSV" | "PDF") => {
    const exportId = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setRecentExports((prev) => [
      {
        id: exportId,
        name,
        filters,
        dateRange: DATE_RANGE_LABELS[filter.dateRange],
        format,
        exportedAt: new Date().toISOString(),
      },
      ...prev,
    ]);
  }, [filter.dateRange]);

  // ─── CSV Export ──────────────────────────────────────────────────

  let exportCounter = 0;

  function generateCSV(): string {
    const headers = [
      "Metric",
      "Value",
      "Category",
      "Label",
      "Date Range",
      "Generated At",
    ];

    const rows: string[][] = [];

    rows.push(["Total Devices", String(fleetSummary.totalDevices), "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Online Devices", String(fleetSummary.onlineDevices), "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Offline Devices", String(fleetSummary.offlineDevices), "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Fault Devices", String(fleetSummary.faultDevices), "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Warning Devices", String(fleetSummary.warningDevices), "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Avg Battery", `${fleetSummary.avgBattery}%`, "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Avg Signal", `${fleetSummary.avgSignal} dBm`, "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Health Score", `${fleetSummary.healthScore}/100`, "Summary", "", filter.dateRange, new Date().toISOString()]);
    rows.push(["Online %", `${fleetSummary.onlinePct}%`, "Summary", "", filter.dateRange, new Date().toISOString()]);

    for (const item of batteryDistribution) {
      rows.push(["Battery Distribution", `${item.value}%`, "Battery", item.label, filter.dateRange, new Date().toISOString()]);
    }

    for (const item of signalDistribution) {
      rows.push(["Signal Distribution", `${item.value}%`, "Signal", item.label, filter.dateRange, new Date().toISOString()]);
    }

    for (const item of faultDistribution) {
      rows.push(["Fault Distribution", String(item.count), "Fault", item.category, filter.dateRange, new Date().toISOString()]);
    }

    const totalCritical = alertTrends.reduce((s, p) => s + p.critical, 0);
    const totalWarning = alertTrends.reduce((s, p) => s + p.warning, 0);
    const totalInfo = alertTrends.reduce((s, p) => s + p.info, 0);
    rows.push(["Alert Trends (Critical)", String(totalCritical), "Alerts", "Critical", filter.dateRange, new Date().toISOString()]);
    rows.push(["Alert Trends (Warning)", String(totalWarning), "Alerts", "Warning", filter.dateRange, new Date().toISOString()]);
    rows.push(["Alert Trends (Info)", String(totalInfo), "Alerts", "Info", filter.dateRange, new Date().toISOString()]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
    return csv;
  }

  function downloadCSV() {
    const csv = generateCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    exportCounter++;

    // Track in session export history
    const filterParts: string[] = [];
    if (filter.estateId) {
      const estate = estateOptions.find((e) => e.id === filter.estateId);
      if (estate) filterParts.push(estate.name);
    }
    if (filter.siteId) {
      const site = siteOptions.find((s) => s.id === filter.siteId);
      if (site) filterParts.push(site.name);
    }
    if (filter.deviceId) {
      const device = deviceOptions.find((d) => d.id === filter.deviceId);
      if (device) filterParts.push(device.name);
    }
    const filtersStr = filterParts.length > 0 ? filterParts.join(", ") : "All";
    addExport("Fleet Health Export", filtersStr, "CSV");
  }

  // ─── Estate/Site options for filter dropdowns ─────────────────────

  const estateOptions = useMemo(() => {
    const estateMap = new Map<string, string>();
    for (const d of deviceEntries) {
      if (d.estateId && d.estateName) {
        estateMap.set(d.estateId, d.estateName);
      }
    }
    if (estateMap.size === 0) {
      estateMap.set("a1b2c3d4-0001-4000-8000-000000000001", "Riverside Complex");
      estateMap.set("a1b2c3d4-0002-4000-8000-000000000002", "Tech Valley Park");
      estateMap.set("a1b2c3d4-0003-4000-8000-000000000003", "Harbour Terminal");
      estateMap.set("a1b2c3d4-0004-4000-8000-000000000004", "Greenfield Data Centre");
    }
    return Array.from(estateMap.entries()).map(([id, name]) => ({ id, name }));
  }, [deviceEntries]);

  const siteOptions = useMemo(() => {
    const siteMap = new Map<string, string>();
    const filterEstate = filter.estateId;
    for (const d of deviceEntries) {
      if (filterEstate && d.estateId !== filterEstate) continue;
      if (d.siteId && d.siteName) {
        siteMap.set(d.siteId, d.siteName);
      }
    }
    if (siteMap.size === 0 && !filterEstate) {
      siteMap.set("b2c3d4e5-0001-4000-8000-000000000001", "Building A - Riverside");
      siteMap.set("b2c3d4e5-0002-4000-8000-000000000002", "Building B - Riverside");
    }
    return Array.from(siteMap.entries()).map(([id, name]) => ({ id, name }));
  }, [deviceEntries, filter.estateId]);

  const deviceOptions = useMemo(() => {
    const deviceSet = new Set<string>();
    const filterEstate = filter.estateId;
    const filterSite = filter.siteId;
    for (const d of deviceEntries) {
      if (filterEstate && d.estateId !== filterEstate) continue;
      if (filterSite && d.siteId !== filterSite) continue;
      deviceSet.add(d.deviceId);
    }
    if (deviceSet.size === 0) {
      return [
        { id: "DEV-A1", name: "Access Controller A1" },
        { id: "DEV-B7", name: "Sensor B7" },
      ];
    }
    return Array.from(deviceSet).map((id) => {
      const entry = liveDataSource.find((d) => d.deviceId === id);
      return { id, name: entry?.deviceName ?? `Device ${id.slice(0, 8)}` };
    });
  }, [deviceEntries, filter.estateId, filter.siteId]);

  // ─── Combined loading/error state ────────────────────────────────
  // When live data is active, ignore API loading/errors — we use the store.
  // When simulator mode is ON but no devices yet, suppress API errors too
  // so the "Simulator not running" banner shows instead of an error state.

  const ignoreApi = hasLiveData || (simulatorMode && deviceEntries.length === 0);

  const isLoading = ignoreApi ? false : (summaryQuery.isLoading || trendsQuery.isLoading);
  const isError = ignoreApi ? false : (summaryQuery.isError && trendsQuery.isError);
  const error = summaryQuery.error ?? trendsQuery.error;

  return {
    fleetSummary,
    alertTrends,
    availability,
    batteryDistribution,
    signalDistribution,
    faultDistribution,
    hasLiveData,
    isSocketConnected,
    days,
    eventsInScope,
    openAlerts,
    recentExports,
    addExport,
    estateOptions,
    siteOptions,
    deviceOptions,
    downloadCSV,
    isLoading,
    isError,
    error,
    refetch: () => {
      summaryQuery.refetch();
      trendsQuery.refetch();
    },
  };
}
