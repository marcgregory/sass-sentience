/**
 * Normalizer — converts MQTT flat JSON payloads into typed Socket.IO events.
 *
 * The simulator publishes flat payloads that include all fields on every
 * topic. This normalizer extracts the relevant fields per event type and
 * constructs the typed event objects that match the frontend's
 * `ServerToClientEvents` interface (defined in socket-client.ts).
 *
 * Topics parsed:
 *   sentience/devices/{deviceId}/telemetry  →  device:telemetry
 *   sentience/devices/{deviceId}/status      →  device:status
 *   sentience/devices/{deviceId}/events      →  event:new
 */

import crypto from "node:crypto";
import type { DeviceStatusValue } from "./socket-server";

// ─── Incoming MQTT Payload (flat, from simulator) ──────────────────

export interface MqttPayload {
  deviceId: string;
  deviceName?: string;
  name?: string;
  deviceType?: string;
  status?: string;
  battery?: number | null;
  uptime?: number;
  signal?: number;
  temperature?: number;
  fault?: boolean;
  warning?: boolean;
  inputState?: boolean;
  outputState?: boolean;
  timestamp?: string;

  // Status topic additions
  previousStatus?: string;

  // Events topic additions
  eventType?: string;
  threshold?: number;

  // Estate / site context
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;

  // Simulator session tracking — used to discard stale messages during restarts
  sessionId?: string;

  // Real-device fields (optional — older simulators don't set these)
  voltage?: number;

  // Serial number
  serial?: string;
}

// ─── Normalized Socket.IO Event Payloads ───────────────────────────

export interface DeviceTelemetryEvent {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  battery: number | null;
  uptime: number | null;
  voltage: number;
  temperature: number;
  signalStrength: number;
  timestamp: string;
}

export interface DeviceStatusEvent {
  deviceId: string;
  deviceName?: string;
  deviceType?: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  status: DeviceStatusValue;
  previousStatus: DeviceStatusValue;
  timestamp: string;
}

export interface EventStreamEvent {
  eventId: string;
  deviceId?: string;
  deviceName?: string;
  serial?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  category: string;
  severity: string;
  title: string;
  timestamp: string;
}

/**
 * Alert event emitted as alert:created / alert:updated
 * (mirrors socket-client.ts AlertEvent but without the import dependency)
 */
export interface AlertEvent {
  alertId: string;
  title: string;
  description?: string;
  severity: "critical" | "warning" | "info";
  status: "open" | "acknowledged" | "resolved";
  category?: string;
  deviceId?: string;
  deviceName?: string;
  serial?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  timestamp: string;
  /** Simulated events originate from the MQTT simulator and should not be persisted. */
  isSimulated?: boolean;
}

// ─── Normalization ─────────────────────────────────────────────────

function validStatus(s: string | undefined): DeviceStatusValue {
  if (s === "online" || s === "offline" || s === "fault" || s === "warning") return s;
  return "online";
}

function resolveName(payload: MqttPayload): string | undefined {
  return payload.deviceName ?? payload.name ?? undefined;
}

function safeNumber(v: number | null | undefined, fallback: number): number {
  return v !== undefined && v !== null && !Number.isNaN(v) ? v : fallback;
}

/**
 * Normalize an MQTT telemetry payload into a Socket.IO `device:telemetry` event.
 */
export function toTelemetryEvent(
  deviceId: string,
  payload: MqttPayload,
): DeviceTelemetryEvent {
  const event: DeviceTelemetryEvent = {
    deviceId,
    siteId: payload.siteId ?? "unknown",
    battery: payload.battery === null ? null : Math.round(safeNumber(payload.battery, 100)),
    uptime: payload.uptime == null ? null : Math.round(safeNumber(payload.uptime, 0)),
    voltage: safeNumber(payload.voltage, 3.3),
    temperature: safeNumber(payload.temperature, 25),
    signalStrength: Math.round(safeNumber(payload.signal, -70)),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };

  const deviceName = resolveName(payload);
  if (deviceName) event.deviceName = deviceName;
  if (payload.deviceType) event.deviceType = payload.deviceType;
  if (payload.siteName) event.siteName = payload.siteName;
  if (payload.estateId) event.estateId = payload.estateId;
  if (payload.estateName) event.estateName = payload.estateName;

  return event;
}

/**
 * Normalize an MQTT status payload into a Socket.IO `device:status` event.
 */
