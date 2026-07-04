/**
 * TanStack Query hooks for notification rule data.
 *
 * useNotificationRules    — fetch all notification rules (admin only).
 * useUpdateNotificationRule — mutation that patches a rule on the backend.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotificationRules,
  updateNotificationRule,
} from "@/lib/notification-rules";
import type { NotificationRuleUpdate } from "@sentience/types";
import { queryKeys } from "@/lib/query-keys";

// ─── useNotificationRules ─────────────────────────────────────────────────

/**
 * Fetch all notification rules (admin only).
 */
export function useNotificationRules() {
  return useQuery({
    queryKey: queryKeys.notificationRules.list(),
    queryFn: () => getNotificationRules(),
  });
}

// ─── useUpdateNotificationRule ────────────────────────────────────────────

/**
 * Update a single notification rule (admin only).
 * Invalidates the rules list on success so the UI stays in sync.
 */
export function useUpdateNotificationRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: NotificationRuleUpdate }) =>
      updateNotificationRule(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notificationRules.all });
    },
  });
}
