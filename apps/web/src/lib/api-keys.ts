/**
 * API Key API functions.
 *
 * Provides typed functions for managing API keys from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del } from "./api-client";
import type { ApiKey, ApiKeyStatus } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface ApiKeyListResponse {
  data: ApiKeyListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/** API key as returned by list/get endpoints (no fullKey) */
export interface ApiKeyListItem {
  id: string;
  name: string;
  maskedKey: string;
  status: ApiKeyStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  requestCount: number;
}

/** API key create response — includes the full key shown only once */
export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  maskedKey: string;
  status: ApiKeyStatus;
  createdBy: string;
  createdAt: string;
  expiresAt: string | null;
  fullKey: string;
  message: string;
}

/** Payload for creating a new API key */
export interface CreateApiKeyPayload {
  name: string;
  expiresAt?: string;
}

/** Payload for updating an API key (rename or revoke) */
export interface UpdateApiKeyPayload {
  name?: string;
  status?: ApiKeyStatus;
}

export interface ApiKeysParams {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated list of API keys (admin only).
 * Supports filtering by status and text search.
 */
export async function getApiKeys(
  params?: ApiKeysParams,
): Promise<ApiKeyListResponse> {
  return get<ApiKeyListResponse>("/api-keys", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single API key by ID (admin only).
 */
export async function getApiKey(
  id: string,
): Promise<ApiKeyListItem> {
  return get<ApiKeyListItem>(`/api-keys/${id}`);
}

/**
 * Create a new API key (admin only).
 * Returns the full key only on creation — it cannot be retrieved later.
 */
export async function createApiKey(
  payload: CreateApiKeyPayload,
): Promise<ApiKeyCreateResponse> {
  return post<ApiKeyCreateResponse>("/api-keys", payload);
}

/**
 * Update an API key (admin only) — rename or change status (revoke/expire).
 */
export async function updateApiKey(
  id: string,
  payload: UpdateApiKeyPayload,
): Promise<ApiKeyListItem> {
  return patch<ApiKeyListItem>(`/api-keys/${id}`, payload);
}

/**
 * Delete an API key (admin only).
 */
export async function deleteApiKey(
  id: string,
): Promise<void> {
  return del<void>(`/api-keys/${id}`);
}
