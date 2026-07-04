/**
 * Notification API functions.
 *
 * Provides typed functions for fetching and mutating notification data
 * from the backend API. Used by TanStack Query hooks — never call these
 * directly from components.
 */

import { get, patch } from "./api-client";
import type { Notification, NotificationPriority, NotificationCategory } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface NotificationListResponse {
  data: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface UpdateCountResponse {
  updatedCount: number;
}

export interface NotificationsParams {
  is_read?: string;
  category?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated notification list for the current user.
 * Supports filtering by read status, category, and priority.
 */
export async function getNotifications(
  params?: NotificationsParams,
): Promise<NotificationListResponse> {
  return get<NotificationListResponse>("/notifications", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch unread notification count for the current user.
 */
export async function getUnreadCount(): Promise<UnreadCountResponse> {
  return get<UnreadCountResponse>("/notifications/unread-count");
}

/**
 * Fetch a single notification by ID (scoped to current user).
 */
export async function getNotification(
  id: string,
): Promise<Notification> {
  return get<Notification>(`/notifications/${id}`);
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(
  id: string,
): Promise<Notification> {
  return patch<Notification>(`/notifications/${id}/read`);
}

/**
 * Mark all notifications as read for the current user.
 */
export async function markAllNotificationsRead(): Promise<UpdateCountResponse> {
  return patch<UpdateCountResponse>("/notifications/read-all");
}
