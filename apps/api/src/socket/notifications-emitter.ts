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

const BRIDGE_URL = process.env.BRIDGE_SOCKET_URL ?? "http://localhost:3002";

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

let client: Socket | null = null;

// Notification payload shape that matches the frontend's NotificationEvent
export interface NotificationEvent {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  priority: "low" | "normal" | "high" | "critical";
  timestamp: string;
}

/**
 * Connect the bridge client socket. Called lazily on first emit.
 * Safe to call multiple times — returns the existing connection.
 */
function getClient(): Socket {
  if (client?.connected) return client;

  if (!client) {
    client = createSocketClient(BRIDGE_URL, {
      auth: { token: createServiceToken() },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2_000,
    });

    client.on("connect", () => {
      console.log(`[notifications-emitter] Connected to bridge at ${BRIDGE_URL}`);
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
    }
  } catch {
    // Silently ignore bridge connection failures — the notification is
    // already persisted in the DB and polling will catch it.
  }
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
