/**
 * MQTT → Socket.IO bridge entry point.
 *
 * Connects to the MQTT broker, subscribes to device topics, normalizes
 * payloads, and emits typed Socket.IO events to connected browser clients.
 *
 * Usage:
 *   pnpm --filter @sentience/realtime start
 *   MQTT_URL=mqtts://... SOCKET_PORT=3002 pnpm --filter @sentience/realtime start
 *
 * Required env vars:
 *   MQTT_URL          — MQTT broker URL (default: mqtt://localhost:1883)
 *   SOCKET_PORT       — Socket.IO listen port (default: 3001)
 *   CORS_ORIGIN       — CORS origin for Socket.IO (default: http://localhost:3000)
 *
 * Optional env vars:
 *   MQTT_USERNAME     — MQTT broker username
 *   MQTT_PASSWORD     — MQTT broker password
 *   MQTT_TOPIC_PREFIX — Topic prefix (default: sentience)
 *   LOG_LEVEL         — debug | info | warn | error (default: info)
 *
 * @see docs/realtime-bridge.md
 */

import { loadEnv } from "./env";
import { createMqttClient } from "./mqtt-client";
import { createSocketServer, EVENTS, ROOMS } from "./socket-server";
import {
  toTelemetryEvent,
  toStatusEvent,
  toEventStreamEvent,
  toDiagnosticEvent,
  toAlertEvent,
} from "./normalizer";
import { updateDevice, getDevice, deviceCount, pruneStaleDevices } from "./device-registry";
import type { DeviceStatusValue } from "./socket-server";

