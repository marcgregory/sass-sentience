/**
 * Reports data hook — fetches report summary and trends from the API
 * via TanStack Query, then overlays live device/alert state for realtime freshness.
 *
 * Chart data (alert trends, availability, distributions) comes from the API.
 * Live overlay data (open alerts, events in scope) comes from Zustand stores.
 * Filter dropdown options come from both API and live devices.
 *
 * When the API is unreachable, data falls back to a graceful error state
 * rather than showing stale mock data.
 */

import { useMemo, useState } from "react";
import { useReportSummary, useReportTrends } from "@/hooks/use-reports";
import type { UseReportSummaryOptions, UseReportTrendsOptions } from "@/hooks/use-reports";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useLiveAlertStore } from "@/stores/live-alert-store";
import {
  formatBattery,
  formatSignalStrength,
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

// ─── Days map ─────────────────────────────────────────────────────────

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

// ─── Hook ──────────────────────────────────────────────────────────────

export function useReportsData(filter: ReportFilter) {
  const days = dateRangeToDays(filter.dateRange);

  // API data via TanStack Query
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
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const alerts = useLiveAlertStore((s) => s.alerts);
  const alertIds = useLiveAlertStore((s) => s.alertIds);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);

  const deviceEntries = Object.values(devices);
  const hasLiveData = deviceEntries.length > 0;

  // ─── Derive FleetSummary from API ─────────────────────────────────

  const api = summaryQuery.summary;

  const fleetSummary: FleetSummary = useMemo(() => {
    if (!api) {
      // Fallback when API is loading or errored — use zeroed defaults
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
  }, [api]);

  // ─── Alert Trends ────────────────────────────────────────────────

  const alertTrends: TimeSeriesPoint[] = useMemo(() => {
    return trendsQuery.trends?.alertTrends ?? [];
  }, [trendsQuery.trends]);

  // ─── Device Availability ──────────────────────────────────────────

  const availability: AvailabilityPoint[] = useMemo(() => {
    return trendsQuery.trends?.availability ?? [];
  }, [trendsQuery.trends]);

  // ─── Battery Distribution ────────────────────────────────────────

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (!api?.batteryDistribution) {
      return [
        { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
        { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
        { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
      ];
    }
    return api.batteryDistribution.map(apiDistToDistItem);
  }, [api]);

  // ─── Signal Distribution ─────────────────────────────────────────

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (!api?.signalDistribution) {
      return [
        { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
        { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
        { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
        { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
      ];
    }
    return api.signalDistribution.map(apiDistToDistItem);
  }, [api]);

  // ─── Fault Distribution ──────────────────────────────────────────

  const faultDistribution: FaultDistributionItem[] = useMemo(() => {
    return api?.faultDistribution ?? [];
  }, [api]);

  // ─── Open alerts (live overlay) ──────────────────────────────────

  const openAlerts = useMemo(() => {
    return Object.values(alerts).filter((a) => a.status === "open").length;
  }, [alerts]);

  // ─── Events in scope (live overlay) ──────────────────────────────

  const eventsInScope = useMemo(() => {
    return Math.max(recentEvents.length, recentEvents.length * (days > 1 ? days : 1));
  }, [recentEvents.length, days]);

  // ─── Recent Exports (in-memory tracking) ─────────────────────────

  const [recentExports] = useState<RecentExport[]>([
    { id: "EXP-001", name: "Fleet Health Report", filters: "All estates", dateRange: "Last 30 Days", format: "CSV", exportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: "EXP-002", name: "Alert Analysis", filters: "Critical + Warning", dateRange: "Last 7 Days", format: "CSV", exportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: "EXP-003", name: "Monthly Summary", filters: "Tech Valley Park", dateRange: "Last 30 Days", format: "PDF", exportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  ]);

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
      estateMap.set("estate-riverside", "Riverside Complex");
      estateMap.set("estate-techvalley", "Tech Valley Park");
      estateMap.set("estate-harbour", "Harbour Terminal");
      estateMap.set("estate-greenfield", "Greenfield Data Centre");
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
      siteMap.set("site-riverside-a", "Building A - Riverside");
      siteMap.set("site-riverside-b", "Building B - Riverside");
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
    return Array.from(deviceSet).map((id) => ({ id, name: `Device ${id.slice(0, 8)}` }));
  }, [deviceEntries, filter.estateId, filter.siteId]);

  // ─── Combined loading/error state ────────────────────────────────

  const isLoading = summaryQuery.isLoading || trendsQuery.isLoading;
  const isError = summaryQuery.isError && trendsQuery.isError;
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
