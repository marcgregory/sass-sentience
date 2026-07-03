/**
 * Event API functions.
 *
 * Provides typed functions for fetching event data from the backend API.
 * Used by TanStack Query hooks — never call these directly from components.
 */

import { get } from "./api-client";
import type { EventSeverity, EventCategory } from "@sentience/types";

// ─── API Response Types ───────────────────────────────────────────────────

export interface EventApiItem {
  id: string;
  title: string;
  description: string;
  severity: EventSeverity;
  category: string;
  deviceId: string | null;
  siteId: string | null;
  estateId: string | null;
  customerId: string | null;
  userId: string | null;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
  createdAt: string;
}

export interface EventListResponse {
  data: EventApiItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventsParams {
  severity?: string;
  category?: string;
  device_id?: string;
  estate_id?: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sort?: string;
  order?: string;
}

// ─── API Functions ────────────────────────────────────────────────────────

/**
 * Fetch paginated event list from the backend.
 * Supports server-side filtering, search, and pagination.
 */
export async function getEvents(
  params?: EventsParams,
): Promise<EventListResponse> {
  return get<EventListResponse>("/events", {
    params: params as Record<string, string | number | boolean | undefined>,
  });
}

/**
 * Fetch a single event by ID.
 */
export async function getEvent(
  id: string,
): Promise<EventApiItem> {
  return get<EventApiItem>(`/events/${id}`);
}

// ─── Display Row Type ─────────────────────────────────────────────────────

export interface EventDisplayRow {
  eventId: string;
  title: string;
  description?: string;
  severity: string;
  category: string;
  deviceId?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  userId?: string;
  timestamp: string;
}
