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
