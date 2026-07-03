/**
 * TanStack Query hooks for settings data.
 *
 * useSettings      — fetches all platform settings from the API.
 * useUpdateSetting — mutation to update a single setting.
 *
 * No live overlay needed — settings are administrative data and don't
 * arrive via Socket.IO. Mutations invalidate the full settings cache.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateSetting } from "@/lib/settings";
import { queryKeys } from "@/lib/query-keys";

// ─── useSettings ─────────────────────────────────────────────────────────

/**
 * Fetch all platform settings from the API.
 * Returns a key-value map for easy lookup and a raw list for iteration.
 */
export function useSettings() {
  const query = useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => getSettings(),
    staleTime: 60_000, // settings rarely change — cache 1 min
  });

  const settings = query.data?.data ?? [];

  // Convenience: find a setting by key
  const get = (key: string) => settings.find((s) => s.key === key);

  return {
    settings,
    get,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

// ─── useUpdateSetting ─────────────────────────────────────────────────────

/**
 * Update a single platform setting. Invalidates the full settings list
 * on success so all consumers see the new value.
 */
export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) =>
      updateSetting(key, value),
    onMutate: async ({ key, value }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.all });
      const previousData = queryClient.getQueryData(queryKeys.settings.all);
      // Optimistically update the cache
      queryClient.setQueryData(queryKeys.settings.all, (old: unknown) => {
        if (!old || typeof old !== "object") return old;
        const rec = old as { data?: Array<Record<string, unknown>> };
        if (!rec.data) return old;
        return {
          ...rec,
          data: rec.data.map((s) =>
            s.key === key ? { ...s, value } : s,
          ),
        };
      });
      return { previousData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all });
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.settings.all, context.previousData);
      }
    },
  });
}
