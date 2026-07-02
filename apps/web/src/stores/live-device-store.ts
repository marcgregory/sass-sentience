/**
 * Zustand store for live realtime device state received via Socket.IO.
 *
 * This store holds transient overlay data — it is NOT a replacement for
 * TanStack Query's server-state cache. Live telemetry, status changes,
 * and events are kept here for instant UI updates. When the socket
 * disconnects or the user navigates away, this state is ephemeral.
 *
 * @see ADR-0003 — Socket.IO for Real-Time Events
 */

import { create } from "zustand";
import type { DeviceStatus } from "@sentience/types";
import type {
  DeviceStatusEvent,
  DeviceTelemetryEvent,
  EventStreamEvent,
} from "@/lib/socket-client";

// ─── Constants ────────────────────────────────────────────────────

const MAX_EVENTS = 50;
const EVENT_DEDUP_MS = 60_000; // 60-second cooldown per deviceId+category

// ─── Types ──────────────────────────────────────────────────────────

export interface LiveDeviceTelemetry {
  battery: number;
  voltage: number;
  temperature: number;
  signalStrength: number;
  timestamp: string;
}

export interface LiveDeviceEntry {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  status: DeviceStatus;
  previousStatus: DeviceStatus;
  telemetry: LiveDeviceTelemetry | null;
  lastSeen: string;
}

export interface LiveEventEntry {
  eventId: string;
  deviceId?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  category: string;
  severity: string;
  title: string;
  timestamp: string;
}

// ─── State ────────────────────────────────────────────────────────────

interface LiveDeviceState {
  /** Map of deviceId → live device entry */
  devices: Record<string, LiveDeviceEntry>;

  /** Ring buffer of recent events (max 50) */
  recentEvents: LiveEventEntry[];

  /** Socket connection status */
  isSocketConnected: boolean;

  /** Last time any realtime data was received */
  lastUpdatedAt: string | null;

  /**
   * Dedup tracking: key = `${deviceId}:${category}`, value = timestamp
   * Prevents repeated events (battery_low, signal_weak) from the same
   * device from spamming the feed within a 60-second window.
   */
  eventDedupTimestamps: Record<string, number>;

  // ─── Actions ──────────────────────────────────────────────────────

  upsertDeviceTelemetry: (payload: DeviceTelemetryEvent) => void;
  upsertDeviceStatus: (payload: DeviceStatusEvent) => void;
  addLiveEvent: (event: LiveEventEntry) => void;
  setSocketConnected: (connected: boolean) => void;
  clearLiveState: () => void;
}

export const useLiveDeviceStore = create<LiveDeviceState>()((set) => ({
  devices: {},
  recentEvents: [],
  isSocketConnected: false,
  lastUpdatedAt: null,
  eventDedupTimestamps: {},

  upsertDeviceTelemetry: (payload) => {
    set((state) => {
      const existing = state.devices[payload.deviceId];
      const entry: LiveDeviceEntry = {
        deviceId: payload.deviceId,
        siteId: payload.siteId,
        siteName: payload.siteName ?? existing?.siteName,
        estateId: payload.estateId ?? existing?.estateId,
        estateName: payload.estateName ?? existing?.estateName,
        status: existing?.status ?? "online",
        previousStatus: existing?.previousStatus ?? "online",
        telemetry: {
          battery: payload.battery,
          voltage: payload.voltage,
          temperature: payload.temperature,
          signalStrength: payload.signalStrength,
          timestamp: payload.timestamp,
        },
        lastSeen: payload.timestamp,
      };
      return {
        devices: { ...state.devices, [payload.deviceId]: entry },
        lastUpdatedAt: payload.timestamp,
      };
    });
  },

  upsertDeviceStatus: (payload) => {
    set((state) => {
      const existing = state.devices[payload.deviceId];
      // Never update if status hasn't changed
      if (existing && existing.status === payload.status) {
        return { lastUpdatedAt: payload.timestamp };
      }
      const entry: LiveDeviceEntry = {
        deviceId: payload.deviceId,
        siteId: payload.siteId,
        siteName: payload.siteName ?? existing?.siteName,
        estateId: payload.estateId ?? existing?.estateId,
        estateName: payload.estateName ?? existing?.estateName,
        status: payload.status as DeviceStatus,
        previousStatus: payload.previousStatus as DeviceStatus,
        telemetry: existing?.telemetry ?? null,
        lastSeen: payload.timestamp,
      };
      return {
        devices: { ...state.devices, [payload.deviceId]: entry },
        lastUpdatedAt: payload.timestamp,
      };
    });
  },

  addLiveEvent: (event) => {
    set((state) => {
      // Dedup: skip if same deviceId + category within 60s.
      // Use title for the key so different threshold events (battery_low vs
      // signal_weak) from the same device are NOT mistakenly deduped despite
      // mapping to the same "threshold_breach" category.
      const dedupKey = `${event.deviceId ?? ""}:${event.title}:${event.category}`;
      const now = Date.now();
      const lastTime = state.eventDedupTimestamps[dedupKey];
      if (lastTime && now - lastTime < EVENT_DEDUP_MS) {
        // Still update lastUpdatedAt so the connection indicator is fresh
        return { lastUpdatedAt: event.timestamp };
      }
      return {
        recentEvents: [event, ...state.recentEvents].slice(0, MAX_EVENTS),
        eventDedupTimestamps: { ...state.eventDedupTimestamps, [dedupKey]: now },
        lastUpdatedAt: event.timestamp,
      };
    });
  },

  setSocketConnected: (connected) => {
    set({ isSocketConnected: connected });
  },

  clearLiveState: () => {
    set({
      devices: {},
      recentEvents: [],
      isSocketConnected: false,
      lastUpdatedAt: null,
      eventDedupTimestamps: {},
    });
  },
}));
