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
import type { DeviceDetailResponse, DevicesParams } from "@/lib/devices";
import { queryKeys } from "@/lib/query-keys";
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useSimulatorModeStore } from "@/stores/simulator-mode-store";
import { deriveDeviceHealth } from "@sentience/utils";
import type { DeviceStatus, StatusReason } from "@sentience/types";
import type { DeviceEntry } from "@sentience/utils";

// ─── Row Type ─────────────────────────────────────────────────────────────

export interface DeviceListRow {
  id: string;
  name: string;
  serial: string;
  type: string;
  status: DeviceStatus;
  reasons: StatusReason[];
  battery: number | null;
  signal: number;
  temp: number;
  site: string;
  lastSeen: string;
  uptime: number | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function mapDeviceToRow(
  d: DeviceDetailResponse & { siteName?: string; estateName?: string },
): DeviceListRow {
  const health = deriveDeviceHealth({
    deviceId: d.id,
    deviceType: d.type,
    status: d.status,
    telemetry: d.battery != null && d.signalStrength != null && d.temperature != null
      ? {
          battery: d.battery,
          voltage: d.voltage ?? 0,
          temperature: d.temperature,
          signalStrength: d.signalStrength,
          timestamp: d.updatedAt ?? d.lastHeartbeat ?? new Date().toISOString(),
        }
      : null,
    lastSeen: d.lastHeartbeat ?? d.updatedAt ?? new Date().toISOString(),
    siteId: d.siteId,
    siteName: d.siteName,
    estateName: d.estateName,
  });
  return {
    id: d.id,
    name: d.name,
    serial: d.serialNumber,
    type: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    status: health.status,
    reasons: health.reasons,
    battery: d.battery,
    signal: d.signalStrength ?? 0,
    temp: d.temperature ?? 0,
    site: d.siteName ?? `Site ${d.siteId.slice(0, 8)}`,
    lastSeen: d.lastHeartbeat ?? d.updatedAt ?? new Date().toISOString(),
    uptime: d.uptime,
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

  const entryForSelector: DeviceEntry = {
    deviceId: entry.deviceId,
    deviceType: entry.deviceType,
    status: entry.status,
    telemetry: entry.telemetry
      ? {
          battery: entry.telemetry.battery,
          voltage: entry.telemetry.voltage,
          temperature: entry.telemetry.temperature,
          signalStrength: entry.telemetry.signalStrength,
          timestamp: entry.telemetry.timestamp,
        }
      : null,
    lastSeen: entry.lastSeen,
    siteId: entry.siteId,
    siteName: entry.siteName,
    estateId: entry.estateId,
    estateName: entry.estateName,
  };
  const health = deriveDeviceHealth(entryForSelector);
  return {
    id: entry.deviceId,
    name: entry.deviceName ?? `Device ${entry.deviceId.slice(0, 8)}`,
    serial: `SIM-${entry.deviceId.slice(0, 8).toUpperCase()}`,
    type: entry.deviceType
      ? entry.deviceType.charAt(0).toUpperCase() + entry.deviceType.slice(1)
      : `Device ${index + 1}`,
    status: health.status,
    reasons: health.reasons,
    battery: entry.telemetry?.battery ?? null,
    signal: entry.telemetry?.signalStrength ?? 0,
    temp: entry.telemetry?.temperature ?? 0,
    site: entry.siteName ?? entry.siteId ?? "Unassigned",
    lastSeen: entry.lastSeen,
    uptime: entry.telemetry?.uptime ?? null,
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
export function useDevices(page: number = 1) {
  const simulatorMode = useSimulatorModeStore((s) => s.enabled);
  const liveDevices = useLiveDeviceStore((s) => s.devices);

  const params: DevicesParams = { page, limit: 20 };

  const query = useQuery({
    queryKey: queryKeys.devices.list(undefined, params as unknown as Record<string, unknown>),
    queryFn: () => getDevices(params),
    // Skip API call in simulator mode — no database data needed
    enabled: !simulatorMode,
  });

  // Client-side page slicing for simulator mode and search/filter display.
  const PAGE_LIMIT = 20;

  // Simulator Mode: return ONLY live store devices, sliced by page.
  const simulatorDevices = useMemo<DeviceListRow[]>(() => {
    if (!simulatorMode) return [];
    const entries = Object.values(liveDevices);
    const allRows = entries.map((entry, i) => mapLiveEntryToRow(entry, i));
    const offset = (page - 1) * PAGE_LIMIT;
    return allRows.slice(offset, offset + PAGE_LIMIT);
  }, [simulatorMode, liveDevices, page]);

  // Total count of simulator devices (for pagination math).
  const simulatorTotal = useMemo(() => {
    if (!simulatorMode) return 0;
    return Object.keys(liveDevices).length;
  }, [simulatorMode, liveDevices]);

  // Normal Mode: merge API devices with live overlay — no sim-only devices
  const apiDevices = useMemo<DeviceListRow[]>(() => {
    if (simulatorMode) return [];
    const apiData = query.data?.data ?? [];

    return apiData.map((api) => {
      const live = liveDevices[api.id];
      if (!live) return mapDeviceToRow(api);

      const health = deriveDeviceHealth({
        deviceId: live.deviceId,
        deviceType: live.deviceType,
        status: live.status,
        telemetry: live.telemetry
          ? {
              battery: live.telemetry.battery,
              voltage: live.telemetry.voltage,
              temperature: live.telemetry.temperature,
              signalStrength: live.telemetry.signalStrength,
              timestamp: live.telemetry.timestamp,
            }
          : null,
        lastSeen: live.lastSeen,
        siteId: live.siteId,
        siteName: live.siteName,
        estateName: live.estateName,
      });
      return {
        id: api.id,
        name: api.name,
        serial: api.serialNumber,
        type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
        status: health.status,
        reasons: health.reasons,
        battery: live.telemetry?.battery ?? api.battery,
        signal: live.telemetry?.signalStrength ?? api.signalStrength ?? 0,
        temp: live.telemetry?.temperature ?? api.temperature ?? 0,
        lastSeen: live.lastSeen,
        uptime: live.telemetry?.uptime ?? api.uptime,
        site: buildSiteLabel(
          live.siteName ?? api.siteName,
          live.estateName ?? api.estateName,
          api.siteId,
        ),
      };
    });
  }, [simulatorMode, query.data, liveDevices]);

  const devices = simulatorMode ? simulatorDevices : apiDevices;
  const total = simulatorMode ? simulatorTotal : (query.data?.pagination?.total ?? 0);

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
      const entryForSelector: DeviceEntry = {
        deviceId: liveEntry.deviceId,
        deviceType: liveEntry.deviceType,
        status: liveEntry.status,
        telemetry: liveEntry.telemetry
          ? {
              battery: liveEntry.telemetry.battery,
              voltage: liveEntry.telemetry.voltage,
              temperature: liveEntry.telemetry.temperature,
              signalStrength: liveEntry.telemetry.signalStrength,
              timestamp: liveEntry.telemetry.timestamp,
            }
          : null,
        lastSeen: liveEntry.lastSeen,
        siteId: liveEntry.siteId,
        siteName: liveEntry.siteName,
        estateId: liveEntry.estateId,
        estateName: liveEntry.estateName,
      };
      const health = deriveDeviceHealth(entryForSelector);
      return {
        id: liveEntry.deviceId,
        name: liveEntry.deviceName ?? `Device ${liveEntry.deviceId.slice(0, 8)}`,
        serial: `SIM-${liveEntry.deviceId.slice(0, 8).toUpperCase()}`,
        type: liveEntry.deviceType
          ? liveEntry.deviceType.charAt(0).toUpperCase() + liveEntry.deviceType.slice(1)
          : "Device",
        status: health.status,
        reasons: health.reasons,
        battery: liveEntry.telemetry?.battery ?? null,
        signal: liveEntry.telemetry?.signalStrength ?? 0,
        temp: liveEntry.telemetry?.temperature ?? 0,
        site: liveEntry.siteName ?? liveEntry.siteId ?? "Unassigned",
        lastSeen: liveEntry.lastSeen,
        uptime: liveEntry.telemetry?.uptime ?? null,
      };
    }

    // Normal mode: API data with live overlay
    const api = query.data;
    if (!api) return null;

    const apiEntry: DeviceEntry = {
      deviceId: api.id,
      deviceType: api.type,
      status: api.status,
      telemetry: api.battery != null && api.signalStrength != null && api.temperature != null
        ? {
            battery: api.battery,
            voltage: api.voltage ?? 0,
            temperature: api.temperature,
            signalStrength: api.signalStrength,
            timestamp: api.updatedAt ?? api.lastHeartbeat ?? new Date().toISOString(),
          }
        : null,
      lastSeen: api.lastHeartbeat ?? api.updatedAt ?? new Date().toISOString(),
      siteId: api.siteId,
      siteName: api.siteName,
      estateName: api.estateName,
    };
    const apiHealth = deriveDeviceHealth(apiEntry);

    if (liveEntry) {
      const liveHealth = deriveDeviceHealth({
        deviceId: liveEntry.deviceId,
        deviceType: liveEntry.deviceType,
        status: liveEntry.status,
        telemetry: liveEntry.telemetry
          ? {
              battery: liveEntry.telemetry.battery,
              voltage: liveEntry.telemetry.voltage,
              temperature: liveEntry.telemetry.temperature,
              signalStrength: liveEntry.telemetry.signalStrength,
              timestamp: liveEntry.telemetry.timestamp,
            }
          : null,
        lastSeen: liveEntry.lastSeen,
        siteId: liveEntry.siteId,
        siteName: liveEntry.siteName,
        estateName: liveEntry.estateName,
      });
      return {
        id: api.id,
        name: api.name,
        serial: api.serialNumber,
        type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
        status: liveHealth.status,
        reasons: liveHealth.reasons,
        battery: liveEntry.telemetry?.battery ?? api.battery,
        signal: liveEntry.telemetry?.signalStrength ?? api.signalStrength ?? 0,
        temp: liveEntry.telemetry?.temperature ?? api.temperature ?? 0,
        lastSeen: liveEntry.lastSeen,
        uptime: liveEntry.telemetry?.uptime ?? api.uptime,
        site: buildSiteLabel(
          liveEntry?.siteName ?? api.siteName,
          liveEntry?.estateName ?? api.estateName,
          api.siteId,
        ),
      };
    }

    return {
      id: api.id,
      name: api.name,
      serial: api.serialNumber,
      type: api.type.charAt(0).toUpperCase() + api.type.slice(1),
      status: apiHealth.status,
      reasons: apiHealth.reasons,
      battery: api.battery,
      signal: api.signalStrength ?? 0,
      temp: api.temperature ?? 0,
      lastSeen: api.lastHeartbeat ?? api.updatedAt ?? new Date().toISOString(),
      uptime: api.uptime,
      site: buildSiteLabel(
        api.siteName,
        api.estateName,
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
