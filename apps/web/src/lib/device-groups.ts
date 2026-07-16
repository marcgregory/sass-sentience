/**
 * Device Group API functions.
 *
 * Provides typed functions for device group CRUD operations.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface DeviceGroupApiItem {
  id: string;
  name: string;
  description: string | null;
  deviceIds: string[];
  deviceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceGroupListResponse {
  data: DeviceGroupApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DeviceGroupListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export interface CreateDeviceGroupPayload {
  name: string;
  description?: string;
  deviceIds?: string[];
}

export interface UpdateDeviceGroupPayload {
  name?: string;
  description?: string | null;
  deviceIds?: string[];
}

// ─── API Functions ────────────────────────────────────────────────────────

export async function getDeviceGroups(
  params?: DeviceGroupListParams,
): Promise<DeviceGroupListResponse> {
  return get<DeviceGroupListResponse>("/device-groups", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getDeviceGroup(
  id: string,
): Promise<DeviceGroupApiItem> {
  return get<DeviceGroupApiItem>(`/device-groups/${id}`);
}

export async function createDeviceGroup(
  payload: CreateDeviceGroupPayload,
): Promise<DeviceGroupApiItem> {
  return post<DeviceGroupApiItem>("/device-groups", payload);
}

export async function updateDeviceGroup(
  id: string,
  payload: UpdateDeviceGroupPayload,
): Promise<DeviceGroupApiItem> {
  return patch<DeviceGroupApiItem>(`/device-groups/${id}`, payload);
}

export async function deleteDeviceGroup(
  id: string,
): Promise<void> {
  return del<void>(`/device-groups/${id}`);
}

// ─── Group Devices API ────────────────────────────────────────────────────

/**
 * Response item for a device within a group context.
 * Mirrors the backend's enriched device DTO.
 */
export interface GroupDeviceItem {
  id: string;
  serialNumber: string;
  name: string;
  type: string;
  status: string;
  battery: number | null;
  signalStrength: number | null;
  temperature: number | null;
  uptime: number | null;
  lastHeartbeat: string | null;
  siteId: string;
  siteName: string | null;
  estateName: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupDeviceListResponse {
  data: GroupDeviceItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface GroupDeviceListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

/**
 * Fetch paginated devices belonging to a specific device group.
 */
export async function getGroupDevices(
  groupId: string,
  params?: GroupDeviceListParams,
): Promise<GroupDeviceListResponse> {
  return get<GroupDeviceListResponse>(`/device-groups/${groupId}/devices`, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Remove a device from a device group.
 * Atomic operation — uses PostgreSQL array_remove().
 */
export async function removeDeviceFromGroup(
  groupId: string,
  deviceId: string,
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/device-groups/${groupId}/devices/${deviceId}`);
}
