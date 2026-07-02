/**
 * React hook for Socket.IO lifecycle and cache invalidation.
 *
 * Connects the socket on mount (when auth is available), subscribes to
 * rooms for the current user's scope, and wires server events to
 * TanStack Query cache invalidation.
 *
 * Usage: call `useSocket()` once in the dashboard layout. It handles
 * the full lifecycle — connect on mount, disconnect on unmount, and
 * invalidation in between.
 *
 * @see ADR-0003 — Socket.IO for Real-Time Events
 */

"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  subscribeRooms,
  type RoomSubscription,
} from "@/lib/socket-client";
import { queryKeys } from "@/lib/query-keys";

// ─── Event → Query Key Invalidation Map ────────────────────────────
//
// Each server event maps to the query keys that should be invalidated
// when the event fires. This is the single source of truth for the
// real-time → cache invalidation contract.

type QueryKeyArray = readonly unknown[];

type EventInvalidationMap = Record<
  string,
  (payload: Record<string, unknown>) => QueryKeyArray | QueryKeyArray[]
>;

const eventToKeys: EventInvalidationMap = {
  "device:status": () => queryKeys.devices.all,
  "device:telemetry": (p) => queryKeys.devices.detail(p.deviceId as string),
  "device:diagnostic": (p) => queryKeys.devices.diagnostics(p.deviceId as string),
  "alert:created": () => queryKeys.alerts.all,
  "alert:updated": () => queryKeys.alerts.all,
  "event:new": (p) =>
    p.deviceId
      ? [...queryKeys.events.all, queryKeys.devices.detail(p.deviceId as string)]
      : queryKeys.events.all,
  "estate:updated": () => queryKeys.estates.all,
  "site:updated": () => queryKeys.sites.all,
  "kpi:updated": (p) => queryKeys.dashboard.kpis(p.estateId as string | undefined),
};

// ─── Hook ──────────────────────────────────────────────────────────

interface UseSocketOptions {
  /**
   * Rooms to subscribe to once connected.
   * Typically derived from the user's authorized estates/sites.
   */
  rooms?: RoomSubscription[];
}

export function useSocket(options: UseSocketOptions = {}): void {
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const subscribedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    // Connect with auth token
    connectSocket(token);
    const socket = getSocket();

    // Subscribe to rooms
    if (options.rooms && options.rooms.length > 0 && !subscribedRef.current) {
      subscribeRooms(options.rooms);
      subscribedRef.current = true;
    }

    // Wire event handlers for cache invalidation
    const handlers: Array<() => void> = [];

    for (const [event, getKeys] of Object.entries(eventToKeys)) {
      const handler = (payload: Record<string, unknown>) => {
        const keys = getKeys(payload);
        const keyArray = Array.isArray(keys) ? keys : [keys];
        for (const k of keyArray) {
          queryClient.invalidateQueries({ queryKey: k });
        }
      };
      // Need to cast because the event names are typed — the mapping dict
      // guarantees the payload shapes match at runtime via the server contract.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      socket.on(event as any, handler);
      handlers.push(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        socket.off(event as any, handler);
      });
    }

    // Handle notification events separately — they feed the Zustand store
    // for instant UI updates, not just cache invalidation.
    const notificationHandler = (payload: { notificationId: string; title: string; message: string; priority: string; timestamp: string }) => {
      // Dynamic import to avoid circular dependency
      import("@/stores/notification-store").then(({ useNotificationStore }) => {
        useNotificationStore.getState().setNotifications([
          {
            id: payload.notificationId,
            userId: "",
            title: payload.title,
            message: payload.message,
            priority: payload.priority as "low" | "normal" | "high" | "critical",
            category: "alert",
            isRead: false,
            link: undefined,
            createdAt: payload.timestamp,
          },
          ...useNotificationStore.getState().notifications,
        ]);
      });
    };
    socket.on("notification:new" as any, notificationHandler);
    handlers.push(() => {
      socket.off("notification:new" as any, notificationHandler);
    });

    return () => {
      for (const off of handlers) off();
      disconnectSocket();
      subscribedRef.current = false;
    };
  }, [isAuthenticated, token, queryClient, options.rooms]);
}
