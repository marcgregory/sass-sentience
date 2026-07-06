/**
 * Site API functions.
 *
 * Provides typed functions for fetching site data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface SiteApiItem {
  id: string;
  name: string;
  estateId: string;
  estateName: string | null;
  address: string;
  buildingCount: number;
  floorCount: number;
  roomCount: number;
  deviceCount: number;
  onlineCount: number;
  offlineCount: number;
  faultCount: number;
  warningCount: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface SiteListResponse {
  data: SiteApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SiteListParams {
  estate_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

export interface CreateSitePayload {
  name: string;
  estateId: string;
  address: string;
  buildingCount?: number;
  floorCount?: number;
  roomCount?: number;
}

export interface UpdateSitePayload {
  name?: string;
  address?: string;
  buildingCount?: number;
  floorCount?: number;
  roomCount?: number;
}

// ─── API Functions ────────────────────────────────────────────────────────

export async function getSites(
  params?: SiteListParams,
): Promise<SiteListResponse> {
  return get<SiteListResponse>("/sites", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

export async function getSite(
  id: string,
): Promise<SiteApiItem> {
  return get<SiteApiItem>(`/sites/${id}`);
}

export async function createSite(
  payload: CreateSitePayload,
): Promise<SiteApiItem> {
  return post<SiteApiItem>("/sites", payload);
}

export async function updateSite(
  id: string,
  payload: UpdateSitePayload,
): Promise<SiteApiItem> {
  return patch<SiteApiItem>(`/sites/${id}`, payload);
}

export async function deleteSite(
  id: string,
): Promise<void> {
  return del<void>(`/sites/${id}`);
}
