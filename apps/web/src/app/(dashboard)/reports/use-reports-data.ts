/**
 * Reports data hook — merges live device/alert state with mock historical
 * data for the Reports dashboard.
 *
 * When live socket data is present, summary metrics reflect actual devices
 * via shared selectors. Chart data uses deterministic mock generation since
 * no historical API exists yet.
 */

import { useMemo } from "react";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useLiveAlertStore } from "@/stores/live-alert-store";
import {
  computeBatteryDistribution,
  computeSignalDistribution,
  computeFleetSummary,
  colorClassToHex,
  type FleetSummary,
  type DistributionItem,
} from "@sentience/utils";

// ─── Types ─────────────────────────────────────────────────────────────

export interface TimeSeriesPoint {
  date: string;
  label: string;
  critical: number;
  warning: number;
  info: number;
}

export interface AvailabilityPoint {
  name: string;
  online: number;
  offline: number;
  fault: number;
}

export interface FaultDistributionItem {
  category: string;
  count: number;
  color: string;
}

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

// ─── Mock Generators ───────────────────────────────────────────────────

function generateTimeSeries(days: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const now = Date.now();

  let baseCritical = 2;
  let baseWarning = 8;
  let baseInfo = 15;

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayOfWeek = d.getDay();
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1;

    baseCritical = Math.max(0, baseCritical + (Math.random() - 0.45) * 1.5);
    baseWarning = Math.max(1, baseWarning + (Math.random() - 0.48) * 3);
    baseInfo = Math.max(2, baseInfo + (Math.random() - 0.5) * 4);

    points.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      critical: Math.round(baseCritical * weekendFactor),
      warning: Math.round(baseWarning * weekendFactor),
      info: Math.round(baseInfo * weekendFactor),
    });
  }
  return points;
}

function generateAvailabilityTrend(days: number): AvailabilityPoint[] {
  const baseOnline = 625;
  const baseTotal = 712;
  const points: AvailabilityPoint[] = [];
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const drift = Math.round((Math.random() - 0.5) * 6);
    const online = Math.max(0, Math.min(baseTotal, baseOnline + drift));
    const fault = Math.max(0, Math.round((baseTotal - online) * (0.1 + Math.random() * 0.2)));
    const offline = Math.max(0, baseTotal - online - fault);
    points.push({
      name: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      online,
      offline,
      fault,
    });
  }
  return points;
}

function generateFaultDistribution(): FaultDistributionItem[] {
  return [
    { category: "Connection Lost", count: 42, color: "#ef4444" },
    { category: "Battery Failure", count: 28, color: "#f59e0b" },
    { category: "Signal Degradation", count: 35, color: "#f97316" },
    { category: "Temperature", count: 18, color: "#dc2626" },
    { category: "Hardware Fault", count: 12, color: "#8b5cf6" },
    { category: "Firmware Error", count: 9, color: "#6366f1" },
  ];
}

// ─── Mock Fleet Summary ────────────────────────────────────────────────

const MOCK_FLEET: FleetSummary = {
  totalDevices: 2847,
  onlineDevices: 2631,
  offlineDevices: 142,
  faultDevices: 37,
  warningDevices: 89,
  avgBattery: 74.3,
  avgSignal: -68.5,
  healthScore: 87.2,
  onlinePct: 92.4,
};

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

// ─── Export tracking ───────────────────────────────────────────────────

let exportCounter = 0;

// ─── Hook ──────────────────────────────────────────────────────────────

