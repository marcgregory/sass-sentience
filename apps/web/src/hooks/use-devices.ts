/**
 * TanStack Query hooks for device data.
 *
 * useDevices — returns devices based on Simulator Mode.
 *   Simulator Mode ON  → ONLY live store devices (simulator data, no API call).
 *   Simulator Mode OFF → ONLY API devices with live telemetry overlay.
 * useDevice  — single device detail from API, merged with live socket overlay.
 *
 * Simulator and database devices are mutually exclusive — never merge sources.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDevices, getDevice } from "@/lib/devices";
import type { DeviceDetailResponse } from "@/lib/devices";
import { queryKeys } from "@/lib/query-keys";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import { deriveDeviceStatus } from "@sentience/utils";
import type { DeviceStatus } from "@sentience/types";

// ─── Row Type ─────────────────────────────────────────────────────────────

export interface DeviceListRow {
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

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapDeviceToRow(
  d: DeviceDetailResponse & { siteName?: string; estateName?: string },
): DeviceListRow {
  return {
    id: d.id,
    name: d.name,
    serial: d.serialNumber,
    type: d.type.charAt(0).toUpperCase() + d.type.slice(1), // "sensor" → "Sensor"
    status: d.status,
    battery: d.battery ?? 0,
    signal: d.signalStrength ?? 0,
    temp: d.temperature ?? 0,
    site: d.siteName ?? `Site ${d.siteId.slice(0, 8)}`,
  };
}

function buildSiteLabel(
  siteName?: string,
  estateName?: string,
  siteId?: string,
): string {
  if (siteName && estateName) return `${siteName} - ${estateName}`;
  if (siteName) return siteName;
  if (siteId !== "unknown" && siteId) return `Site ${siteId.slice(0, 8)}`;
  return "Unassigned";
}

/**
 * Map a live-device store entry to a DeviceListRow for display.
 */
function mapLiveEntryToRow(
  entry: import("@/stores/live-device-store").LiveDeviceEntry,
  index: number,
): DeviceListRow {
  const typeLabels = ["Sensor", "Controller", "Gateway", "Relay", "Camera"];
  return {
    id: entry.deviceId,
    name: `Device ${entry.deviceId.slice(0, 8)}`,
    serial: `SIM-${entry.deviceId.slice(0, 8).toUpperCase()}`,
    type: typeLabels[index % typeLabels.length],
    status: entry.status,
    battery: entry.telemetry?.battery ?? 0,
    signal: entry.telemetry?.signalStrength ?? 0,
    temp: entry.telemetry?.temperature ?? 0,
    site: entry.siteName ?? entry.siteId ?? "Unassigned",
  };
}

// ─── useDevices ────────────────────────────────────────────────────────────

/**
 * Fetch devices based on current Simulator Mode.
 *
 * - **Simulator Mode ON:** Returns ONLY devices from the live realtime store.
 *   No API call is made. The count reflects the simulator device count (5).
 * - **Simulator Mode OFF:** Returns ONLY API (database) devices with live
 *   telemetry/status overlaid where available. Simulator-only devices from
 *   the live feed are ignored.
 */
export function useDevices() {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const liveDevices = useLiveDeviceStore((s) => s.devices);

  const query = useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: () => getDevices(),
    // Skip API call in simulator mode — no database data needed
    enabled: !simulatorMode,
  });

  // Simulator Mode: return ONLY live store devices
  const simulatorDevices = useMemo<DeviceListRow[]>(() => {
    if (!simulatorMode) return [];
    const entries = Object.values(liveDevices);
    return entries.map((entry, i) => mapLiveEntryToRow(entry, i));
  }, [simulatorMode, liveDevices]);

  // Normal Mode: merge API devices with live overlay — no sim-only devices
  const apiDevices = useMemo<DeviceListRow[]>(() => {
    if (simulatorMode) return [];
    const apiData = query.data?.data ?? [];

    return apiData.map((api) => {
      const live = liveDevices[api.id];
      if (!live) return mapDeviceToRow(api);

      return {
        id: api.id,
        name: api.name,
        serial: api.serialNumber,
        type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
        status: deriveDeviceStatus(live as Parameters<typeof deriveDeviceStatus>[0]),
        battery: live.telemetry?.battery ?? api.battery ?? 0,
        signal: live.telemetry?.signalStrength ?? api.signalStrength ?? 0,
        temp: live.telemetry?.temperature ?? api.temperature ?? 0,
        site: buildSiteLabel(
          live.siteName ?? api.siteName,
          live.estateName ?? api.estateName,
          api.siteId,
        ),
      };
    });
  }, [simulatorMode, query.data, liveDevices]);

  const devices = simulatorMode ? simulatorDevices : apiDevices;
  const total = simulatorMode ? devices.length : (query.data?.pagination?.total ?? 0);

  return {
    devices,
    total,
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
    error: simulatorMode ? null : query.error,
  };
}

// ─── useDevice ─────────────────────────────────────────────────────────────

/**
 * Fetch a single device — from the API (normal mode) or live store (simulator
 * mode) — and merge with its live overlay entry.
 *
 * In simulator mode, the API call is skipped and only the live store entry
 * is used. This allows simulator devices to be viewed on the detail page.
 *
 * In normal mode, the API response provides the base data and any matching
 * live store entry overlays real-time telemetry/status.
 */
export function useDevice(id: string) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);

  const query = useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: () => getDevice(id),
    enabled: !!id && !simulatorMode,
  });

  const liveEntry = useLiveDeviceStore((s) => s.devices[id]);

  const device = useMemo<DeviceListRow | null>(() => {
    // Simulator mode: build from live store entry only
    if (simulatorMode) {
      if (!liveEntry) return null;
      return {
        id: liveEntry.deviceId,
        name: `Device ${liveEntry.deviceId.slice(0, 8)}`,
        serial: `SIM-${liveEntry.deviceId.slice(0, 8).toUpperCase()}`,
        type: "Sensor",
        status: liveEntry.status,
        battery: liveEntry.telemetry?.battery ?? 0,
        signal: liveEntry.telemetry?.signalStrength ?? 0,
        temp: liveEntry.telemetry?.temperature ?? 0,
        site: liveEntry.siteName ?? liveEntry.siteId ?? "Unassigned",
      };
    }

    // Normal mode: API data with live overlay
    const api = query.data;
    if (!api) return null;

    return {
      id: api.id,
      name: api.name,
      serial: api.serialNumber,
      type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
      status: liveEntry
        ? deriveDeviceStatus(liveEntry as Parameters<typeof deriveDeviceStatus>[0])
        : api.status,
      battery: liveEntry?.telemetry?.battery ?? api.battery ?? 0,
      signal: liveEntry?.telemetry?.signalStrength ?? api.signalStrength ?? 0,
      temp: liveEntry?.telemetry?.temperature ?? api.temperature ?? 0,
      site: buildSiteLabel(
        liveEntry?.siteName ?? api.siteName,
        liveEntry?.estateName ?? api.estateName,
        api.siteId,
      ),
    };
  }, [simulatorMode, query.data, liveEntry]);

  return {
    device,
    apiDevice: query.data as DeviceDetailResponse | undefined,
    isLoading: simulatorMode ? false : query.isLoading,
    isError: simulatorMode ? false : query.isError,
    error: simulatorMode ? null : query.error,
  };
}
