/**
 * React hook for Socket.IO lifecycle, cache invalidation, and live store updates.
 *
 * Connects the socket on mount (when auth is available), subscribes to
 * rooms for the current user's scope, wires server events to TanStack Query
 * cache invalidation, and updates the live device store for instant UI updates.
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
import { useLiveDeviceStore } from "@/stores/live-device-store";
import { useLiveAlertStore } from "@/stores/live-alert-store";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  subscribeRooms,
  type RoomSubscription,
  type DeviceStatusEvent,
  type DeviceTelemetryEvent,
  type EventStreamEvent,
  type AlertEvent,
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
  "simulator:reset": () => [
    queryKeys.devices.all,
    queryKeys.alerts.all,
    queryKeys.events.all,
    queryKeys.dashboard.kpis(undefined),
  ],
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
    // Use a debounce timer to batch rapid events (telemetry storm) into single invalidations.
    const handlers: Array<() => void> = [];
    let invalidateTimer: ReturnType<typeof setTimeout> | null = null;
    const pendingKeys = new Set<string>();

    for (const [event, getKeys] of Object.entries(eventToKeys)) {
      const handler = (payload: Record<string, unknown>) => {
        const keys = getKeys(payload);
        const keyArray = Array.isArray(keys) ? keys : [keys];
        for (const k of keyArray) {
          pendingKeys.add(JSON.stringify(k));
        }
        // Debounce: flush all pending invalidations after 100ms of inactivity
        if (invalidateTimer) clearTimeout(invalidateTimer);
        invalidateTimer = setTimeout(() => {
          for (const keyStr of pendingKeys) {
            queryClient.invalidateQueries({ queryKey: JSON.parse(keyStr) });
          }
          pendingKeys.clear();
        }, 100);
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

    // ─── Live Store Updates ──────────────────────────────────────────
    //
    // These handlers update the ephemeral Zustand live-device store so
    // the UI can render telemetry and events without waiting for a
    // TanStack Query refetch. The store is a real-time overlay on top of
    // the server-state cache.

    const liveTelemetryHandler = (payload: DeviceTelemetryEvent) => {
      useLiveDeviceStore.getState().upsertDeviceTelemetry(payload);
    };
    socket.on("device:telemetry", liveTelemetryHandler);
    handlers.push(() => {
      socket.off("device:telemetry", liveTelemetryHandler);
    });

    const liveStatusHandler = (payload: DeviceStatusEvent) => {
      useLiveDeviceStore.getState().upsertDeviceStatus(payload);
    };
    socket.on("device:status", liveStatusHandler);
    handlers.push(() => {
      socket.off("device:status", liveStatusHandler);
    });

    const liveEventHandler = (payload: EventStreamEvent) => {
      useLiveDeviceStore.getState().addLiveEvent({
        eventId: payload.eventId,
        deviceId: payload.deviceId,
        deviceName: payload.deviceName,
        serial: payload.serial,
        siteId: payload.siteId,
        siteName: payload.siteName,
        estateId: payload.estateId,
        estateName: payload.estateName,
        category: payload.category,
        severity: payload.severity,
        title: payload.title,
        timestamp: payload.timestamp,
      });
    };
    socket.on("event:new", liveEventHandler);
    handlers.push(() => {
      socket.off("event:new", liveEventHandler);
    });

    // ─── Live Alert Store Updates ──────────────────────────────────
    //
    // These handlers update the ephemeral Zustand live-alert store for
    // instant UI rendering of alerts without TanStack Query refetch.

    const alertCreatedHandler = (payload: AlertEvent) => {
      useLiveAlertStore.getState().addAlert(payload);
    };
    socket.on("alert:created", alertCreatedHandler);
    handlers.push(() => {
      socket.off("alert:created", alertCreatedHandler);
    });

    const alertUpdatedHandler = (payload: AlertEvent) => {
      useLiveAlertStore.getState().updateAlertStatus(payload.alertId, payload.status);
    };
    socket.on("alert:updated", alertUpdatedHandler);
    handlers.push(() => {
      socket.off("alert:updated", alertUpdatedHandler);
    });

    // Track socket connection state
    const handleConnect = () => {
      useLiveDeviceStore.getState().setSocketConnected(true);
      useLiveAlertStore.getState().setSocketConnected(true);
      // Re-subscribe to rooms on reconnect
      if (options.rooms && options.rooms.length > 0) {
        subscribeRooms(options.rooms);
      }
    };
    const handleDisconnect = () => {
      useLiveDeviceStore.getState().setSocketConnected(false);
      useLiveAlertStore.getState().setSocketConnected(false);
    };
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    handlers.push(() => socket.off("connect", handleConnect));
    handlers.push(() => socket.off("disconnect", handleDisconnect));

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

    // ─── Simulator Reset ──────────────────────────────────────────────
    //
    // When the simulator restarts, the admin health page emits
    // simulator:reset via the bridge. We clear all live stores and
    // invalidate React Query caches so stale data is not shown.
    // The invalidation is already handled by eventToKeys above.

    const simulatorResetHandler = () => {
      useLiveDeviceStore.getState().clearLiveState();
      useLiveAlertStore.getState().clearAlerts();
      // Show a toast notification so the user knows what happened
      import("@/stores/notification-store").then(({ useNotificationStore }) => {
        useNotificationStore.getState().addNotification({
          id: `sim-reset-${Date.now()}`,
          userId: "",
          title: "Simulator restarted",
          message: "Refreshing live devices and data.",
          priority: "normal",
          category: "system",
          isRead: false,
          createdAt: new Date().toISOString(),
        });
      });
    };
    socket.on("simulator:reset", simulatorResetHandler);
    handlers.push(() => {
      socket.off("simulator:reset", simulatorResetHandler);
    });

    // Set initial connection state if the socket is already connected
    // This covers the case where connectSocket → socket.connect() succeeds
    // synchronously before we register the "connect" event listener above.
    if (socket.connected) {
      useLiveDeviceStore.getState().setSocketConnected(true);
      useLiveAlertStore.getState().setSocketConnected(true);
    }

    return () => {
      for (const off of handlers) off();
      disconnectSocket();
      subscribedRef.current = false;
    };
  }, [isAuthenticated, token, queryClient, options.rooms]);
}
