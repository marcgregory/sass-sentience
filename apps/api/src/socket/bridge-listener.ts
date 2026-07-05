/**
 * Bridge listener — connects to the realtime bridge's Socket.IO server,
 * listens for alert:created events, persists them as notification records
 * in the database, and emits notification:new to connected clients.
 *
 * This bridges the gap between realtime alert events (which are ephemeral
 * Socket.IO broadcasts) and persisted notifications that show up on the
 * /notifications page and survive page refresh.
 *
 * Flow:
 *   MQTT event → Bridge → alert:created → API listener →
 *   INSERT notifications (DB) → emitNotification() →
 *   Bridge → notification:new → Frontend (badge + page)
 *
 * The connection is established once at server startup and auto-reconnects
 * if the bridge is temporarily unavailable.
 */

import { io as createSocketClient, type Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { notifications, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { emitNotification } from "./notifications-emitter";
import { env } from "../config";

const BRIDGE_URL = process.env.BRIDGE_SOCKET_URL ?? "http://localhost:3002";

// ─── Service Auth ───────────────────────────────────────────────────

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

// ─── Types ──────────────────────────────────────────────────────────

interface AlertCreatedPayload {
  alertId: string;
  title: string;
  description?: string;
  severity: "critical" | "warning" | "info";
  status: string;
  category?: string;
  deviceId?: string;
  deviceName?: string;
  serial?: string;
  siteId?: string;
  siteName?: string;
  estateId?: string;
  estateName?: string;
  timestamp: string;
}

const SEVERITY_TO_PRIORITY: Record<
  string,
  "low" | "normal" | "high" | "critical"
> = {
  critical: "critical",
  warning: "high",
  info: "normal",
};

// ─── Connection ─────────────────────────────────────────────────────

let client: Socket | null = null;

/**
 * Start listening for alert:created events from the realtime bridge.
 * Connections are auto-reconnecting. Safe to call multiple times.
 */
export function connectBridgeListener(): Socket {
  if (client?.connected) return client;

  if (!client) {
    client = createSocketClient(BRIDGE_URL, {
      auth: { token: createServiceToken() },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2_000,
      reconnectionDelayMax: 30_000,
    });

    client.on("connect", () => {
      console.log(`[bridge-listener] Connected to bridge at ${BRIDGE_URL}`);
    });

    client.on("disconnect", (reason) => {
      console.log(`[bridge-listener] Disconnected: ${reason}`);
    });

    client.on("connect_error", (err) => {
      console.error(`[bridge-listener] Connection error: ${err.message}`);
    });

    // ─── Handle alert:created → persist as notification ──────────

    client.on(
      "alert:created",
      async (payload: AlertCreatedPayload) => {
        try {
          const priority =
            SEVERITY_TO_PRIORITY[payload.severity] ?? "normal";
          const message =
            payload.description ?? payload.title;

          // Determine which users should receive this notification.
          // Query active users (admin + support) who manage the fleet.
          const targetUsers = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.isActive, true));

          if (targetUsers.length === 0) return;

          // Create a notification record for each target user
          const notificationValues = targetUsers.map((u) => ({
            userId: u.id,
            title: payload.title,
            message,
            priority,
            category: "alert" as const,
            link: null as string | null,
          }));

          const created = await db
            .insert(notifications)
            .values(notificationValues)
            .returning();

          // Emit a notification:new event through the bridge for each
          // created notification so connected clients receive it live
          for (const n of created) {
            emitNotification({
              notificationId: n.id,
              userId: n.userId,
              title: n.title,
              message: n.message,
              priority: n.priority as "low" | "normal" | "high" | "critical",
              timestamp: n.createdAt.toISOString(),
            });
          }

          console.log(
            `[bridge-listener] Created ${created.length} notification(s) from alert: "${payload.title}"`,
          );
        } catch (err) {
          console.error(
            "[bridge-listener] Failed to create notifications from alert:",
            err instanceof Error ? err.message : err,
          );
        }
      },
    );
  }

  if (!client.connected) {
    client.connect();
  }

  return client;
}

/**
 * Gracefully disconnect the bridge listener. Safe to call multiple times.
 */
export function disconnectBridgeListener(): void {
  if (client) {
    client.removeAllListeners();
    client.disconnect();
    client = null;
  }
}
