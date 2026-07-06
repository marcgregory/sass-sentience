/**
 * Estate API functions.
 *
 * Provides typed functions for fetching estate data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface EstateApiItem {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  managerId: string | null;
  customerId: string;
  siteCount: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  faultCount: number;
  warningCount: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface EstateListResponse {
  data: EstateApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EstateListParams {
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export interface CreateEstatePayload {
  name: string;
  address: string;
  city: string;
  region: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
}

export interface UpdateEstatePayload {
  name?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

export async function getEstates(
  params?: EstateListParams,
): Promise<EstateListResponse> {
  return get<EstateListResponse>("/estates", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getEstate(
  id: string,
): Promise<EstateApiItem> {
  return get<EstateApiItem>(`/estates/${id}`);
}

export async function createEstate(
  payload: CreateEstatePayload,
): Promise<EstateApiItem> {
  return post<EstateApiItem>("/estates", payload);
}

export async function updateEstate(
  id: string,
  payload: UpdateEstatePayload,
): Promise<EstateApiItem> {
  return patch<EstateApiItem>(`/estates/${id}`, payload);
}

export async function deleteEstate(
  id: string,
): Promise<void> {
  return del<void>(`/estates/${id}`);
}
