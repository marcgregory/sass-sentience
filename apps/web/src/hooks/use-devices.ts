/**
 * TanStack Query hooks for device data.
 *
 * useDevices — paginated device list from API, merged with live socket overlay.
 * useDevice  — single device detail from API, merged with live socket overlay.
 *
 * Live telemetry/status always wins over API data when available.
 * Only database devices appear in the device list — simulator-only devices
 * that exist in the live feed but not in the API are not appended.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDevices, getDevice } from "@/lib/devices";
import type { DeviceDetailResponse } from "@/lib/devices";
import { queryKeys } from "@/lib/query-keys";
import { useLiveDeviceStore } from "@/stores/live-device-store";
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

  // Merge API devices with live overlay — no sim-only devices appended
  const devices = useMemo<DeviceListRow[]>(() => {
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
 */
export function useDevice(id: string) {
  const query = useQuery({
    queryKey: queryKeys.devices.detail(id),
    queryFn: () => getDevice(id),
    enabled: !!id,
  });

  const liveEntry = useLiveDeviceStore((s) => s.devices[id]);

  const device = useMemo<DeviceListRow | null>(() => {
    const api = query.data;
    if (!api) return null;

    const live = liveEntry;

    return {
      id: api.id,
      name: api.name,
      serial: api.serialNumber,
      type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
      status: live
        ? deriveDeviceStatus(live as Parameters<typeof deriveDeviceStatus>[0])
        : api.status,
      battery: live?.telemetry?.battery ?? api.battery ?? 0,
      signal: live?.telemetry?.signalStrength ?? api.signalStrength ?? 0,
      temp: live?.telemetry?.temperature ?? api.temperature ?? 0,
      site: buildSiteLabel(
        live?.siteName ?? api.siteName,
        live?.estateName ?? api.estateName,
        api.siteId,
      ),
    };
  }, [query.data, liveEntry]);

  return {
    device,
    apiDevice: query.data as DeviceDetailResponse | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
