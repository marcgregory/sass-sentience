/**
 * TanStack Query hooks for API key data.
 *
 * useApiKeys              — paginated API key list (admin only).
 * useCreateApiKey         — mutation with optimistic add.
 * useRevokeApiKey         — mutation to revoke (soft-delete via status change).
 * useDeleteApiKey         — mutation to permanently delete.
 */

import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getApiKeys,
  createApiKey,
  updateApiKey,
  deleteApiKey,
} from "@/lib/api-keys";
import type { CreateApiKeyPayload } from "@/lib/api-keys";
import { queryKeys } from "@/lib/query-keys";

// ─── useApiKeys ───────────────────────────────────────────────────────────

export interface UseApiKeysOptions {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated API key list (admin only).
 * Supports filtering by status and text search.
 */
export function useApiKeys(options: UseApiKeysOptions = {}) {
  const { status, search, page = 1, limit = 20 } = options;

  const params = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {};
    if (status) p.status = status;
    if (search) p.search = search;
    p.page = page;
    p.limit = limit;
    return p;
  }, [status, search, page, limit]);

  return useQuery({
    queryKey: queryKeys.apiKeys.list(params),
    queryFn: () => getApiKeys(params),
  });
}

// ─── useCreateApiKey ──────────────────────────────────────────────────────

/**
 * Create a new API key (admin only).
 * Invalidates the keys list on success.
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateApiKeyPayload) => createApiKey(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

// ─── useRevokeApiKey ──────────────────────────────────────────────────────

/**
 * Revoke an API key by setting its status to "revoked" (admin only).
 * Uses PATCH so the key record is preserved.
 */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      updateApiKey(id, { status: "revoked" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}

// ─── useDeleteApiKey ──────────────────────────────────────────────────────

/**
 * Permanently delete an API key (admin only).
 * Hard delete from the database.
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys.all });
    },
  });
}
