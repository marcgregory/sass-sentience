/**
 * User API functions.
 *
 * Provides typed functions for fetching and mutating user data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get, post, patch, del } from "./api-client";
import type { UserRole } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface UserApiItem {
  id: string;
  email: string;
  name: string;
  avatar: string | null;
  roleId: string;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  customerId: string | null;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserListResponse {
  data: UserApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UsersParams {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

// ─── Mutation Types ───────────────────────────────────────────────────────

export interface CreateUserPayload {
  email: string;
  password: string;
  name: string;
  roleId: string;
  customerId?: string;
  avatar?: string;
}

export interface UpdateUserPayload {
  name?: string;
  roleId?: string;
  isActive?: boolean;
  avatar?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated user list from the backend.
 * Supports server-side filtering by search, role, and status.
 */
export async function getUsers(
  params?: UsersParams,
): Promise<UserListResponse> {
  return get<UserListResponse>("/users", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single user by ID.
 */
export async function getUser(
  id: string,
): Promise<UserApiItem> {
  return get<UserApiItem>(`/users/${id}`);
}

/**
 * Create a new user.
 */
export async function createUser(
  payload: CreateUserPayload,
): Promise<UserApiItem> {
  return post<UserApiItem>("/users", payload);
}

/**
 * Update an existing user.
 */
export async function updateUser(
  id: string,
  payload: UpdateUserPayload,
): Promise<UserApiItem> {
  return patch<UserApiItem>(`/users/${id}`, payload);
}

/**
 * Deactivate (soft-delete) a user.
 */
export async function deactivateUser(
  id: string,
): Promise<{ id: string; isActive: boolean }> {
  return del<{ id: string; isActive: boolean }>(`/users/${id}`);
}
