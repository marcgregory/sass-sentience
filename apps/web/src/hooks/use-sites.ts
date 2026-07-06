/**
 * TanStack Query hooks for site data.
 *
 * Provides list, detail, create, update, and delete hooks
 * with proper query key management and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getSites,
  getSite,
  createSite,
  updateSite,
  deleteSite,
  type SiteListParams,
  type CreateSitePayload,
  type UpdateSitePayload,
} from "@/lib/sites";

// ─── useSites ─────────────────────────────────────────────────────────────

export function useSites(params?: SiteListParams) {
  return useQuery({
    queryKey: queryKeys.sites.list(params?.estate_id, params as Record<string, unknown>),
    queryFn: () => getSites(params),
  });
}

// ─── useSite ──────────────────────────────────────────────────────────────

export function useSite(id: string) {
  return useQuery({
    queryKey: queryKeys.sites.detail(id),
    queryFn: () => getSite(id),
    enabled: !!id,
  });
}

// ─── useCreateSite ───────────────────────────────────────────────────────

export function useCreateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSitePayload) => createSite(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
    },
  });
}

// ─── useUpdateSite ───────────────────────────────────────────────────────

export function useUpdateSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSitePayload }) =>
      updateSite(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
    },
  });
}

// ─── useDeleteSite ───────────────────────────────────────────────────────

export function useDeleteSite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sites.all });
    },
  });
}
