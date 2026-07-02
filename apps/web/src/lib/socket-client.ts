/**
 * Socket.IO client wrapper.
 *
 * Provides a singleton Socket.IO connection with:
 * - Auth token injection on connect/reconnect
 * - Room-based subscriptions (by estate, site, device)
 * - Auto-reconnect with exponential backoff (built into Socket.IO)
 * - Typed event contracts
 *
 * The socket is a singleton — only one connection exists per browser tab.
 * Components and hooks consume events through React hooks (useSocket)
 * rather than using this module directly.
 *
 * @see ADR-0003 — Socket.IO for Real-Time Events
 */

import { io, type Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

// ─── Socket Event Types ────────────────────────────────────────────

/**
 * Events the server can emit to the client.
 * Each key is the event name; the value is the payload type.
 */
export interface ServerToClientEvents {
  "device:status": (payload: DeviceStatusEvent) => void;
  "device:telemetry": (payload: DeviceTelemetryEvent) => void;
  "device:diagnostic": (payload: DeviceDiagnosticEvent) => void;
  "alert:created": (payload: AlertEvent) => void;
  "alert:updated": (payload: AlertEvent) => void;
  "notification:new": (payload: NotificationEvent) => void;
  "notification:updated": (payload: NotificationEvent) => void;
  "event:new": (payload: EventStreamEvent) => void;
  "estate:updated": (payload: { estateId: string }) => void;
  "site:updated": (payload: { siteId: string }) => void;
  "user:updated": (payload: { userId: string }) => void;
  report: (payload: ReportEvent) => void;
  "kpi:updated": (payload: { estateId?: string }) => void;
}

/**
 * Events the client can emit to the server.
 */
export interface ClientToServerEvents {
  subscribe: (rooms: RoomSubscription[]) => void;
  unsubscribe: (rooms: RoomSubscription[]) => void;
}

// ─── Payload Types ─────────────────────────────────────────────────

export type DeviceStatusValue = "online" | "offline" | "fault" | "warning";

export interface DeviceStatusEvent {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  status: DeviceStatusValue;
  previousStatus: DeviceStatusValue;
  timestamp: string;
}

export interface DeviceTelemetryEvent {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  battery: number;
  voltage: number;
  temperature: number;
  signalStrength: number;
  timestamp: string;
}

export interface DeviceDiagnosticEvent {
  deviceId: string;
  siteId: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  diagnostic: {
    type: string;
    status: "passed" | "failed" | "warning";
    message: string;
  };
  timestamp: string;
}

export interface AlertEvent {
  alertId: string;
  deviceId?: string;
  siteId?: string;
  estateId?: string;
  status: "open" | "acknowledged" | "resolved";
  severity: "critical" | "warning" | "info";
  title: string;
  timestamp: string;
}

export interface NotificationEvent {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  timestamp: string;
}

export interface EventStreamEvent {
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

export interface ReportEvent {
  reportId: string;
  status: "generated" | "failed";
  name: string;
  url?: string;
  timestamp: string;
}

// ─── Room Subscriptions ────────────────────────────────────────────

export interface RoomSubscription {
  type: "estate" | "site" | "device";
  id: string;
}

// ─── Singleton Socket ──────────────────────────────────────────────

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

/**
 * Returns the existing socket connection or creates one.
 * The socket auto-connects on creation (Socket.IO default).
 */
export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (socket?.connected) return socket;

  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false, // caller must call connect() after getting auth
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 30_000,
      timeout: 10_000,
    });
  }

  return socket;
}

/**
 * Connects the socket with the current auth token.
 * Safe to call multiple times — it's a no-op if already connected.
 */
export function connectSocket(token: string): void {
  const s = getSocket();
  if (s.connected) return;

  s.auth = { token };
  s.connect();
}

/**
 * Disconnects the socket and clears the singleton.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribes the current socket connection to one or more rooms.
 * Replaces any previous subscription set for this client.
 */
export function subscribeRooms(rooms: RoomSubscription[]): void {
  const s = getSocket();
  if (!s.connected) return;
  s.emit("subscribe", rooms);
}

/**
 * Unsubscribes from one or more rooms.
 */
export function unsubscribeRooms(rooms: RoomSubscription[]): void {
  const s = getSocket();
  if (!s.connected) return;
  s.emit("unsubscribe", rooms);
}