export function useReportsData(filter: ReportFilter) {
  const devices = useLiveDeviceStore((s) => s.devices);
  const recentEvents = useLiveDeviceStore((s) => s.recentEvents);
  const alerts = useLiveAlertStore((s) => s.alerts);
  const alertIds = useLiveAlertStore((s) => s.alertIds);
  const isSocketConnected = useLiveDeviceStore((s) => s.isSocketConnected);

  const deviceEntries = Object.values(devices);
  const hasLiveData = deviceEntries.length > 0;

  // ─── Filtered device entries ────────────────────────────────────────

  const filteredDevices = useMemo(() => {
    let entries = hasLiveData ? deviceEntries : [];

    if (filter.estateId) {
      entries = entries.filter((d) => d.estateId === filter.estateId);
    }
    if (filter.siteId) {
      entries = entries.filter((d) => d.siteId === filter.siteId);
    }
    if (filter.deviceId) {
      entries = entries.filter((d) => d.deviceId === filter.deviceId);
    }

    return entries;
  }, [deviceEntries, hasLiveData, filter.estateId, filter.siteId, filter.deviceId]);

  // ─── Days for date range ────────────────────────────────────────────

  const days = useMemo(() => {
    switch (filter.dateRange) {
      case "today": return 1;
      case "7d": return 7;
      case "30d": return 30;
      case "90d": return 90;
      default: return 30;
    }
  }, [filter.dateRange]);

  // ─── Fleet Summary (via shared selector) ────────────────────────────

  const fleetSummary: FleetSummary = useMemo(() => {
    if (!hasLiveData) return MOCK_FLEET;
    const summary = computeFleetSummary(filteredDevices);
    // If no devices match filters, return mock with zeroed counts
    if (filteredDevices.length === 0) {
      return { ...MOCK_FLEET, totalDevices: 0, onlineDevices: 0, offlineDevices: 0, faultDevices: 0, warningDevices: 0, onlinePct: 0, avgBattery: 0, avgSignal: 0, healthScore: 0 };
    }
    return summary;
  }, [filteredDevices, hasLiveData]);

  // ─── Alert Trends (time series) ─────────────────────────────────────

  const alertTrends: TimeSeriesPoint[] = useMemo(() => {
    return generateTimeSeries(days);
  }, [days]);

  // ─── Device Availability ────────────────────────────────────────────

  const availability: AvailabilityPoint[] = useMemo(() => {
    return generateAvailabilityTrend(days);
  }, [days]);

  // ─── Battery Distribution (via shared selector) ─────────────────────

  const batteryDistribution: DistributionItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_BATTERY;
    const result = computeBatteryDistribution(filteredDevices);
    return result.every((d) => d.count === 0) ? [
      { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
    ] : result;
  }, [filteredDevices, hasLiveData]);

  // ─── Signal Distribution (via shared selector) ─────────────────────

  const signalDistribution: DistributionItem[] = useMemo(() => {
    if (!hasLiveData) return MOCK_SIGNAL;
    const result = computeSignalDistribution(filteredDevices);
    return result.every((d) => d.count === 0) ? [
      { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
      { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
    ] : result;
  }, [filteredDevices, hasLiveData]);

  // ─── Fault Distribution ─────────────────────────────────────────────

  const faultDistribution: FaultDistributionItem[] = useMemo(() => {
    return generateFaultDistribution();
  }, []);

  // ─── Recent events count for the report scope ───────────────────────

  const eventsInScope = useMemo(() => {
    return Math.max(12, recentEvents.length * (days > 1 ? days : 1));
  }, [recentEvents.length, days]);

  // ─── Open alerts count ───────────────────────────────────────────────

  const openAlerts = useMemo(() => {
    return Object.values(alerts).filter((a) => a.status === "open").length;
  }, [alerts]);

  // ─── Recent Exports (tracked in-memory) ─────────────────────────────

  const recentExports: RecentExport[] = [
    { id: "EXP-001", name: "Fleet Health Report", filters: "All estates", dateRange: "Last 30 Days", format: "CSV", exportedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() },
    { id: "EXP-002", name: "Alert Analysis", filters: "Critical + Warning", dateRange: "Last 7 Days", format: "CSV", exportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() },
    { id: "EXP-003", name: "Monthly Summary", filters: "Tech Valley Park", dateRange: "Last 30 Days", format: "PDF", exportedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
  ];

  // ─── CSV Export ─────────────────────────────────────────────────────

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

  // ─── Estate/Site options for filter dropdowns ───────────────────────

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
  };
}
