/**
 * Notification Rule API functions.
 *
 * Provides typed functions for fetching and updating notification rules
 * from the backend API. Used by TanStack Query hooks — never call these
 * directly from components.
 */

import { get, patch } from "./api-client";
import type { NotificationRule, NotificationRuleUpdate } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface NotificationRuleListResponse {
  data: NotificationRule[];
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch all notification rules (admin only).
 */
export async function getNotificationRules(): Promise<NotificationRuleListResponse> {
  return get<NotificationRuleListResponse>("/notification-rules");
}

/**
 * Fetch a single notification rule by ID.
 */
export async function getNotificationRule(
  id: string,
): Promise<NotificationRule> {
  return get<NotificationRule>(`/notification-rules/${id}`);
}

/**
 * Update a notification rule (admin only).
 * Accepts partial updates — only changed fields need to be sent.
 */
export async function updateNotificationRule(
  id: string,
  payload: NotificationRuleUpdate,
): Promise<NotificationRule> {
  return patch<NotificationRule>(`/notification-rules/${id}`, payload);
}
