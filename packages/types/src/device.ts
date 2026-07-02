export type DeviceStatus = "online" | "offline" | "fault" | "warning";

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
