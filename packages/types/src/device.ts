export type DeviceStatus = "online" | "offline" | "fault" | "warning";

/**
 * Reasons that explain *why* a device has its current status.
 * Each reason maps to a specific telemetry or diagnostic condition.
 *
 * - HEARTBEAT_TIMEOUT  → device hasn't checked in (offline)
 * - BATTERY_CRITICAL   → battery ≤ 10% (fault)
 * - LOW_BATTERY        → battery 11–20% (warning)
 * - BATTERY_MISSING    → no battery data on a battery-powered device (warning)
 * - WEAK_SIGNAL        → signal ≤ -110 dBm (warning)
 * - OVERHEAT           → temperature ≥ 45°C (warning)
 * - HARDWARE_DIAGNOSTIC_FAILED → external diagnostic flag (fault, set elsewhere)
 */
export type StatusReason =
  | "HEARTBEAT_TIMEOUT"
  | "BATTERY_CRITICAL"
  | "LOW_BATTERY"
  | "BATTERY_MISSING"
  | "WEAK_SIGNAL"
  | "OVERHEAT"
  | "HARDWARE_DIAGNOSTIC_FAILED";

export type DeviceType =
  | "controller"
  | "sensor"
  | "gateway"
  | "relay"
  | "camera";

export interface DeviceTelemetry {
  battery: number; // percentage 0-100
  voltage: number; // volts
  temperature: number; // celsius
  signalStrength: number; // dBm
  uptime: number; // seconds
  lastHeartbeat: string; // ISO timestamp
}

export interface DeviceIO {
  inputs: IOPoint[];
  outputs: IOPoint[];
}

export interface IOPoint {
  id: string;
  label: string;
  state: boolean;
  type: "digital" | "analog";
  value?: number;
}

export interface DeviceFirmware {
  version: string;
  build: string;
  releasedAt: string;
  installedAt?: string;
}

export interface DeviceConfig {
  mqttTopic: string;
  publishInterval: number;
  thresholds: {
    batteryMin: number;
    voltageMin: number;
    temperatureMin: number;
    temperatureMax: number;
    signalMin: number;
  };
}

export interface Device {
  id: string;
  serialNumber: string;
  macAddress: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  firmware: DeviceFirmware;
  telemetry: DeviceTelemetry;
  io: DeviceIO;
  config: DeviceConfig;
  siteId: string;
  roomId?: string;
  installedAt: string;
  lastMaintenance?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceDiagnostic {
  id: string;
  deviceId: string;
  type: "ping" | "connection" | "mqtt" | "signal" | "battery" | "firmware";
  status: "passed" | "failed" | "warning";
  message: string;
  details?: Record<string, unknown>;
  ranAt: string;
  ranBy: string;
}

export interface MaintenanceRecord {
  id: string;
  deviceId: string;
  type: "inspection" | "repair" | "replacement" | "firmware_update" | "restart" | "factory_reset";
  description: string;
  performedBy: string;
  performedAt: string;
  notes?: string;
}
