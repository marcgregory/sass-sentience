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

import type { DeviceStatusValue } from "./socket-server";

// ─── Incoming MQTT Payload (flat, from simulator) ──────────────────

export interface MqttPayload {
  deviceId: string;
  status?: string;
  battery?: number;
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

  // Real-device fields (optional — simulator doesn't set these)
  siteId?: string;
  estateId?: string;
  voltage?: number;
}

// ─── Normalized Socket.IO Event Payloads ───────────────────────────

export interface DeviceTelemetryEvent {
  deviceId: string;
  siteId: string;
  battery: number;
  voltage: number;
  temperature: number;
  signalStrength: number;
  timestamp: string;
}

export interface DeviceStatusEvent {
  deviceId: string;
  siteId: string;
  status: DeviceStatusValue;
  previousStatus: DeviceStatusValue;
  timestamp: string;
}

export interface EventStreamEvent {
  eventId: string;
  deviceId?: string;
  siteId?: string;
  estateId?: string;
  category: string;
  severity: string;
  title: string;
  timestamp: string;
}

// ─── Normalization ─────────────────────────────────────────────────

function validStatus(s: string | undefined): DeviceStatusValue {
  if (s === "online" || s === "offline" || s === "fault" || s === "warning") return s;
  return "online";
}

function safeNumber(v: number | undefined, fallback: number): number {
  return v !== undefined && !Number.isNaN(v) ? v : fallback;
}

/**
 * Normalize an MQTT telemetry payload into a Socket.IO `device:telemetry` event.
 */
export function toTelemetryEvent(
  deviceId: string,
  payload: MqttPayload,
): DeviceTelemetryEvent {
  return {
    deviceId,
    siteId: payload.siteId ?? "unknown",
    battery: Math.round(safeNumber(payload.battery, 100)),
    voltage: safeNumber(payload.voltage, 3.3),
    temperature: safeNumber(payload.temperature, 25),
    signalStrength: Math.round(safeNumber(payload.signal, -70)),
    timestamp: payload.timestamp ?? new Date().toISOString(),
  };
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
    siteId: payload.siteId ?? "unknown",
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
  const status = validStatus(payload.status);

  return {
    eventId: `${deviceId}-${eventType}-${Date.now()}`,
    deviceId,
    siteId: payload.siteId ?? "unknown",
    estateId: payload.estateId ?? undefined,
    category: mapEventTypeToCategory(eventType),
    severity: status === "fault" ? "critical" : status === "warning" ? "warning" : "info",
    title: formatEventTitle(eventType, deviceId, payload),
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
  diagnostic: { type: string; status: "passed" | "failed" | "warning"; message: string };
  timestamp: string;
} {
  return {
    deviceId,
    siteId: payload.siteId ?? "unknown",
    diagnostic: {
      type: payload.eventType ?? "system",
      status: payload.fault ? "failed" : payload.warning ? "warning" : "passed",
      message: formatEventTitle(payload.eventType ?? "event", deviceId, payload),
    },
    timestamp: payload.timestamp ?? new Date().toISOString(),
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

function formatEventTitle(eventType: string, deviceId: string, payload: MqttPayload): string {
  const id = deviceId.slice(0, 8);
  switch (eventType) {
    case "battery_low":
      return `Device ${id} battery low (${safeNumber(payload.battery, 0)}%)`;
    case "signal_weak":
      return `Device ${id} signal weak (${safeNumber(payload.signal, 0)} dBm)`;
    case "temperature_high":
      return `Device ${id} temperature high (${safeNumber(payload.temperature, 0)}°C)`;
    default:
      return `Device ${id}: ${eventType}`;
  }
}