export function toStatusEvent(
  deviceId: string,
  payload: MqttPayload,
  previousStatus?: DeviceStatusValue,
): DeviceStatusEvent {
  return {
    deviceId,
    deviceName: resolveName(payload),
    deviceType: payload.deviceType,
    siteId: payload.siteId ?? "unknown",
    siteName: payload.siteName ?? undefined,
    estateId: payload.estateId ?? undefined,
    estateName: payload.estateName ?? undefined,
    status: validStatus(payload.status),
    previousStatus: previousStatus ?? validStatus(payload.previousStatus ?? payload.status),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Normalize an MQTT event payload into a Socket.IO `event:new` event.
 */
export function toEventStreamEvent(
  deviceId: string,
  payload: MqttPayload,
): EventStreamEvent {
  const eventType = payload.eventType ?? "unknown";
  const severity = severityForEventType(eventType, payload);

  return {
    eventId: `${deviceId}-${eventType}-${Date.now()}`,
    deviceId,
    deviceName: resolveName(payload),
    serial: payload.serial,
    siteId: payload.siteId ?? "unknown",
    siteName: payload.siteName ?? undefined,
    estateId: payload.estateId ?? undefined,
    estateName: payload.estateName ?? undefined,
    category: mapEventTypeToCategory(eventType),
    severity,
    title: formatEventTitle(eventType, payload),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

/**
 * Normalize an MQTT payload into a device:diagnostic event.
 * Triggered when an events topic message indicates a diagnostic condition.
 */
export function toDiagnosticEvent(
  deviceId: string,
  payload: MqttPayload,
): {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  diagnostic: { type: string; status: "passed" | "failed" | "warning"; message: string };
  timestamp: string;
} {
  return {
    deviceId,
    siteId: payload.siteId ?? "unknown",
    siteName: payload.siteName ?? undefined,
    estateId: payload.estateId ?? undefined,
    estateName: payload.estateName ?? undefined,
    diagnostic: {
      type: payload.eventType ?? "system",
      status: payload.fault ? "failed" : payload.warning ? "warning" : "passed",
      message: formatEventTitle(payload.eventType ?? "event", payload),
    },
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
}

// ─── Alert Normalization ───────────────────────────────────────────

const ALERT_EVENT_TYPES = new Set([
  "battery_low",
  "signal_weak",
  "temperature_high",
  "device_offline",
  "device_fault",
]);

/**
 * Derive severity from event type, not device status.
 *
 * Rules:
 *   device_fault     → critical
 *   device_offline   → critical
 *   battery_low (<10%) → critical
 *   temperature_high (>50°C) → critical
 *   signal_weak      → warning
 *   battery_low (≥10%) → warning
 *   temperature_high (≤50°C) → warning
 */
function severityForEventType(eventType: string, payload: MqttPayload): "critical" | "warning" | "info" {
  if (eventType === "device_fault") return "critical";
  if (eventType === "device_offline") return "critical";
  if (eventType === "battery_low" && (payload.battery ?? 100) < 10) return "critical";
  if (eventType === "temperature_high" && (payload.temperature ?? 0) > 50) return "critical";

  // Remaining alert-worthy events → warning
  if (ALERT_EVENT_TYPES.has(eventType)) return "warning";

  // Non-alert events → info
  return "info";
}

/**
 * Normalize an MQTT event payload into an `alert:created` event.
 * Returns null if the event type is not an alert-worthy condition.
 */
export function toAlertEvent(
  deviceId: string,
  payload: MqttPayload,
): AlertEvent | null {
  const eventType = payload.eventType;
  if (!eventType || !ALERT_EVENT_TYPES.has(eventType)) return null;

  const severity = severityForEventType(eventType, payload);
  const deviceName = resolveName(payload) ?? deviceId.slice(0, 8);

  const titles: Record<string, string> = {
    battery_low: `Battery Low — ${deviceName} (${safeNumber(payload.battery, 0)}%)`,
    signal_weak: `Signal Weak — ${deviceName} (${safeNumber(payload.signal, 0)} dBm)`,
    temperature_high: `Temperature High — ${deviceName} (${safeNumber(payload.temperature, 0)}°C)`,
    device_offline: `Device Offline — ${deviceName}`,
    device_fault: `Device Fault — ${deviceName}`,
  };

  const descriptions: Record<string, string> = {
    battery_low: `Battery level dropped below threshold (${safeNumber(payload.battery, 0)}%). ${deviceName} requires maintenance or replacement.`,
    signal_weak: `Signal strength degraded to ${safeNumber(payload.signal, 0)} dBm. ${deviceName} may have a range issue or obstruction.`,
    temperature_high: `Temperature reading of ${safeNumber(payload.temperature, 0)}°C exceeds safe operating range for ${deviceName}.`,
    device_offline: `${deviceName} has stopped communicating. Last known state: ${payload.status ?? "unknown"}.`,
    device_fault: `${deviceName} reported a fault condition. Manual inspection may be required.`,
  };

  return {
    alertId: crypto.randomUUID(),
    title: titles[eventType] ?? `${deviceName}: ${eventType}`,
    description: descriptions[eventType] ?? `Event: ${eventType} for ${deviceName}.`,
    severity,
    status: "open",
    category: eventType,
    deviceId,
    deviceName: resolveName(payload),
    serial: payload.serial,
    siteId: payload.siteId ?? "unknown",
    siteName: payload.siteName ?? undefined,
    estateId: payload.estateId ?? undefined,
    estateName: payload.estateName ?? undefined,
    timestamp: payload.timestamp ?? new Date().toISOString(),
    // If the MQTT payload carries a sessionId, this is a simulated event —
    // the bridge listener will skip DB persistence and only broadcast via WebSocket.
    isSimulated: !!payload.sessionId,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────

function mapEventTypeToCategory(eventType: string): string {
  const map: Record<string, string> = {
    battery_low: "threshold_breach",
    signal_weak: "threshold_breach",
    temperature_high: "threshold_breach",
    device_offline: "device_offline",
    device_online: "device_online",
    device_fault: "device_fault",
    shutdown: "device_offline",
  };
  return map[eventType] ?? eventType;
}

function formatEventTitle(eventType: string, payload: MqttPayload): string {
  const deviceName = resolveName(payload) ?? payload.deviceId.slice(0, 8);
  switch (eventType) {
    case "battery_low":
      return `${deviceName} battery low (${safeNumber(payload.battery, 0)}%)`;
    case "signal_weak":
      return `${deviceName} signal weak (${safeNumber(payload.signal, 0)} dBm)`;
    case "temperature_high":
      return `${deviceName} temperature high (${safeNumber(payload.temperature, 0)}°C)`;
    default:
      return `${deviceName}: ${eventType}`;
  }
}
