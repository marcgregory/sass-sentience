/**
 * Device Group API functions.
 *
 * Provides typed functions for device group CRUD operations.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del, request } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface DeviceGroupApiItem {
  id: string;
  name: string;
  description: string | null;
  deviceIds: string[];
  deviceCount: number;
  archivedAt: string | null;
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
  archived?: "true" | "false" | "all";
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

/**
 * Add a device to a device group.
 * Atomic operation — uses PostgreSQL array_append() with duplicate protection.
 */
export async function addDeviceToGroup(
  groupId: string,
  deviceId: string,
): Promise<{ success: boolean; deviceName?: string; groupName?: string }> {
  return post<{ success: boolean; deviceName?: string; groupName?: string }>(
    `/device-groups/${groupId}/devices`,
    { deviceId },
  );
}

// ─── Bulk Tag API ─────────────────────────────────────────────────────────

export interface BulkTagPreviewResponse {
  deviceCount: number;
  sampleDevices: { id: string; name: string }[];
}

export interface BulkTagResponse {
  success: boolean;
  affectedCount: number;
  addedTags?: string[];
  removedTags?: string[];
}

/**
 * Preview a bulk tag operation on a device group.
 * Returns the number of affected devices and a sample without
 * enumerating the full device list.
 */
export async function getBulkTagPreview(
  groupId: string,
): Promise<BulkTagPreviewResponse> {
  return get<BulkTagPreviewResponse>(`/device-groups/${groupId}/tag-preview`);
}

/**
 * Apply tags to all devices in a group.
 * Server-side operation — no client enumeration.
 * Merges tags with deduplication.
 */
export async function bulkAssignTags(
  groupId: string,
  tags: string[],
): Promise<BulkTagResponse> {
  return post<BulkTagResponse>(`/device-groups/${groupId}/tags`, { tags });
}

/**
 * Remove tags from all devices in a group.
 * Server-side operation — no client enumeration.
 */
export async function bulkRemoveTags(
  groupId: string,
  tags: string[],
): Promise<BulkTagResponse> {
  return request<BulkTagResponse>(`/device-groups/${groupId}/tags`, {
    method: "DELETE",
    body: JSON.stringify({ tags }),
  });
}

// ─── Archive / Restore / Duplicate API ───────────────────────────────────

export interface ArchiveRestoreResponse {
  success: boolean;
  name: string;
}

/**
 * Archive (soft-delete) a device group.
 */
export async function archiveGroup(
  id: string,
): Promise<ArchiveRestoreResponse> {
  return post<ArchiveRestoreResponse>(`/device-groups/${id}/archive`);
}

/**
 * Restore an archived device group.
 */
export async function restoreGroup(
  id: string,
): Promise<ArchiveRestoreResponse> {
  return post<ArchiveRestoreResponse>(`/device-groups/${id}/restore`);
}

/**
 * Duplicate a device group — copies name, description, and device IDs.
 * Returns the created group for immediate navigation.
 */
export async function duplicateGroup(
  id: string,
): Promise<DeviceGroupApiItem> {
  return post<DeviceGroupApiItem>(`/device-groups/${id}/duplicate`);
}
