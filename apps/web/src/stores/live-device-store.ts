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

  // ─── Actions ──────────────────────────────────────────────────────

  upsertDeviceTelemetry: (payload: DeviceTelemetryEvent) => void;
  upsertDeviceStatus: (payload: DeviceStatusEvent) => void;
  addLiveEvent: (event: LiveEventEntry) => void;
  setSocketConnected: (connected: boolean) => void;
  clearLiveState: () => void;
}

const MAX_EVENTS = 50;

export const useLiveDeviceStore = create<LiveDeviceState>()((set) => ({
  devices: {},
  recentEvents: [],
  isSocketConnected: false,
  lastUpdatedAt: null,

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
    set((state) => ({
      recentEvents: [event, ...state.recentEvents].slice(0, MAX_EVENTS),
      lastUpdatedAt: event.timestamp,
    }));
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
    });
  },
}));
