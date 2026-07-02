/**
 * Hook that merges the simulation's live device data with the static mock
 * device list. When realtime data arrives from the Socket.IO bridge,
 * device status, battery, signal, and temperature are overlaid onto the
 * mock entries so the table updates live without a page refresh.
 *
 * Devices that only exist in the live feed (simulator-generated IDs)
 * are appended to the list so they're visible even though they have no
 * mock entry.
 */

import { useMemo } from "react";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import type { DeviceStatus } from "@sentience/types";

export interface LiveDeviceRow {
  id: string;
  name: string;
  serial: string;
  type: string;
  status: DeviceStatus;
  battery: number;
  signal: number;
  temp: number;
  site: string;
}

const MOCK_DEVICES: LiveDeviceRow[] = [
  { id: "DEV-001", name: "Gate Controller A3", serial: "SN-2024-001", type: "Controller", status: "online", battery: 87, signal: -52, temp: 24.5, site: "Building A - Riverside" },
  { id: "DEV-002", name: "Sensor B7", serial: "SN-2024-002", type: "Sensor", status: "online", battery: 12, signal: -61, temp: 22.1, site: "Building B - Riverside" },
  { id: "DEV-003", name: "Gateway 4", serial: "SN-2024-003", type: "Gateway", status: "warning", battery: 45, signal: -78, temp: 31.2, site: "Warehouse 1 - Tech Valley" },
  { id: "DEV-004", name: "Relay Panel 2", serial: "SN-2024-004", type: "Relay", status: "fault", battery: 0, signal: -95, temp: 28.7, site: "Main Terminal - Harbour" },
  { id: "DEV-005", name: "Camera NW-12", serial: "SN-2024-005", type: "Camera", status: "online", battery: 92, signal: -44, temp: 26.3, site: "Admin Block - Tech Valley" },
  { id: "DEV-006", name: "Temperature Sensor T3", serial: "SN-2024-006", type: "Sensor", status: "online", battery: 76, signal: -55, temp: 21.8, site: "Building A - Riverside" },
  { id: "DEV-007", name: "Access Controller A1", serial: "SN-2024-007", type: "Controller", status: "offline", battery: 0, signal: 0, temp: 0, site: "Building B - Riverside" },
  { id: "DEV-008", name: "Smoke Detector SD-2", serial: "SN-2024-008", type: "Sensor", status: "online", battery: 68, signal: -58, temp: 23.4, site: "Warehouse 1 - Tech Valley" },
];

const SIM_DEVICE_TYPES = ["controller", "sensor", "gateway", "relay", "camera"];

/**
 * Pick a human-readable type label from the live device ID hash.
 * Deterministic — same ID always gets the same type.
 */
function pickType(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SIM_DEVICE_TYPES[hash % SIM_DEVICE_TYPES.length];
}

/**
 * Returns the merged device list consisting of:
 * 1. Static mock devices, with live values overlaid when available.
 * 2. Simulator-only devices appended at the bottom (no mock match).
 */
export function useLiveDevices(): LiveDeviceRow[] {
  const liveDevices = useLiveDeviceStore((s) => s.devices);

  return useMemo(() => {
    const ids = Object.keys(liveDevices);
    if (ids.length === 0) return MOCK_DEVICES;

    const mockIdSet = new Set(MOCK_DEVICES.map((d) => d.id));

    // 1. Overlay live data onto mock entries
    const merged = MOCK_DEVICES.map((mock) => {
      const live = liveDevices[mock.id];
      if (!live) return mock;

      return {
        ...mock,
        status: live.status,
        battery: live.telemetry?.battery ?? mock.battery,
        signal: live.telemetry?.signalStrength ?? mock.signal,
        temp: live.telemetry?.temperature ?? mock.temp,
      };
    });

    // 2. Append simulator-only devices
    for (const id of ids) {
      if (mockIdSet.has(id)) continue;
      const live = liveDevices[id];
      merged.push({
        id: live.deviceId,
        name: `Device ${live.deviceId.slice(0, 8)}`,
        serial: `SN-${live.deviceId.slice(0, 8).toUpperCase()}`,
        type: pickType(live.deviceId),
        status: live.status,
        battery: live.telemetry?.battery ?? 100,
        signal: live.telemetry?.signalStrength ?? -70,
        temp: live.telemetry?.temperature ?? 25,
        site: live.siteId !== "unknown" ? `Site ${live.siteId.slice(0, 8)}` : "Unassigned",
      });
    }

    return merged;
  }, [liveDevices]);
}
