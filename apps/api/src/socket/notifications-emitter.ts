/**
 * Notification event emitter — connects to the realtime bridge's Socket.IO
 * server and forwards notification events for live delivery to clients.
 *
 * The API creates notifications in the database. This module gives the API
 * a lightweight socket.io-client connection to the bridge so it can emit
 * typed `notification:new` events that the bridge rebroadcasts to all
 * connected frontend clients.
 *
 * Usage:
 *   import { emitNotification } from "@/socket/notifications-emitter";
 *   emitNotification({ userId, title, message, priority, notificationId, timestamp });
 *
 * The connection is lazily initialized on first emit and shares the API's
 * JWT secret for authentication.
 */

import { io as createSocketClient, type Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { env } from "../config";

let client: Socket | null = null;

/**
 * Signed service token — the bridge authenticates this as a server process
 * so it can emit events on behalf of the backend.
 */
function createServiceToken(): string {
  return jwt.sign(
    {
      sub: "system:api-server",
      email: "system@sentience.local",
      role: "admin",
      name: "API Server",
    },
    env.JWT_SECRET,
    { expiresIn: "1h" },
  );
}

// Notification payload shape that matches the frontend's NotificationEvent
export interface NotificationEvent {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  timestamp: string;
  /** Simulated notifications are in-memory only and not persisted to the database. */
  isSimulated?: boolean;
}

/**
 * Connect the bridge client socket. Called lazily on first emit.
 * Safe to call multiple times — returns the existing connection.
 */
function getClient(): Socket {
  if (client?.connected) return client;

  if (!client) {
    const realtimeUrl = env.REALTIME_WS_URL;
    console.log(`[notifications-emitter] Connecting to realtime: ${realtimeUrl}`);

    client = createSocketClient(realtimeUrl, {
      auth: { token: createServiceToken() },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
    });

    client.on("connect", () => {
      console.log(`[notifications-emitter] Connected to realtime: ${realtimeUrl}`);
    });

    client.on("disconnect", (reason) => {
      console.log(`[notifications-emitter] Disconnected from bridge: ${reason}`);
    });

    client.on("connect_error", (err) => {
      console.error(`[notifications-emitter] Bridge connection error: ${err.message}`);
    });
  }

  if (!client.connected) {
    client.connect();
  }

  return client;
}

/**
 * Emit a notification event through the bridge to all connected clients.
 * The bridge rebroadcasts it as `notification:new` to all dashboard rooms.
 *
 * This is fire-and-forget: if the bridge is unreachable, the notification
 * is still persisted in the database and will be picked up on the next poll.
 */
export function emitNotification(event: NotificationEvent): void {
  try {
    const s = getClient();
    if (s.connected) {
      s.emit("notification:new", event);
    } else {
      console.warn(
        `[notifications-emitter] failed to emit notification:new because realtime socket is disconnected`,
      );
    }
  } catch (err) {
    console.warn(
      `[notifications-emitter] failed to emit notification:new: ${err instanceof Error ? err.message : err}`,
    );
  }
}

/**
 * Pre-warm the bridge client connection so it is ready when simulated or
 * real notification events arrive. Call once at server startup to ensure
 * the socket handshake completes before the first emitNotification() call.
 *
 * Safe to call multiple times — returns the existing client if already
 * connected, or awaits the pending handshake.
 */
export function connectNotificationsEmitter(): Promise<void> {
  const s = getClient();
  if (s.connected) return Promise.resolve();
  return new Promise<void>((resolve) => {
    if (s.connected) {
      resolve();
      return;
    }
    s.once("connect", () => resolve());
  });
}

/**
 * Gracefully disconnect the bridge client. Safe to call multiple times.
 */
export function disconnectNotificationsEmitter(): void {
  if (client) {
    client.removeAllListeners();
    client.disconnect();
    client = null;
  }
}
