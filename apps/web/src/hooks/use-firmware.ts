/**
 * TanStack Query hooks for firmware package and rollout data.
 *
 * Provides list, detail, create, and lifecycle mutation hooks
 * with proper query key management and cache invalidation.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import {
  getFirmwarePackages,
  getFirmwarePackage,
  createFirmwarePackage,
  deleteFirmwarePackage,
  getRollouts,
  getRollout,
  createRollout,
  startRollout,
  cancelRollout,
  retryRollout,
  getRolloutDevices,
  type FirmwarePackageListParams,
  type CreateFirmwarePackagePayload,
  type RolloutListParams,
  type CreateRolloutPayload,
  type ExecutionStatus,
} from "@/lib/firmware";

// ─── Firmware Package Hooks ─────────────────────────────────────────────────

export function useFirmwarePackages(params?: FirmwarePackageListParams) {
  return useQuery({
    queryKey: queryKeys.firmware.list(params as Record<string, unknown>),
    queryFn: () => getFirmwarePackages(params),
  });
}

export function useFirmwarePackage(id: string) {
  return useQuery({
    queryKey: queryKeys.firmware.detail(id),
    queryFn: () => getFirmwarePackage(id),
    enabled: !!id,
  });
}

export function useCreateFirmwarePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFirmwarePackagePayload) => createFirmwarePackage(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.firmware.all });
    },
  });
}

export function useDeleteFirmwarePackage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFirmwarePackage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.firmware.all });
    },
  });
}

// ─── Rollout Hooks ──────────────────────────────────────────────────────────

export function useRollouts(params?: RolloutListParams) {
  return useQuery({
    queryKey: queryKeys.rollouts.list(params as Record<string, unknown>),
    queryFn: () => getRollouts(params),
  });
}

export function useRollout(id: string) {
  return useQuery({
    queryKey: queryKeys.rollouts.detail(id),
    queryFn: () => getRollout(id),
    enabled: !!id,
  });
}

export function useCreateRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRolloutPayload) => createRollout(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.all });
    },
  });
}

export function useStartRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => startRollout(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.all });
    },
  });
}

export function useCancelRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => cancelRollout(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.all });
    },
  });
}

export function useRetryRollout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => retryRollout(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.rollouts.devices(id) });
    },
  });
}

export function useRolloutDevices(
  rolloutId: string,
  params?: { page?: number; limit?: number; status?: ExecutionStatus },
) {
  return useQuery({
    queryKey: queryKeys.rollouts.devices(rolloutId, params as Record<string, unknown>),
    queryFn: () => getRolloutDevices(rolloutId, params),
    enabled: !!rolloutId,
  });
}
