/**
 * Device API functions.
 *
 * Provides typed functions for fetching device data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, patch } from "./api-client";
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
  deviceConfig: Record<string, unknown> | null;
  deviceIo: Record<string, unknown> | null;
  lastDiagnostics: Record<string, unknown> | null;
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
  group_id?: string;
  status?: string;
  type?: string;
  tags?: string;
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

export interface UpdateDevicePayload {
  name?: string;
  status?: string;
  notes?: string;
  tags?: string[];
  lastMaintenance?: string;
  firmwareVersion?: string;
  firmwareBuild?: string;
  firmwareReleasedAt?: string;
  firmwareInstalledAt?: string;
  deviceConfig?: Record<string, unknown>;
  deviceIo?: Record<string, unknown>;
}

// ─── Device-Group Relationship Types ───────────────────────────────────────

export interface DeviceGroupRef {
  id: string;
  name: string;
  description: string | null;
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceGroupRefListResponse {
  data: DeviceGroupRef[];
}

/**
 * Fetch all device groups that contain a given device.
 */
export async function getDeviceGroups(deviceId: string): Promise<DeviceGroupRefListResponse> {
  return get<DeviceGroupRefListResponse>(`/devices/${deviceId}/groups`);
}

/**
 * Update a device's fields. Sends a PATCH to the backend.
 */
export async function updateDevice(
  id: string,
  payload: UpdateDevicePayload,
): Promise<DeviceApiItem> {
  return patch<DeviceApiItem>(`/devices/${id}`, payload);
}
