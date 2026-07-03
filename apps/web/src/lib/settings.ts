/**
 * Settings API functions.
 *
 * Provides typed functions for fetching and updating platform settings
 * from the backend API. Settings are stored as key-value pairs with
 * JSONB values and a category field.
 *
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, patch } from "./api-client";

// ─── API Response Types ───────────────────────────────────────────────────

export interface SettingApiItem {
  id: string;
  key: string;
  value: unknown;
  category: string;
  description: string | null;
  updatedAt: string;
}

export interface SettingListResponse {
  data: SettingApiItem[];
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch all platform settings from the backend.
 */
export async function getSettings(): Promise<SettingListResponse> {
  return get<SettingListResponse>("/settings");
}

/**
 * Update a single setting by key.
 */
export async function updateSetting(
  key: string,
  value: unknown,
): Promise<SettingApiItem> {
  return patch<SettingApiItem>(`/settings/${key}`, { value });
}
