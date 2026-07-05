/**
 * TanStack Query hooks for notification data.
 *
 * useNotifications           — paginated notification list from API.
 * useNotificationUnreadCount — unread count for header badge, synced to Zustand store.
 * useMarkNotificationRead    — mutation with optimistic update.
 * useMarkAllNotificationsRead — mutation with optimistic update.
 */

import { useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import { queryKeys } from "@/lib/query-keys";
import { useNotificationStore } from "@/stores/notification-store";
import type { Notification } from "@sentience/types";

// ─── useNotifications ─────────────────────────────────────────────────────

export interface UseNotificationsOptions {
  isRead?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

/**
 * Fetch paginated notifications for the current user.
 * Supports filtering by read status, category, and priority.
 */
export function useNotifications(options: UseNotificationsOptions = {}) {
  const { isRead, category, priority, page = 1, limit = 20 } = options;

  const params = useMemo(() => {
    const p: Record<string, string | number | boolean | undefined> = {};
    if (isRead !== undefined) p.is_read = isRead;
    if (category) p.category = category;
    if (priority) p.priority = priority;
    p.page = page;
    p.limit = limit;
    return p;
  }, [isRead, category, priority, page, limit]);

  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => getNotifications(params),
  });
}

// ─── useNotificationUnreadCount ───────────────────────────────────────────

/**
 * Fetch the unread notification count for the current user.
 * Syncs the result into the Zustand store so the header badge
 * and other components can read it without re-rendering on every query change.
 *
 * When Simulation Mode is active, the API unread count and simulated in-memory
 * unread count are combined so the badge reflects both sources.
 */
export function useNotificationUnreadCount() {
  const setUnreadCount = useNotificationStore((s) => s.setUnreadCount);
  const storeNotifications = useNotificationStore((s) => s.notifications);

  const query = useQuery({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: async () => {
      const result = await getUnreadCount();
      return result.unreadCount;
    },
    refetchInterval: 30_000, // Poll every 30s as safety net
  });

  // Sync query result to Zustand store — include simulated unread count
  useEffect(() => {
    if (query.data !== undefined) {
      // Count simulated notifications that haven't been marked read
      const simulatedUnread = storeNotifications.filter(
        (n): n is Notification & { isSimulated: boolean } =>
          "isSimulated" in n && n.isSimulated === true && !n.isRead,
      ).length;

      setUnreadCount(query.data + simulatedUnread);
    }
  }, [query.data, setUnreadCount, storeNotifications]);

  return query;
}

// ─── useNotificationUnread (store-first) ──────────────────────────────────

/**
 * Read the unread count from the Zustand store.
 * This is the primary way for UI components to get the count —
 * it updates instantly after mark-read mutations without waiting
 * for a server round-trip.
 */
export function useNotificationUnread() {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return unreadCount;
}

// ─── useMarkNotificationRead ──────────────────────────────────────────────

/**
 * Mark a single notification as read.
 * Optimistically decrements the unread count in the Zustand store.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  const markAsRead = useNotificationStore((s) => s.markAsRead);

  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onMutate: async (id) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Optimistically update the store
      markAsRead(id);

      // Snapshot previous query data for rollback
      const previousList = queryClient.getQueryData(queryKeys.notifications.list());
      return { previousList };
    },
    onError: (_err, _id, context) => {
      // Rollback on error — refetch will correct the store
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

// ─── useMarkAllNotificationsRead ────────────────────────────────────────────

/**
 * Mark all notifications as read for the current user.
 * Optimistically clears the unread count in the Zustand store.
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);

  return useMutation({
    mutationFn: () => markAllNotificationsRead(),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.all });

      // Optimistically clear all
      markAllAsRead();

      // Snapshot for rollback
      const previousList = queryClient.getQueryData(queryKeys.notifications.list());
      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(queryKeys.notifications.list(), context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
