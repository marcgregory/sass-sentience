/**
 * TanStack Query hooks for device data.
 *
 * useDevices — paginated device list from API, merged with live socket overlay.
 * useDevice  — single device detail from API, merged with live socket overlay.
 *
 * Live telemetry/status always wins over API data when available.
 * Devices that only exist in the live feed (simulator-only) are appended
 * to the list so they remain visible.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDevices, getDevice } from "@/lib/devices";
import type { DeviceDetailResponse } from "@/lib/devices";
import { queryKeys } from "@/lib/query-keys";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import type { DeviceStatus } from "@sentience/types";
import type { LiveDeviceEntry } from "@/stores/live-device-store";

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

const SIM_DEVICE_TYPES = ["controller", "sensor", "gateway", "relay", "camera"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUUID(id: string): boolean {
  return UUID_RE.test(id);
}

function pickType(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return SIM_DEVICE_TYPES[hash % SIM_DEVICE_TYPES.length];
}

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

function liveEntryToRow(entry: LiveDeviceEntry): DeviceListRow {
  return {
    id: entry.deviceId,
    name: `Device ${entry.deviceId.slice(0, 8)}`,
    serial: `SN-${entry.deviceId.slice(0, 8).toUpperCase()}`,
    type: pickType(entry.deviceId),
    status: entry.status,
    battery: entry.telemetry?.battery ?? 100,
    signal: entry.telemetry?.signalStrength ?? -70,
    temp: entry.telemetry?.temperature ?? 25,
    site: buildSiteLabel(entry.siteName, entry.estateName, entry.siteId),
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

// ─── useDevices ────────────────────────────────────────────────────────────

/**
 * Fetch the device list from the API, overlay live telemetry/status from the
 * socket layer, and append any simulator-only devices that exist in the live
 * feed but not in the database.
 */
export function useDevices() {
  const query = useQuery({
    queryKey: queryKeys.devices.list(),
    queryFn: () => getDevices(),
  });

  const liveDevices = useLiveDeviceStore((s) => s.devices);

  // Merge API devices with live overlay + sim-only devices
  const devices = useMemo<DeviceListRow[]>(() => {
    const apiData = query.data?.data ?? [];
    const liveIds = new Set(Object.keys(liveDevices));
    const seenIds = new Set<string>();

    // 1. Map API devices and overlay live data
    const merged = apiData.map((api) => {
      seenIds.add(api.id);
      const live = liveDevices[api.id];
      if (!live) return mapDeviceToRow(api);

      return {
        id: api.id,
        name: api.name,
        serial: api.serialNumber,
        type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
        status: live.status,
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

    // 2. Append simulator-only devices (live data, no API match)
    for (const id of liveIds) {
      if (seenIds.has(id)) continue;
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
        site: buildSiteLabel(live.siteName, live.estateName, live.siteId),
      });
    }

    return merged;
  }, [query.data, liveDevices]);

  return {
    devices,
    total: query.data?.pagination?.total ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useDevice ─────────────────────────────────────────────────────────────

/**
 * Fetch a single device from the API and merge with its live overlay entry.
 *
 * Returns a DeviceListRow (compatible with the detail page's existing
 * template expectations) plus the raw API response for richer detail.
 * The live store entry should still be accessed separately via
 * `useLiveDeviceStore((s) => s.devices[id])` for real-time telemetry.
 *
 * For non-UUID IDs (simulator-only devices), the API call is skipped
 * and the device is resolved entirely from the live device store.
 */
export function useDevice(id: string) {
  const isUuid = isUUID(id);

  const query = useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: () => getDevice(id),
    enabled: !!id && isUuid,
  });

  const liveEntry = useLiveDeviceStore((s) => s.devices[id]);

  const device = useMemo<DeviceListRow | null>(() => {
    // Non-UUID: resolve from live store only
    if (!isUuid) {
      if (!liveEntry) return null;
      return liveEntryToRow(liveEntry);
    }

    // UUID: merge API data with live overlay
    const api = query.data;
    if (!api) return null;

    const live = liveEntry;

    return {
      id: api.id,
      name: api.name,
      serial: api.serialNumber,
      type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
      status: live?.status ?? api.status,
      battery: live?.telemetry?.battery ?? api.battery ?? 0,
      signal: live?.telemetry?.signalStrength ?? api.signalStrength ?? 0,
      temp: live?.telemetry?.temperature ?? api.temperature ?? 0,
      site: buildSiteLabel(
        live?.siteName ?? api.siteName,
        live?.estateName ?? api.estateName,
        api.siteId,
      ),
    };
  }, [query.data, liveEntry, id, isUuid]);

  return {
    device,
    apiDevice: query.data as DeviceDetailResponse | undefined,
    // For non-UUID IDs, never show loading/error from the skipped query
    isLoading: isUuid && query.isLoading,
    isError: isUuid && query.isError,
    error: query.error,
  };
}
