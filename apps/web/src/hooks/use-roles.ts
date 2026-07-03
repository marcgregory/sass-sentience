/**
 * TanStack Query hooks for role data.
 *
 * useRoles         — list of all roles (shared with use-users.ts).
 * useRole          — single role detail with permissions.
 * useGrantPermission  — mutation to grant a permission to a role.
 * useRevokePermission — mutation to revoke a permission from a role.
 *
 * No live overlay needed — roles are administrative data and don't
 * arrive via Socket.IO.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getRole, grantPermission, revokePermission } from "@/lib/roles";
import { queryKeys } from "@/lib/query-keys";

// ─── useRole ───────────────────────────────────────────────────────────────

/**
 * Fetch a single role with its permissions by ID.
 */
export function useRole(id: string | undefined) {
  const query = useQuery({
    queryKey: queryKeys.roles.detail(id!),
    queryFn: () => getRole(id!),
    enabled: !!id,
  });

  return {
    role: query.data ?? null,
    permissions: query.data?.permissions ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useGrantPermission ───────────────────────────────────────────────────

/**
 * Grant a permission to a role. Invalidates the role detail on success.
 */
export function useGrantPermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      resource,
      action,
    }: {
      roleId: string;
      resource: string;
      action: string;
    }) => grantPermission(roleId, { resource, action }),
    onMutate: async ({ roleId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.roles.detail(roleId) });
      const previousData = queryClient.getQueryData(queryKeys.roles.detail(roleId));
      return { previousData };
    },
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.detail(roleId) });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.roles.all, context.previousData);
      }
    },
  });
}

// ─── useRevokePermission ──────────────────────────────────────────────────

/**
 * Revoke a permission from a role. Invalidates the role detail on success.
 */
export function useRevokePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      roleId,
      resource,
      action,
    }: {
      roleId: string;
      resource: string;
      action: string;
    }) => revokePermission(roleId, { resource, action }),
    onMutate: async ({ roleId }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.roles.detail(roleId) });
      const previousData = queryClient.getQueryData(queryKeys.roles.detail(roleId));
      return { previousData };
    },
    onSuccess: (_data, { roleId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.detail(roleId) });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.roles.all, context.previousData);
      }
    },
  });
}
