/**
 * Shared selectors for computing derived metrics from live device data.
 *
 * These pure functions are the single source of truth for all status
 * counts, distributions, and derived scores. Every page (Dashboard,
 * Reports, etc.) must use these instead of duplicating the logic.
 *
 * @see ADR-0002 — Zustand for Client State
 */

import type { DeviceStatus, StatusReason } from "@sentience/types";

// ─── Constants ────────────────────────────────────────────────────────────


// ─── Types ──────────────────────────────────────────────────────────────

/** Device types that are externally powered and may legitimately lack a battery reading. */
const EXTERNALLY_POWERED_TYPES = new Set(["controller", "gateway", "relay"]);

/**
 * Time (ms) without a heartbeat before a device is considered offline.
 * 3× the default 30s publish interval + 30s grace.
 */
const HEARTBEAT_TIMEOUT_MS = 120_000;

export interface DeviceHealth {
  status: DeviceStatus;
  reasons: StatusReason[];
}

export interface DeviceEntry {
  deviceId: string;
  /** Optional device type hint. When provided, externally-powered types
   *  (controller, gateway, relay) are not penalised for missing battery data. */
  deviceType?: string;
  status: DeviceStatus;
  telemetry: {
    battery: number;
    voltage: number;
    temperature: number;
    signalStrength: number;
    timestamp: string;
  } | null;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  lastSeen: string;
}

export interface StatusCounts {
  total: number;
  online: number;
  offline: number;
  fault: number;
  warning: number;
}

export interface DistributionItem {
  label: string;
  value: number;
  count: number;
  color: string;
}

export interface FleetSummary {
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  faultDevices: number;
  warningDevices: number;
  avgBattery: number;
  avgSignal: number;
  healthScore: number;
  onlinePct: number;
}

export interface EstateSummary {
  id: string;
  name: string;
  total: number;
  online: number;
  offline: number;
  fault: number;
  warning: number;
}

// ─── Status Derivation ──────────────────────────────────────────────────

/**
 * Derive the *effective display status* and *reasons* of a device based on
 * telemetry health, not just the raw stored status.
 *
 * The function collects ALL applicable status reasons first, then derives the
 * final status from the **most severe** reason present. This means status is
 * determined by severity priority rather than check order:
 *
 *   Offline > Fault > Warning > Online
 *
 * This prevents inconsistent results if someone later reorders the checks.
 *
 * Rules:
 * 1. Raw status "offline" OR lastSeen > heartbeat timeout → "offline" with
 *    HEARTBEAT_TIMEOUT reason.
 * 2. Battery ≤ 10%          → adds BATTERY_CRITICAL.
 * 3. Battery null/N/A on a battery-powered device → adds BATTERY_MISSING.
 * 4. Battery null/N/A on an externally-powered device → ignored (controller/
 *    gateway/relay may not have a battery).
 * 5. Battery 11–20%         → adds LOW_BATTERY.
 * 6. Signal ≤ -110 dBm      → adds WEAK_SIGNAL.
 * 7. Temperature ≥ 45°C     → adds OVERHEAT.
 * 8. Otherwise              → "online" with empty reasons.
 *
 * This is the one shared status selector. Every page (Dashboard, Devices,
 * Device detail, Reports) must use this to keep counts and badges in sync.
 *
 * @returns {DeviceHealth} object with resolved status and list of reasons.
 *
 * @see ADR-0002 — Zustand for Client State
 */
