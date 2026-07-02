/**
 * Device API functions.
 *
 * Provides typed functions for fetching device data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get } from "./api-client";
import type { DeviceStatus } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface DeviceApiItem {
  id: string;
  serialNumber: string;
  macAddress: string;
  name: string;
  type: string;
  status: DeviceStatus;
  firmwareVersion: string | null;
  firmwareBuild: string | null;
  firmwareReleasedAt: string | null;
  firmwareInstalledAt: string | null;
  battery: number | null;
  voltage: number | null;
  temperature: number | null;
  signalStrength: number | null;
  uptime: number | null;
  lastHeartbeat: string | null;
  siteId: string;
  siteName?: string;
  estateName?: string;
  roomId: string | null;
  installedAt: string;
  lastMaintenance: string | null;
  notes: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface DeviceListResponse {
  data: DeviceApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** Device detail includes joined site/estate names from the API. */
export interface DeviceDetailResponse extends DeviceApiItem {
  siteName?: string;
  estateName?: string;
}

export interface DevicesParams {
  site_id?: string;
  estate_id?: string;
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated device list from the backend.
 */
export async function getDevices(
  params?: DevicesParams,
): Promise<DeviceListResponse> {
  return get<DeviceListResponse>("/devices", {
    params: params as Record<
      string,
      string | number | boolean | undefined
    >,
  });
}

/**
 * Fetch a single device by ID, including site and estate names.
 */
export async function getDevice(
  id: string,
): Promise<DeviceDetailResponse> {
  return get<DeviceDetailResponse>(`/devices/${id}`);
}
