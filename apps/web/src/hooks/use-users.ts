/**
 * TanStack Query hooks for user data.
 *
 * useUsers        — paginated user list from API with search/filter support.
 * useUser         — single user detail from API.
 * useRoles        — list of all roles for dropdowns.
 * useCreateUser   — mutation to create a new user.
 * useUpdateUser   — mutation to update an existing user.
 * useDeactivateUser — mutation to soft-delete a user.
 *
 * No live overlay needed — users are administrative data and don't
 * arrive via Socket.IO.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUsers, getUser, createUser, updateUser, deactivateUser } from "@/lib/users";
import { getRoles } from "@/lib/roles";
import type { CreateUserPayload, UpdateUserPayload } from "@/lib/users";
import { queryKeys } from "@/lib/query-keys";

// ─── useUsers ─────────────────────────────────────────────────────────────

export interface UseUsersOptions {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

/**
 * Fetch paginated user list from the API with server-side filtering.
 */
export function useUsers(options: UseUsersOptions = {}) {
  const { search, role, status, page = 1, limit = 20, sort, order } = options;

  const apiParams: Record<string, unknown> = { page, limit };
  if (search) apiParams.search = search;
  if (role && role !== "all") apiParams.role = role;
  if (status && status !== "all") apiParams.status = status;
  if (sort) apiParams.sort = sort;
  if (order) apiParams.order = order;

  const query = useQuery({
    queryKey: queryKeys.users.list(apiParams),
    queryFn: () => getUsers(apiParams),
  });

  return {
    users: query.data?.data ?? [],
    total: query.data?.pagination?.total ?? 0,
    totalPages: query.data?.pagination?.totalPages ?? 0,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useUser ──────────────────────────────────────────────────────────────

/**
 * Fetch a single user by ID from the API.
 */
export function useUser(id: string) {
  const query = useQuery({
    queryKey: queryKeys.users.detail(id),
    queryFn: () => getUser(id),
    enabled: !!id,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useRoles ─────────────────────────────────────────────────────────────

/**
 * Fetch the list of all roles.
 */
export function useRoles() {
  const query = useQuery({
    queryKey: queryKeys.roles.list(),
    queryFn: () => getRoles(),
    staleTime: 300_000, // roles rarely change — cache 5 min
  });

  return {
    roles: query.data?.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── Mutations ───────────────────────────────────────────────────────────

/**
 * Create a new user. Invalidates user list on success.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previousData = queryClient.getQueryData(queryKeys.users.list());
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.users.list(), context.previousData);
      }
    },
  });
}

/**
 * Update an existing user. Invalidates user list and detail on success.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previousData = queryClient.getQueryData(queryKeys.users.list());
      const previousDetail = queryClient.getQueryData(queryKeys.users.detail(id));
      return { previousData, previousDetail };
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(id) });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.users.list(), context.previousData);
      }
    },
  });
}

/**
 * Deactivate (soft-delete) a user. Invalidates user list on success.
 */
export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateUser(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.users.all });
      const previousData = queryClient.getQueryData(queryKeys.users.list());
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.users.list(), context.previousData);
      }
    },
  });
}
