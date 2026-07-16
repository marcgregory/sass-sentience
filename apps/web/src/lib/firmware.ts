/**
 * Firmware Package and Rollout API functions.
 *
 * Provides typed functions for firmware package CRUD and rollout lifecycle.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, del, patch } from "./api-client";

// ─── Firmware Package Types ──────────────────────────────────────────────────

export interface FirmwarePackageApiItem {
  id: string;
  name: string;
  version: string;
  deviceType: string[];
  releaseNotes: string | null;
  fileHash: string | null;
  fileSize: number | null;
  status: "active" | "deprecated";
  createdBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface FirmwarePackageListResponse {
  data: FirmwarePackageApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FirmwarePackageListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  status?: "active" | "deprecated";
}

export interface CreateFirmwarePackagePayload {
  name: string;
  version: string;
  deviceType: string[];
  releaseNotes?: string | null;
  fileHash?: string | null;
  fileSize?: number | null;
}

export interface UpdateFirmwarePackagePayload {
  name?: string;
  version?: string;
  deviceType?: string[];
  releaseNotes?: string | null;
  fileHash?: string | null;
  fileSize?: number | null;
  metadata?: Record<string, unknown>;
}

// ─── Rollout Types ───────────────────────────────────────────────────────────

export type RolloutStatus = "draft" | "running" | "completed" | "failed" | "cancelled";
export type ExecutionStatus = "pending" | "running" | "succeeded" | "failed" | "skipped" | "cancelled";

export interface RolloutApiItem {
  id: string;
  jobType: string;
  name: string;
  firmwarePackageId: string | null;
  jobConfig: Record<string, unknown> | null;
  targetGroupId: string;
  status: RolloutStatus;
  deviceCount: number;
  completedCount: number;
  failedCount: number;
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  firmwareName?: string | null;
  targetGroupName?: string | null;
}

export interface RolloutListResponse {
  data: RolloutApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface RolloutListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
  status?: RolloutStatus;
  firmwarePackageId?: string;
}

export interface CreateRolloutPayload {
  name: string;
  firmwarePackageId: string;
  targetGroupId: string;
}

export interface RolloutDeviceApiItem {
  id: string;
  rolloutId: string;
  deviceId: string;
  status: ExecutionStatus;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  deviceName?: string | null;
  deviceSerial?: string | null;
}

export interface RolloutDeviceListResponse {
  data: RolloutDeviceApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EligibilityPreviewResponse {
  eligibleCount: number;
  ineligibleCount: number;
  eligibleDevices: Array<{ id: string; name: string; type: string; status: string }>;
  ineligibleDevices: Array<{ id: string; name: string; type: string; status: string; reason: string }>;
}

export interface RetryResponse {
  success: boolean;
  retriedCount: number;
}

// ─── Firmware Package API Functions ─────────────────────────────────────────

export async function getFirmwarePackages(
  params?: FirmwarePackageListParams,
): Promise<FirmwarePackageListResponse> {
  return get<FirmwarePackageListResponse>("/firmware", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getFirmwarePackage(
  id: string,
): Promise<FirmwarePackageApiItem> {
  return get<FirmwarePackageApiItem>(`/firmware/${id}`);
}

export async function createFirmwarePackage(
  payload: CreateFirmwarePackagePayload,
): Promise<FirmwarePackageApiItem> {
  return post<FirmwarePackageApiItem>("/firmware", payload);
}

export async function updateFirmwarePackage(
  id: string,
  payload: UpdateFirmwarePackagePayload,
): Promise<FirmwarePackageApiItem> {
  return patch<FirmwarePackageApiItem>(`/firmware/${id}`, payload);
}

export async function deprecateFirmwarePackage(
  id: string,
): Promise<FirmwarePackageApiItem> {
  return post<FirmwarePackageApiItem>(`/firmware/${id}/deprecate`);
}

export async function activateFirmwarePackage(
  id: string,
): Promise<FirmwarePackageApiItem> {
  return post<FirmwarePackageApiItem>(`/firmware/${id}/activate`);
}

export async function deleteFirmwarePackage(
  id: string,
): Promise<{ success: boolean }> {
  return del<{ success: boolean }>(`/firmware/${id}`);
}

// ─── Rollout API Functions ──────────────────────────────────────────────────

export async function getRollouts(
  params?: RolloutListParams,
): Promise<RolloutListResponse> {
  return get<RolloutListResponse>("/rollouts", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getRollout(
  id: string,
): Promise<RolloutApiItem> {
  return get<RolloutApiItem>(`/rollouts/${id}`);
}

export async function createRollout(
  payload: CreateRolloutPayload,
): Promise<RolloutApiItem> {
  return post<RolloutApiItem>("/rollouts", payload);
}

export async function startRollout(
  id: string,
): Promise<RolloutApiItem> {
  return post<RolloutApiItem>(`/rollouts/${id}/start`);
}

export async function cancelRollout(
  id: string,
): Promise<RolloutApiItem> {
  return post<RolloutApiItem>(`/rollouts/${id}/cancel`);
}

export async function retryRollout(
  id: string,
): Promise<RetryResponse> {
  return post<RetryResponse>(`/rollouts/${id}/retry`);
}

export async function getRolloutDevices(
  id: string,
  params?: { page?: number; limit?: number; status?: ExecutionStatus },
): Promise<RolloutDeviceListResponse> {
  return get<RolloutDeviceListResponse>(`/rollouts/${id}/devices`, {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getRolloutEligibility(
  id: string,
): Promise<EligibilityPreviewResponse> {
  return get<EligibilityPreviewResponse>(`/rollouts/${id}/eligibility`);
}

export async function getGroupEligibility(
  groupId: string,
  firmwarePackageId: string,
): Promise<EligibilityPreviewResponse> {
  return get<EligibilityPreviewResponse>(
    `/rollouts/eligibility/group/${groupId}/package/${firmwarePackageId}`,
  );
}