export function deriveDeviceHealth(entry: DeviceEntry): DeviceHealth {
  const { telemetry, status, deviceType, lastSeen } = entry;
  const reasons: StatusReason[] = [];

  // ── Offline check (highest severity — immediate return) ────────────────
  // If the raw database status is "offline" or heartbeat has expired, the
  // device is definitively offline regardless of telemetry values.
  if (status === "offline") {
    return { status: "offline", reasons: ["HEARTBEAT_TIMEOUT"] };
  }

  if (lastSeen) {
    const elapsed = Date.now() - new Date(lastSeen).getTime();
    if (elapsed > HEARTBEAT_TIMEOUT_MS) {
      return { status: "offline", reasons: ["HEARTBEAT_TIMEOUT"] };
    }
  }

  // ── Without telemetry we can't derive further ─────────────────────────
  if (!telemetry) return { status, reasons: [] };

  // ── Collect ALL telemetry-based reasons ────────────────────────────────
  const battery = telemetry.battery;
  const isExternallyPowered =
    deviceType && EXTERNALLY_POWERED_TYPES.has(deviceType);

  // Battery null/N/A — only a concern for battery-powered devices
  if (battery == null || Number.isNaN(battery)) {
    if (!isExternallyPowered) {
      reasons.push("BATTERY_MISSING");
    }
    // Externally-powered — not a concern, fall through to other checks
  } else if (battery <= 10) {
    reasons.push("BATTERY_CRITICAL");
  } else if (battery <= 20) {
    reasons.push("LOW_BATTERY");
  }

  if (telemetry.signalStrength <= -110) {
    reasons.push("WEAK_SIGNAL");
  }

  if (telemetry.temperature >= 45) {
    reasons.push("OVERHEAT");
  }

  // ── Derive status from the most severe reason ─────────────────────────
  // Severity hierarchy (highest first): fault > warning
  // (Offline already handled above, so only fault/warning remain.)
  if (reasons.length === 0) return { status, reasons: [] };

  const hasFault = reasons.some(
    (r) => r === "BATTERY_CRITICAL" || r === "HARDWARE_DIAGNOSTIC_FAILED",
  );
  if (hasFault) return { status: "fault", reasons };

  return { status: "warning", reasons };
}

/**
 * Legacy wrapper that returns only the status string.
 * Prefer `deriveDeviceHealth()` in new code so the UI can surface reasons.
 */
export function deriveDeviceStatus(entry: DeviceEntry): DeviceStatus {
  return deriveDeviceHealth(entry).status;
}

// ─── Status Counts ──────────────────────────────────────────────────────

/**
 * Compute device status counts (online/offline/fault/warning) from an
 * array of device entries. Uses `deriveDeviceStatus` so battery health
 * and heartbeat freshness influence the effective status.
 * Returns zero-filled counts if the input is empty.
 */
export function computeStatusCounts(entries: DeviceEntry[]): StatusCounts {
  let online = 0;
  let offline = 0;
  let fault = 0;
  let warning = 0;

  for (let i = 0; i < entries.length; i++) {
    const s = deriveDeviceStatus(entries[i]);
    if (s === "online") online++;
    else if (s === "offline") offline++;
    else if (s === "fault") fault++;
    else if (s === "warning") warning++;
  }

  return {
    total: entries.length,
    online,
    offline,
    fault,
    warning,
  };
}

// ─── Battery Distribution ───────────────────────────────────────────────
//
// Good: >60%, Fair: 20-60%, Low: <20%

