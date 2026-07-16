/**
 * TanStack Query hooks for device group data.
 *
 * Provides list, detail, create, update, and delete hooks
 * with proper query key management and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getDeviceGroups,
  getDeviceGroup,
  createDeviceGroup,
  updateDeviceGroup,
  deleteDeviceGroup,
  type DeviceGroupListParams,
  type CreateDeviceGroupPayload,
  type UpdateDeviceGroupPayload,
} from "@/lib/device-groups";

// ─── useDeviceGroups ───────────────────────────────────────────────────────

export function useDeviceGroups(params?: DeviceGroupListParams) {
  return useQuery({
    queryKey: queryKeys.deviceGroups.list(params as Record<string, unknown>),
    queryFn: () => getDeviceGroups(params),
  });
}

// ─── useDeviceGroup ────────────────────────────────────────────────────────

export function useDeviceGroup(id: string) {
  return useQuery({
    queryKey: queryKeys.deviceGroups.detail(id),
    queryFn: () => getDeviceGroup(id),
    enabled: !!id,
  });
}

// ─── useCreateDeviceGroup ─────────────────────────────────────────────────

export function useCreateDeviceGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDeviceGroupPayload) => createDeviceGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}

// ─── useUpdateDeviceGroup ─────────────────────────────────────────────────

export function useUpdateDeviceGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateDeviceGroupPayload }) =>
      updateDeviceGroup(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}

// ─── useDeleteDeviceGroup ─────────────────────────────────────────────────

export function useDeleteDeviceGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteDeviceGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}
