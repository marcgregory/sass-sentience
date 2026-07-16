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
  getGroupDevices,
  removeDeviceFromGroup,
  addDeviceToGroup,
  bulkAssignTags,
  bulkRemoveTags,
  archiveGroup,
  restoreGroup,
  duplicateGroup,
  type DeviceGroupListParams,
  type CreateDeviceGroupPayload,
  type UpdateDeviceGroupPayload,
  type GroupDeviceListParams,
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

// ─── useGroupDevices ───────────────────────────────────────────────────────

/**
 * Fetch paginated devices belonging to a device group.
 * Replaces the client-side `useDevices(1)` pattern with a proper server-side
 * query that only returns devices in the group.
 */
export function useGroupDevices(
  groupId: string,
  params?: GroupDeviceListParams,
) {
  return useQuery({
    queryKey: queryKeys.deviceGroups.devices(
      groupId,
      params as Record<string, unknown>,
    ),
    queryFn: () => getGroupDevices(groupId, params),
    enabled: !!groupId,
  });
}

// ─── useRemoveDeviceFromGroup ─────────────────────────────────────────────

/**
 * Remove a device from a device group.
 * Invalidates group devices, device group membership, group detail, and
 * device detail caches to keep all views consistent.
 */
export function useRemoveDeviceFromGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, deviceId }: { groupId: string; deviceId: string }) =>
      removeDeviceFromGroup(groupId, deviceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(variables.deviceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroupMembership.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.detail(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
      // Invalidate all group device queries (any page/search combination)
      queryClient.invalidateQueries({ queryKey: ["deviceGroups", "devices", variables.groupId] });
    },
  });
}

// ─── useAddDeviceToGroup ─────────────────────────────────────────────────

/**
 * Add a device to a device group.
 * Invalidates the same cache family as removeDeviceFromGroup to keep all
 * relationship views consistent.
 */
export function useAddDeviceToGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, deviceId }: { groupId: string; deviceId: string }) =>
      addDeviceToGroup(groupId, deviceId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.detail(variables.deviceId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroupMembership.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.detail(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
      // Invalidate all group device queries (any page/search combination)
      queryClient.invalidateQueries({ queryKey: ["deviceGroups", "devices", variables.groupId] });
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

// ─── useBulkAssignTags ──────────────────────────────────────────────────

/**
 * Apply tags to all devices in a device group.
 * Server-side bulk operation — no client device enumeration.
 * Invalidates device list and group detail caches.
 */
export function useBulkAssignTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, tags }: { groupId: string; tags: string[] }) =>
      bulkAssignTags(groupId, tags),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.detail(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: ["deviceGroups", "devices", variables.groupId] });
    },
  });
}

// ─── useBulkRemoveTags ─────────────────────────────────────────────────

/**
 * Remove tags from all devices in a device group.
 * Server-side bulk operation — no client device enumeration.
 * Invalidates device list and group detail caches.
 */
export function useBulkRemoveTags() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ groupId, tags }: { groupId: string; tags: string[] }) =>
      bulkRemoveTags(groupId, tags),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.devices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.detail(variables.groupId) });
      queryClient.invalidateQueries({ queryKey: ["deviceGroups", "devices", variables.groupId] });
    },
  });
}

// ─── useArchiveGroup ────────────────────────────────────────────────────

/**
 * Archive (soft-delete) a device group.
 */
export function useArchiveGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => archiveGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}

// ─── useRestoreGroup ────────────────────────────────────────────────────

/**
 * Restore an archived device group.
 */
export function useRestoreGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => restoreGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}

// ─── useDuplicateGroup ─────────────────────────────────────────────────

/**
 * Duplicate a device group.
 * Returns the created group for immediate navigation.
 */
export function useDuplicateGroup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => duplicateGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.deviceGroups.all });
    },
  });
}
