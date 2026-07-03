/**
 * Role API functions.
 *
 * Provides typed functions for fetching role data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, del } from "./api-client";
import type { UserRole } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface RoleApiItem {
  id: string;
  name: UserRole;
  label: string;
  description: string;
}

export interface PermissionApiItem {
  id: string;
  resource: string;
  action: string;
}

export interface RoleDetailResponse {
  id: string;
  name: UserRole;
  label: string;
  description: string;
  permissions: PermissionApiItem[];
}

export interface RoleListResponse {
  data: RoleApiItem[];
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch the list of all available roles.
 */
export async function getRoles(): Promise<RoleListResponse> {
  return get<RoleListResponse>("/roles");
}

/**
 * Fetch a single role with its permissions.
 */
export async function getRole(id: string): Promise<RoleDetailResponse> {
  return get<RoleDetailResponse>(`/roles/${id}`);
}

/**
 * Grant a permission to a role.
 */
export async function grantPermission(
  roleId: string,
  payload: { resource: string; action: string },
): Promise<PermissionApiItem> {
  return post<PermissionApiItem>(`/roles/${roleId}/permissions`, payload);
}

/**
 * Revoke a permission from a role.
 */
export async function revokePermission(
  roleId: string,
  payload: { resource: string; action: string },
): Promise<void> {
  return del<void>(`/roles/${roleId}/permissions`, {
    params: { resource: payload.resource, action: payload.action },
  });
}
