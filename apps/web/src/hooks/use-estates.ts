/**
 * TanStack Query hooks for estate data.
 *
 * Provides list, detail, create, update, and delete hooks
 * with proper query key management and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getEstates,
  getEstate,
  createEstate,
  updateEstate,
  deleteEstate,
  type EstateListParams,
  type CreateEstatePayload,
  type UpdateEstatePayload,
} from "@/lib/estates";

// ─── useEstates ───────────────────────────────────────────────────────────

export function useEstates(params?: EstateListParams) {
  return useQuery({
    queryKey: queryKeys.estates.list(params as Record<string, unknown>),
    queryFn: () => getEstates(params),
  });
}

// ─── useEstate ────────────────────────────────────────────────────────────

export function useEstate(id: string) {
  return useQuery({
    queryKey: queryKeys.estates.detail(id),
    queryFn: () => getEstate(id),
    enabled: !!id,
  });
}

// ─── useCreateEstate ─────────────────────────────────────────────────────

export function useCreateEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateEstatePayload) => createEstate(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estates.all });
    },
  });
}

// ─── useUpdateEstate ─────────────────────────────────────────────────────

export function useUpdateEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEstatePayload }) =>
      updateEstate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estates.all });
    },
  });
}

// ─── useDeleteEstate ─────────────────────────────────────────────────────

export function useDeleteEstate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteEstate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.estates.all });
    },
  });
}
