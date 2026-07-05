/**
 * Realtime listener — connects to the realtime service's Socket.IO server,
 * listens for alert:created events, persists them as notification records
 * in the database, and emits notification:new to connected clients.
 *
 * This bridges the gap between realtime alert events (which are ephemeral
 * Socket.IO broadcasts) and persisted notifications that show up on the
 * /notifications page and survive page refresh.
 *
 * Flow:
 *   MQTT event → Realtime → alert:created → API listener →
 *   INSERT notifications (DB) → emitNotification() →
 *   Realtime → notification:new → Frontend (badge + page)
 *
 * The connection is established once at server startup and auto-reconnects
 * if the realtime service is temporarily unavailable.
 */

import { io as createSocketClient, type Socket } from "socket.io-client";
import jwt from "jsonwebtoken";
import { db } from "../db";
import { notifications, users, roles, estates, notificationRules } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { emitNotification } from "./notifications-emitter";
import { env } from "../config";

const BRIDGE_URL = env.REALTIME_WS_URL;

// ─── Error rate limiting ────────────────────────────────────────────
//
// Suppress repetitive connect_error logs to avoid spamming stdout
// when the realtime service is unavailable (e.g. during deployments).
let errorSuppressCount = 0;
const ERROR_SUPPRESS_THRESHOLD = 5; // log every Nth error only

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
  /** Simulated events originate from the MQTT simulator and should not be persisted. */
  isSimulated?: boolean;
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
      console.log(`[bridge-listener] Connected to realtime service at ${env.REALTIME_WS_URL}`);

      // Reset error counter on successful reconnect
      errorSuppressCount = 0;
    });

    client.on("disconnect", (reason) => {
      console.log(`[bridge-listener] Disconnected: ${reason}`);
    });

    client.on("connect_error", (err) => {
      errorSuppressCount++;
      if (errorSuppressCount % ERROR_SUPPRESS_THRESHOLD === 1) {
        console.error(
          `[bridge-listener] Connection error (attempt ${errorSuppressCount}): ${err.message}`,
        );
      }
    });

    // ─── Handle alert:created → persist as notification ──────────

    client.on(
      "alert:created",
      async (payload: AlertCreatedPayload) => {
        try {
          // ── Fast path: simulated alerts ─────────────────────────────
          //
          // When Simulation Mode is active, simulated alert events carry
          // isSimulated: true. We bypass all DB interactions and emit
          // notifications directly over WebSocket so they appear in the
          // UI in real time but disappear on page refresh.
          if (payload.isSimulated) {
            const priority =
              SEVERITY_TO_PRIORITY[payload.severity] ?? "normal";
            const message =
              payload.description ?? payload.title;

            emitNotification({
              notificationId: `simulated-notification-${payload.alertId}`,
              userId: "*", // broadcast to all connected clients
              title: payload.title,
              message,
              priority,
              timestamp: payload.timestamp,
              isSimulated: true,
            });

            console.log(
              `[bridge-listener] Simulated notification broadcast: "${payload.title}" (severity: ${payload.severity})`,
            );
            return;
          }

          const priority =
            SEVERITY_TO_PRIORITY[payload.severity] ?? "normal";
          const message =
            payload.description ?? payload.title;

          // ── 1. Look up the notification rule for this alert type ──
          //
          // The category on an alert event corresponds to the event type
          // (battery_low, signal_weak, device_offline, etc.) which matches
          // the notificationRules.alertType.
          const alertCategory = payload.category;
          const rules = await db
            .select()
            .from(notificationRules)
            .where(
              eq(
                notificationRules.alertType,
                (alertCategory ?? "") as "device_offline" | "device_fault" | "battery_low" | "signal_weak" | "temperature_high" | "firmware_update" | "diagnostic_failure",
              ),
            );

          const rule = rules[0];
          const rolePrefs = rule?.rolePreferences as
            | Record<string, boolean>
            | undefined;

          // ── 2. Resolve the estate's customer (for tenant scoping) ──
          //
          // Platform roles (admin, support, installer) have no customerId
          // and see all estates. Customer roles are scoped to their
          // customer's estates only.
          let estateCustomerId: string | null = null;
          if (payload.estateId) {
            const [estate] = await db
              .select({ customerId: estates.customerId })
              .from(estates)
              .where(eq(estates.id, payload.estateId))
              .limit(1);
            estateCustomerId = estate?.customerId ?? null;
          }

          // ── 3. Determine which role names are enabled ─────────────
          const enabledRoles = new Set<string>();
          if (rolePrefs) {
            for (const [role, enabled] of Object.entries(rolePrefs)) {
              if (enabled) enabledRoles.add(role);
            }
          } else {
            // No rule found — fall back to all roles
            enabledRoles.add("admin");
            enabledRoles.add("support");
          }

          if (enabledRoles.size === 0) return;

          // ── 4. Look up role IDs matching the enabled roles ────────
          const matchingRoles = await db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(inArray(roles.name, [...enabledRoles]));

          const matchingRoleIds = matchingRoles.map((r) => r.id);
          if (matchingRoleIds.length === 0) return;

          // ── 5. Find active users with a matching role, scoped ─────
          //
          // Platform roles (admin, support, installer — no customerId):
          //   receive notifications for all estates.
          //
          // Customer roles (have a customerId):
          //   only receive notifications for estates belonging to their customer.

          const isPlatformRole = new Set(
            matchingRoles
              .filter((r) => r.name === "admin" || r.name === "support" || r.name === "installer")
              .map((r) => r.id),
          );
          const isCustomerRole = new Set(
            matchingRoles
              .filter((r) => r.name === "customer")
              .map((r) => r.id),
          );

          // Build role-based + tenant-scoped user query
          const platformWhere = and(
            eq(users.isActive, true),
            inArray(users.roleId, [...isPlatformRole]),
          );

          let targetUsers: { id: string }[] = [];

          if (isPlatformRole.size > 0) {
            const platformUsers = await db
              .select({ id: users.id })
              .from(users)
              .where(platformWhere);
            targetUsers.push(...platformUsers);
          }

          if (isCustomerRole.size > 0 && estateCustomerId) {
            const customerUsers = await db
              .select({ id: users.id })
              .from(users)
              .where(
                and(
                  eq(users.isActive, true),
                  inArray(users.roleId, [...isCustomerRole]),
                  eq(users.customerId, estateCustomerId),
                ),
              );
            // Avoid duplicates (a user shouldn't have both platform + customer roles,
            // but safe to dedup)
            const existingIds = new Set(targetUsers.map((u) => u.id));
            for (const cu of customerUsers) {
              if (!existingIds.has(cu.id)) {
                targetUsers.push(cu);
              }
            }
          }

          if (targetUsers.length === 0) return;

          // ── 6. Create a notification record for each target user ──
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

          // ── 7. Emit notification:new for each created row ─────────
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
            `[bridge-listener] Created ${created.length} notification(s) from alert: "${payload.title}" (rule: ${alertCategory}, roles: ${[...enabledRoles].join(",")})`,
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
