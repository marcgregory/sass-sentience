/**
 * TanStack Query hooks for event data.
 *
 * useEvents — paginated event list from API, merged with live Socket.IO events.
 * useEvent  — single event detail from API.
 *
 * Live (socket) events are prepended to the API history list and deduplicated
 * by eventId so they appear instantly without waiting for a refetch.
 * Events that only exist in the live feed (no API match) remain visible.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getEvents, getEvent } from "@/lib/events";
import type { EventApiItem, EventDisplayRow } from "@/lib/events";
import { queryKeys } from "@/lib/query-keys";
import { useLiveDeviceStore, type LiveEventEntry } from "@/stores/live-device-store";

// ─── Types ────────────────────────────────────────────────────────────────

export interface UseEventsOptions {
  severity?: string;
  category?: string;
  deviceId?: string;
  estateId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// ─── Mappers ──────────────────────────────────────────────────────────────

/**
 * Map an API event item to the display row shape the page expects.
 */
function mapApiEventToRow(e: EventApiItem): EventDisplayRow {
  return {
    eventId: e.id,
    title: e.title,
    description: e.description,
    severity: e.severity,
    category: e.category,
    deviceId: e.deviceId ?? undefined,
    siteId: e.siteId ?? undefined,
    estateId: e.estateId ?? undefined,
    userId: e.userId ?? undefined,
    timestamp: e.occurredAt,
  };
}

/**
 * Map a live store event to the display row shape.
 */
function mapLiveEventToRow(e: LiveEventEntry): EventDisplayRow {
  return {
    eventId: e.eventId,
    title: e.title,
    description: undefined,
    severity: e.severity,
    category: e.category,
    deviceId: e.deviceId,
    siteId: e.siteId,
    siteName: e.siteName,
    estateId: e.estateId,
    estateName: e.estateName,
    timestamp: e.timestamp,
  };
}

// ─── useEvents ────────────────────────────────────────────────────────────

/**
 * Fetch events from the API and merge live socket events on top.
 *
 * API events form the history baseline. Live events from the Zustand store
 * are prepended and deduplicated so they appear instantly.
 * Events that only exist in the live feed (not yet persisted) remain visible.
 */
export function useEvents(options: UseEventsOptions = {}) {
  const { severity, category, deviceId, estateId, search, startDate, endDate, page = 1, limit = 100 } = options;

  // Build API params from filter options
  const apiParams = useMemo(() => {
    const params: Record<string, string | number | boolean | undefined> = {};
    if (severity && severity !== "all") params.severity = severity;
    if (category && category !== "all") params.category = category;
    if (deviceId && deviceId !== "all") params.device_id = deviceId;
    if (estateId) params.estate_id = estateId;
    if (search) params.search = search;
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    params.page = page;
    params.limit = limit;
    return params;
  }, [severity, category, deviceId, estateId, search, startDate, endDate, page, limit]);

  const query = useQuery({
    queryKey: queryKeys.events.list(apiParams),
    queryFn: () => getEvents(apiParams),
  });

  const storeEvents = useLiveDeviceStore((s) => s.recentEvents);

  // Merge API events with live overlay
  const events = useMemo<EventDisplayRow[]>(() => {
    const apiData = query.data?.data ?? [];
    const liveIds = new Set(storeEvents.map((e) => e.eventId));
    const seenIds = new Set<string>();
    const merged: EventDisplayRow[] = [];

    // 1. Live events first (most recent at the beginning)
    for (const live of storeEvents) {
      if (seenIds.has(live.eventId)) continue;
      seenIds.add(live.eventId);
      merged.push(mapLiveEventToRow(live));
    }

    // 2. API events that aren't already covered by live events
    for (const api of apiData) {
      if (seenIds.has(api.id)) continue;
      seenIds.add(api.id);
      merged.push(mapApiEventToRow(api));
    }

    return merged;
  }, [query.data, storeEvents]);

  const total = query.data?.pagination?.total ?? 0;

  return {
    events,
    total,
    apiTotal: total,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}

// ─── useEvent ─────────────────────────────────────────────────────────────

/**
 * Fetch a single event by ID from the API.
 * Returns the raw API response for the event detail panel.
 */
export function useEvent(id: string) {
  const query = useQuery({
    queryKey: queryKeys.events.detail?.(id) ?? ["events", "detail", id],
    queryFn: () => getEvent(id),
    enabled: !!id,
  });

  return {
    event: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