export function computeBatteryDistribution(
  entries: DeviceEntry[],
): DistributionItem[] {
  const withTelemetry = entries.filter((d) => d.telemetry);
  if (withTelemetry.length === 0) {
    return [
      { label: "Good (>60%)", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Fair (20–60%)", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Low (<20%)", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const good = withTelemetry.filter((d) => d.telemetry!.battery > 60).length;
  const fair = withTelemetry.filter(
    (d) => d.telemetry!.battery >= 20 && d.telemetry!.battery <= 60,
  ).length;
  const low = withTelemetry.filter((d) => d.telemetry!.battery < 20).length;
  const total = withTelemetry.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Good (>60%)", value: pct(good), count: good, color: "bg-emerald-500" },
    { label: "Fair (20–60%)", value: pct(fair), count: fair, color: "bg-amber-500" },
    { label: "Low (<20%)", value: pct(low), count: low, color: "bg-red-500" },
  ];
}

// ─── Signal Distribution ────────────────────────────────────────────────
//
// Excellent: <-50 dBm, Good: -50 to -70 dBm, Fair: -70 to -90 dBm, Poor: >=-90 dBm

export function computeSignalDistribution(
  entries: DeviceEntry[],
): DistributionItem[] {
  const withTelemetry = entries.filter((d) => d.telemetry);
  if (withTelemetry.length === 0) {
    return [
      { label: "Excellent", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "Good", value: 0, count: 0, color: "bg-blue-500" },
      { label: "Fair", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Poor", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const excellent = withTelemetry.filter(
    (d) => d.telemetry!.signalStrength < -50,
  ).length;
  const good = withTelemetry.filter(
    (d) =>
      d.telemetry!.signalStrength >= -50 &&
      d.telemetry!.signalStrength < -70,
  ).length;
  const fair = withTelemetry.filter(
    (d) =>
      d.telemetry!.signalStrength >= -70 &&
      d.telemetry!.signalStrength < -90,
  ).length;
  const poor = withTelemetry.filter(
    (d) => d.telemetry!.signalStrength >= -90,
  ).length;
  const total = withTelemetry.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Excellent", value: pct(excellent), count: excellent, color: "bg-emerald-500" },
    { label: "Good", value: pct(good), count: good, color: "bg-blue-500" },
    { label: "Fair", value: pct(fair), count: fair, color: "bg-amber-500" },
    { label: "Poor", value: pct(poor), count: poor, color: "bg-red-500" },
  ];
}

// ─── Temperature Distribution ───────────────────────────────────────────
//
// Normal: 0-35°C, High: 35-50°C, Critical: >50°C or <0°C

export function computeTemperatureDistribution(
  entries: DeviceEntry[],
): DistributionItem[] {
  const withTelemetry = entries.filter((d) => d.telemetry);
  if (withTelemetry.length === 0) {
    return [
      { label: "Normal", value: 0, count: 0, color: "bg-emerald-500" },
      { label: "High", value: 0, count: 0, color: "bg-amber-500" },
      { label: "Critical", value: 0, count: 0, color: "bg-red-500" },
    ];
  }

  const normal = withTelemetry.filter(
    (d) =>
      d.telemetry!.temperature >= 0 && d.telemetry!.temperature <= 35,
  ).length;
  const high = withTelemetry.filter(
    (d) =>
      d.telemetry!.temperature > 35 && d.telemetry!.temperature <= 50,
  ).length;
  const critical = withTelemetry.filter(
    (d) => d.telemetry!.temperature > 50 || d.telemetry!.temperature < 0,
  ).length;
  const total = withTelemetry.length;
  const pct = (n: number) => Math.round((n / total) * 100);

  return [
    { label: "Normal", value: pct(normal), count: normal, color: "bg-emerald-500" },
    { label: "High", value: pct(high), count: high, color: "bg-amber-500" },
    { label: "Critical", value: pct(critical), count: critical, color: "bg-red-500" },
  ];
}

// ─── Fleet Health Score ─────────────────────────────────────────────────
//
// Composite: online% × 40 + battery-health% × 30 + signal-health% × 30
// Result is a score from 0 to 100 with one decimal place.

export function computeFleetHealthScore(entries: DeviceEntry[]): number {
  if (entries.length === 0) return 0;

  const counts = computeStatusCounts(entries);
  const onlineRatio = counts.online / counts.total;

  const withTelemetry = entries.filter((d) => d.telemetry);
  const withGoodBattery =
    withTelemetry.length > 0
      ? withTelemetry.filter((d) => d.telemetry!.battery > 60).length /
        withTelemetry.length
      : 0;
  const withGoodSignal =
    withTelemetry.length > 0
      ? withTelemetry.filter((d) => d.telemetry!.signalStrength < -70)
          .length / withTelemetry.length
      : 0;

  return Math.round((onlineRatio * 40 + withGoodBattery * 30 + withGoodSignal * 30) * 10) / 10;
}

// ─── System Health (status distribution percentages) ────────────────────

export function computeSystemHealth(
  entries: DeviceEntry[],
): { label: string; value: number; color: string }[] {
  if (entries.length === 0) {
    return [
      { label: "Online", value: 0, color: "bg-emerald-500" },
      { label: "Offline", value: 0, color: "bg-slate-400" },
      { label: "Fault", value: 0, color: "bg-red-500" },
      { label: "Warning", value: 0, color: "bg-amber-500" },
    ];
  }

  const counts = computeStatusCounts(entries);
  const pct = (n: number) => Math.round((n / counts.total) * 1000) / 10;

  return [
    { label: "Online", value: pct(counts.online), color: "bg-emerald-500" },
    { label: "Offline", value: pct(counts.offline), color: "bg-slate-400" },
    { label: "Fault", value: pct(counts.fault), color: "bg-red-500" },
    { label: "Warning", value: pct(counts.warning), color: "bg-amber-500" },
  ];
}

// ─── Fleet Summary ──────────────────────────────────────────────────────

export function computeFleetSummary(entries: DeviceEntry[]): FleetSummary {
  if (entries.length === 0) {
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

  const counts = computeStatusCounts(entries);

  const withTelemetry = entries.filter((d) => d.telemetry);
  const avgBattery =
    withTelemetry.length > 0
      ? Math.round(
          withTelemetry.reduce((s, d) => s + d.telemetry!.battery, 0) /
            withTelemetry.length *
            10,
        ) / 10
      : 0;
  const avgSignal =
    withTelemetry.length > 0
      ? Math.round(
          withTelemetry.reduce((s, d) => s + d.telemetry!.signalStrength, 0) /
            withTelemetry.length *
            10,
        ) / 10
      : 0;
  const healthScore = computeFleetHealthScore(entries);
  const onlinePct = Math.round((counts.online / counts.total) * 1000) / 10;

  return {
    totalDevices: counts.total,
    onlineDevices: counts.online,
    offlineDevices: counts.offline,
    faultDevices: counts.fault,
    warningDevices: counts.warning,
    avgBattery,
    avgSignal,
    healthScore,
    onlinePct,
  };
}

// ─── Estate Summary ─────────────────────────────────────────────────────

export function computeEstateSummary(
  entries: DeviceEntry[],
): EstateSummary[] {
  const estateMap = new Map<string, EstateSummary>();

  for (let i = 0; i < entries.length; i++) {
    const device = entries[i];
    const estateId = device.estateId ?? "unknown";
    const estateName = device.estateName ?? "Unassigned";

    let summary = estateMap.get(estateId);
    if (!summary) {
      summary = {
        id: estateId,
        name: estateName,
        total: 0,
        online: 0,
        offline: 0,
        fault: 0,
        warning: 0,
      };
      estateMap.set(estateId, summary);
    }

    const effective = deriveDeviceStatus(device);
    summary.total++;
    if (effective === "online") summary.online++;
    else if (effective === "offline") summary.offline++;
    else if (effective === "fault") summary.fault++;
    else if (effective === "warning") summary.warning++;
  }

  return Array.from(estateMap.values());
}

// ─── Color Mapping ──────────────────────────────────────────────────────

/**
 * Map a Tailwind bg-* color class to a hex string for recharts rendering.
 */
export function colorClassToHex(tailwindClass: string): string {
  const map: Record<string, string> = {
    "bg-emerald-500": "#10b981",
    "bg-blue-500": "#3b82f6",
    "bg-amber-500": "#f59e0b",
    "bg-red-500": "#ef4444",
    "bg-slate-400": "#94a3b8",
    "bg-purple-500": "#8b5cf6",
    "bg-indigo-500": "#6366f1",
    "bg-orange-500": "#f97316",
  };
  return map[tailwindClass] ?? "#6366f1";
}

// ─── Status Reason Labels ───────────────────────────────────────────────

/** Human-readable labels for each StatusReason. */
const STATUS_REASON_LABELS: Record<StatusReason, string> = {
  HEARTBEAT_TIMEOUT: "Heartbeat Timeout",
  BATTERY_CRITICAL: "Battery Critical",
  LOW_BATTERY: "Low Battery",
  BATTERY_MISSING: "Battery Data Missing",
  WEAK_SIGNAL: "Weak Signal",
  OVERHEAT: "Overheating",
  HARDWARE_DIAGNOSTIC_FAILED: "Hardware Diagnostic Failed",
};

/**
 * Format a list of StatusReason values into a human-readable string, e.g.
 * "Low battery, Weak signal" — suitable for a tooltip or aria-label.
 */
export function formatStatusReasons(reasons: StatusReason[], separator = ", "): string {
  if (reasons.length === 0) return "";
  return reasons.map((r) => STATUS_REASON_LABELS[r] ?? r).join(separator);
}

/**
 * Format a status+reasons pair into a compact one-line label, e.g.
 * "Warning — Low battery" or "Fault — Battery critical".
 */
export function formatStatusLabel(
  status: DeviceStatus,
  reasons: StatusReason[],
): string {
  const base = status.charAt(0).toUpperCase() + status.slice(1);
  if (reasons.length === 0) return base;
  return `${base} — ${formatStatusReasons(reasons)}`;
}