// ─── Bootstrap ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const env = loadEnv();

  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Sentience MQTT → Socket.IO Bridge      ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`  MQTT:    ${env.MQTT_URL}`);
  console.log(`  Socket:  port ${env.SOCKET_PORT}`);
  console.log(`  CORS:    ${env.CORS_ORIGIN}`);
  console.log(`  Prefix:  ${env.MQTT_TOPIC_PREFIX}`);
  console.log("");

  // Track previous status per device for status transition events
  const previousStatuses = new Map<string, DeviceStatusValue>();

  // Track last alert emission per deviceId+eventType for dedup (60s cooldown)
  const alertDedupTimestamps = new Map<string, number>();
  const ALERT_DEDUP_MS = 60_000;

  // ─── Socket.IO Server ───────────────────────────────────────────

  const io = await createSocketServer({
    port: env.SOCKET_PORT,
    corsOrigin: env.CORS_ORIGIN,
    jwtSecret: env.JWT_SECRET,
    allowUnauthenticated: env.ALLOW_UNAUTHENTICATED,
  });

  // ─── MQTT Client ────────────────────────────────────────────────

  const mqttClient = await createMqttClient({
    brokerUrl: env.MQTT_URL,
    topicPrefix: env.MQTT_TOPIC_PREFIX,
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    onConnect: () => {
      console.log(`[bridge] Connected, tracking devices`);
    },

    onMessage: ({ deviceId, topicType, payload }) => {
      // Track previous status for transition detection
      const prevReg = getDevice(deviceId);
      const prevStatus = prevReg?.status as DeviceStatusValue | undefined;

      // Update device registry with estate/site context from the payload
      const reg = updateDevice(deviceId, {
        status: payload.status ?? prevReg?.status,
        siteId: payload.siteId,
        siteName: payload.siteName,
        estateId: payload.estateId,
        estateName: payload.estateName,
      });

      // Emit to appropriate rooms based on device registry
      const emitToDevice = (event: string, data: unknown) => {
        io.to(ROOMS.DASHBOARD).emit(event, data);
        io.to(ROOMS.DEVICE(deviceId)).emit(event, data);
        if (reg.siteId && reg.siteId !== "unknown") {
          io.to(ROOMS.SITE(reg.siteId)).emit(event, data);
        }
        if (reg.estateId && reg.estateId !== "unknown") {
          io.to(ROOMS.ESTATE(reg.estateId)).emit(event, data);
        }
      };

      switch (topicType) {
        case "telemetry": {
          const telemetryEvent = toTelemetryEvent(deviceId, payload);
          if (env.LOG_LEVEL === "debug") {
            console.log(`[telemetry] ${deviceId} → battery=${telemetryEvent.battery}%`);
          }
          emitToDevice(EVENTS.DEVICE_TELEMETRY, telemetryEvent);
          break;
        }

        case "status": {
          const effectivePrev = payload.previousStatus
            ? (payload.previousStatus as DeviceStatusValue)
            : (previousStatuses.get(deviceId) ?? prevStatus ?? "online");

          const statusEvent = toStatusEvent(deviceId, payload, effectivePrev);

          // Never emit status events when status hasn't actually changed
          if (statusEvent.status === statusEvent.previousStatus) {
            if (env.LOG_LEVEL === "debug") {
              console.log(`[status] ${deviceId}: ${statusEvent.status} → ${statusEvent.status} (skipped — no change)`);
            }
            break;
          }

          previousStatuses.set(deviceId, statusEvent.status);
          updateDevice(deviceId, { status: statusEvent.status });

          console.log(
            `[status] ${deviceId}: ${statusEvent.previousStatus} → ${statusEvent.status}`,
          );
          emitToDevice(EVENTS.DEVICE_STATUS, statusEvent);

          // Generate an event stream entry for status transitions
          const eventStreamEvent = toEventStreamEvent(deviceId, {
            ...payload,
            eventType: `status:${statusEvent.previousStatus}→${statusEvent.status}`,
            status: statusEvent.status,
          });
          emitToDevice(EVENTS.EVENT_NEW, eventStreamEvent);
          break;
        }

        case "events": {
          // Emit as event stream
          const eventStreamEvent = toEventStreamEvent(deviceId, payload);
          console.log(`[event]   ${deviceId}: ${payload.eventType ?? "unknown"}`);
          emitToDevice(EVENTS.EVENT_NEW, eventStreamEvent);

          // If it's an alert-worthy condition, also emit alert:created
          const alertEvent = toAlertEvent(deviceId, payload);
          if (alertEvent) {
            // Dedup: skip if same deviceId+category emitted within 60s
            const dedupKey = `${deviceId}:${payload.eventType ?? "unknown"}`;
            const lastAlert = alertDedupTimestamps.get(dedupKey);
            const now = Date.now();
            if (!lastAlert || now - lastAlert >= ALERT_DEDUP_MS) {
              alertDedupTimestamps.set(dedupKey, now);
              console.log(`[alert]   ${deviceId}: ${alertEvent.title}`);
              emitToDevice(EVENTS.ALERT_CREATED, alertEvent);
            }
          }

          // If it looks like a diagnostic condition, also emit device:diagnostic
          if (payload.fault || payload.warning) {
            const diagnosticEvent = toDiagnosticEvent(deviceId, payload);
            emitToDevice(EVENTS.DEVICE_DIAGNOSTIC, diagnosticEvent);
          }
          break;
        }
      }
    },

    onError: (err) => {
      console.error(`[mqtt] ${err.message}`);
    },
  });

  // ─── Graceful Shutdown ──────────────────────────────────────────

  const shutdown = async () => {
    console.log("\n[bridge] Shutting down...");
    await mqttClient.endAsync(true);
    await new Promise<void>((resolve) => io.close(() => resolve()));
    console.log("[bridge] Stopped");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // Periodic status log & stale-device cleanup
  setInterval(() => {
    const removed = pruneStaleDevices(env.DEVICE_TTL_MS);
    if (removed > 0) {
      console.log(`[cleanup] ${removed} stale device(s) removed`);
    }
    const clients = io.engine.clientsCount;
    const devices = deviceCount();
    console.log(`[heartbeat] ${clients} client(s), ${devices} device(s) tracked`);
  }, 60_000);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
