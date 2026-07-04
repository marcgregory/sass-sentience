/**
 * MQTT device simulator.
 *
 * Connects to an MQTT broker and spawns simulated IoT devices that
 * publish telemetry, status, and events on realistic MQTT topics.
 *
 * Topics:
 *   {prefix}/devices/{deviceId}/telemetry   — periodic sensor readings
 *   {prefix}/devices/{deviceId}/status       — online/offline/fault/warning
 *   {prefix}/devices/{deviceId}/events       — status transitions & alerts
 *
 * Environment variables:
 *   MQTT_URL          — MQTT broker URL (default: mqtt://localhost:1883)
 *   MQTT_TOPIC_PREFIX — Topic prefix       (default: sentience)
 *
 * Usage (CLI):
 *   pnpm --filter @sentience/mock simulate
 *   MQTT_URL=mqtt://broker.hivemq.com:1883 pnpm --filter @sentience/mock simulate
 *   pnpm --filter @sentience/mock simulate -- --count 10 --broker mqtt://localhost:1883
 *
 * Usage (programmatic):
 *   import { runSimulator } from "@sentience/mock";
 *   await runSimulator({ deviceCount: 10, brokerUrl: "mqtt://broker.hivemq.com:1883" });
 *
 * Graceful shutdown via SIGINT/SIGTERM — publishes "offline" for all devices
 * before disconnecting.
 *
 * @see docs/mqtt-simulator.md
 */

import mqtt from "mqtt";
import { generateDevice } from "./device-generator";
import type { Device, DeviceStatus } from "@sentience/types";

// ─── Configuration ─────────────────────────────────────────────────

export interface SimulatorOptions {
  /** Number of fake devices to simulate (default: 5) */
  deviceCount?: number;
  /** MQTT broker URL (default: mqtt://localhost:1883 or $MQTT_URL) */
  brokerUrl?: string;
  /** MQTT topic prefix (default: sentience or $MQTT_TOPIC_PREFIX) */
  topicPrefix?: string;
  /** Base interval in seconds between telemetry publishes (default: 10) */
  telemetryInterval?: number;
  /** Probability of a status transition per tick (0-1, default: 0.02) */
  statusChangeProbability?: number;
  /** Client ID prefix for the MQTT connection */
  clientId?: string;
}

interface SimulatedDevice {
  device: Device;
  status: DeviceStatus;
  battery: number | null;
  uptime: number;
  signal: number;
  temperature: number;
  inputState: boolean;
  outputState: boolean;
  fault: boolean;
  warning: boolean;
  siteId: string;
  siteName: string;
  estateId: string;
  estateName: string;
  telemetryTimer: ReturnType<typeof setInterval> | null;
  eventTimer: ReturnType<typeof setInterval> | null;
}

// ─── Helpers ───────────────────────────────────────────────────────

function mqttTopic(deviceId: string, suffix: string, prefix: string): string {
  return `${prefix}/devices/${deviceId}/${suffix}`;
}

/**
 * Jitter a base interval by ±50% so devices don't all publish at once.
 */
function isExternallyPowered(type: string): boolean {
  return type === "controller" || type === "gateway" || type === "relay";
}

function jitterInterval(baseMs: number): number {
  const half = baseMs / 2;
  return baseMs - half + Math.random() * baseMs;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h${m}m`;
  if (m > 0) return `${m}m${s}s`;
  return `${s}s`;
}

// ─── Simulator Engine ──────────────────────────────────────────────

export async function runSimulator(options: SimulatorOptions = {}): Promise<void> {
  const {
    deviceCount = 5,
    brokerUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883",
    topicPrefix = process.env.MQTT_TOPIC_PREFIX ?? "sentience",
    telemetryInterval = 10,
    statusChangeProbability = 0.015,
    clientId = `sentience-sim-${Math.random().toString(36).slice(2, 8)}`,
  } = options;

  console.log(`[simulator] Connecting to ${brokerUrl} (client: ${clientId})...`);
  console.log(`[simulator] Spawning ${deviceCount} simulated devices...`);

  const client = await mqtt.connectAsync(brokerUrl, {
    clientId,
    clean: true,
    reconnectPeriod: 5_000,
  });

  console.log(`[simulator] Connected. Publishing on sentience/devices/{id}/...`);

  // ─── Publish Tracking & Health Logging ─────────────────────────────
  let publishCount = 0;
  let lastPublishTime = Date.now();
  let reconnectAttempts = 0;
  let lastHealthCount = 0;
  let mqttConnected = true;
  const startTime = Date.now();

  // Wrap client.publishAsync so every publish is tracked automatically
  const originalPublish: typeof client.publishAsync = client.publishAsync.bind(client);
  client.publishAsync = (topic: string, payload: string | Buffer, opts?: mqtt.IClientPublishOptions) => {
    return originalPublish(topic, payload, opts).then((result) => {
      publishCount++;
      lastPublishTime = Date.now();
      mqttConnected = true;
      return result;
    });
  };

  // MQTT connection event listeners for visibility
  client.on("connect", () => {
    mqttConnected = true;
    console.log(`[simulator] MQTT connected`);
  });
  client.on("reconnect", () => {
    reconnectAttempts++;
    console.log(`[simulator] MQTT reconnecting (attempt ${reconnectAttempts})...`);
  });
  client.on("close", () => {
    mqttConnected = false;
    console.log(`[simulator] MQTT connection closed`);
  });
  client.on("offline", () => {
    mqttConnected = false;
    console.log(`[simulator] MQTT offline`);
  });
  client.on("error", (err) => {
    console.error(`[simulator] MQTT error: ${err.message}`);
  });

  // Create simulated devices
  const devices: SimulatedDevice[] = Array.from({ length: deviceCount }, (_, i) => {
    const device = generateDevice();
    const ext = device as unknown as Record<string, unknown>;
    return {
      device,
      status: device.status,
      battery: isExternallyPowered(device.type) ? null : device.telemetry.battery,
      uptime: device.telemetry.uptime,
      signal: device.telemetry.signalStrength,
      temperature: device.telemetry.temperature,
      inputState: device.io.inputs.some((inp) => inp.state),
      outputState: device.io.outputs.some((out) => out.state),
      fault: device.status === "fault",
      warning: device.status === "warning",
      siteId: (ext.siteId as string) ?? device.siteId,
      siteName: (ext.siteName as string) ?? "Unknown Site",
      estateId: (ext.estateId as string) ?? "unknown",
      estateName: (ext.estateName as string) ?? "Unknown Estate",
      telemetryTimer: null,
      eventTimer: null,
    };
  });

  // Publish initial status for every device
  for (const sd of devices) {
    await publishStatus(client, sd, topicPrefix);
    // Brief stagger to avoid thundering herd on connect
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log(`[simulator] Published initial status for ${deviceCount} devices.`);

  // ─── Telemetry Loop ──────────────────────────────────────────────

  for (const sd of devices) {
    const tick = () => {
      // Battery drain — skip for externally-powered devices
      if (sd.battery !== null) {
        const drain = sd.status === "fault" ? 0.5 : sd.status === "warning" ? 0.2 : 0.05;
        sd.battery = Math.max(0, sd.battery - drain * (0.5 + Math.random()));
      }

      sd.uptime += Math.round(telemetryInterval * (0.8 + Math.random() * 0.4));

      // Simulate signal fluctuation
      sd.signal = Math.round(Math.min(-40, Math.max(-120, sd.signal + (Math.random() - 0.5) * 3)));

      // Simulate temperature drift
      sd.temperature += (Math.random() - 0.5) * 0.8;
      sd.temperature = Math.round(sd.temperature * 10) / 10;

      // Random input/output state changes
      sd.inputState = Math.random() > 0.9 ? !sd.inputState : sd.inputState;
      sd.outputState = Math.random() > 0.95 ? !sd.outputState : sd.outputState;

      // Status transitions — keep low probability so most devices stay online
      if (Math.random() < statusChangeProbability) {
        const prevStatus = sd.status;
        const nextStatus = computeNextStatus(sd.status);
        if (nextStatus !== sd.status) {
          sd.status = nextStatus;
          sd.fault = nextStatus === "fault";
          sd.warning = nextStatus === "warning";
          // Publish status change as an event
          publishEvent(client, sd, `status: ${prevStatus} → ${nextStatus}`, topicPrefix);
          publishStatus(client, sd, topicPrefix);
        }
      }

      // Publish telemetry
      publishTelemetry(client, sd, topicPrefix);
    };

    sd.telemetryTimer = setInterval(tick, jitterInterval(telemetryInterval * 1000));
  }

  // ─── Periodic Event Publishing ──────────────────────────────────

  // Some devices emit spontaneous events (battery low, signal weak, temp high)
  for (const sd of devices) {
    const eventTick = () => {
      if (sd.battery !== null && sd.battery < 15 && Math.random() < 0.3) {
        publishEvent(client, sd, "battery_low", topicPrefix, {
          battery: sd.battery,
          threshold: 15,
        });
      }
      if (sd.signal < -100 && Math.random() < 0.3) {
        publishEvent(client, sd, "signal_weak", topicPrefix, {
          signal: sd.signal,
          threshold: -100,
        });
      }
    };

    sd.eventTimer = setInterval(eventTick, jitterInterval(telemetryInterval * 2000));
  }

  // ─── Graceful Shutdown ──────────────────────────────────────────

  const shutdown = async () => {
    console.log("\n[simulator] Shutting down gracefully...");

    // Publish offline status for all devices
    for (const sd of devices) {
      const prevStatus = sd.status;
      sd.status = "offline";
      await publishEvent(client, sd, `shutdown: ${prevStatus} → offline`, topicPrefix);
      await publishStatus(client, sd, topicPrefix);
    }

    // Clear timers
    for (const sd of devices) {
      if (sd.telemetryTimer) clearInterval(sd.telemetryTimer);
      if (sd.eventTimer) clearInterval(sd.eventTimer);
    }
    clearInterval(healthInterval);

    await client.endAsync(true);
    console.log("[simulator] Disconnected. Goodbye.");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // ─── Health Log Interval (every 60s) ──────────────────────────────
  const healthInterval = setInterval(() => {
    const now = Date.now();
    const sinceLastPublish = (now - lastPublishTime) / 1000;
    const uptimeSeconds = (now - startTime) / 1000;
    const activeDevices = devices.filter((d) => d.status !== "offline").length;
    const pausedDevices = devices.filter((d) => d.status === "offline" || d.status === "fault").length;
    const uptimeStr = formatUptime(uptimeSeconds);
    const rate = Math.round((publishCount - lastHealthCount) / 60);
    lastHealthCount = publishCount;

    console.log(
      `[simulator] health:` +
      ` ${activeDevices}/${deviceCount} active` +
      ` | ${pausedDevices} paused` +
      ` | ${rate} msg/s` +
      ` | ${publishCount} total` +
      ` | last ${sinceLastPublish.toFixed(0)}s ago` +
      ` | MQTT ${mqttConnected ? "connected" : "disconnected"}` +
      ` | reconnects: ${reconnectAttempts}` +
      ` | uptime=${uptimeStr}`,
    );
    if (sinceLastPublish > 60) {
      console.warn(
        `[simulator] WARNING: No publish succeeded for ${sinceLastPublish.toFixed(0)}s` +
        ` — MQTT ${mqttConnected ? "connected" : "disconnected"}, ${reconnectAttempts} reconnects`,
      );
    }
  }, 60_000);

  // Keep the process alive
  console.log(`[simulator] Running. Press Ctrl+C to stop.`);
}

// ─── Publish Functions ─────────────────────────────────────────────

function basePayload(sd: SimulatedDevice): Record<string, unknown> {
  return {
    deviceId: sd.device.id,
    deviceName: sd.device.name,
    name: sd.device.name,
    deviceType: sd.device.type,
    serial: sd.device.serialNumber,
    status: sd.status,
    battery: sd.battery === null ? null : Math.round(sd.battery),
    uptime: sd.uptime,
    signal: sd.signal,
    temperature: sd.temperature,
    fault: sd.fault,
    warning: sd.warning,
    inputState: sd.inputState,
    outputState: sd.outputState,
    siteId: sd.siteId,
    siteName: sd.siteName,
    estateId: sd.estateId,
    estateName: sd.estateName,
    timestamp: new Date().toISOString(),
  };
}

async function publishTelemetry(client: mqtt.MqttClient, sd: SimulatedDevice, prefix: string): Promise<void> {
  await client.publishAsync(
    mqttTopic(sd.device.id, "telemetry", prefix),
    JSON.stringify(basePayload(sd)),
    { qos: 1 },
  );
}

async function publishStatus(client: mqtt.MqttClient, sd: SimulatedDevice, prefix: string): Promise<void> {
  await client.publishAsync(
    mqttTopic(sd.device.id, "status", prefix),
    JSON.stringify(basePayload(sd)),
    { qos: 2, retain: true },  // Retain so late subscribers get the last known status
  );
}

async function publishEvent(
  client: mqtt.MqttClient,
  sd: SimulatedDevice,
  eventType: string,
  prefix: string,
  extra?: Record<string, unknown>,
): Promise<void> {
  const payload = JSON.stringify({
    ...basePayload(sd),
    eventType,
    ...extra,
  });

  await client.publishAsync(
    mqttTopic(sd.device.id, "events", prefix),
    payload,
    { qos: 1 },
  );
}

// ─── Status Transition Logic ───────────────────────────────────────

function computeNextStatus(current: DeviceStatus): DeviceStatus {
  const r = Math.random();
  switch (current) {
    case "online":
      // Mostly stays online (~93%), occasional warning (~4%), rare fault/offline (~3%)
      if (r < 0.04) return "warning";
      if (r < 0.06) return "fault";
      if (r < 0.07) return "offline";
      return "online";
    case "warning":
      // Warning tends to self-clear (~25%), escalate (~10%), or stay (~65%)
      if (r < 0.25) return "online";
      if (r < 0.35) return "fault";
      if (r < 0.40) return "offline";
      return "warning";
    case "fault":
      // Fault autocorrects (~15%), degrades to offline (~10%), or stays (~75%)
      if (r < 0.15) return "online";
      if (r < 0.25) return "warning";
      if (r < 0.35) return "offline";
      return "fault";
    case "offline":
      // Offline comes back eventually (~35%), or stays (~65%)
      if (r < 0.35) return "online";
      if (r < 0.40) return "warning";
      if (r < 0.45) return "fault";
      return "offline";
  }
}

// ─── CLI Entry Point ─────────────────────────────────────────────────
//
// When run directly via `tsx src/device-simulator.ts`, parse CLI args
// and start the simulator.

const isMainModule =
  typeof process !== "undefined" &&
  process.argv[1] &&
  (process.argv[1].endsWith("device-simulator.ts") ||
    process.argv[1].endsWith("device-simulator.js"));

if (isMainModule) {
  const args = process.argv.slice(2);
  const getArg = (name: string, fallback: string): string => {
    const idx = args.indexOf(name);
    return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
  };

  const hasCountFlag = args.includes("--count");
  const hasBrokerFlag = args.includes("--broker");
  const hasTopicPrefixFlag = args.includes("--topic-prefix");

  const opts: SimulatorOptions = {};
  if (hasCountFlag) opts.deviceCount = parseInt(getArg("--count", "5"), 10);
  if (hasBrokerFlag) opts.brokerUrl = getArg("--broker", "mqtt://localhost:1883");
  if (hasTopicPrefixFlag) opts.topicPrefix = getArg("--topic-prefix", "sentience");

  runSimulator(opts).catch((err) => {
    console.error("[simulator] Fatal error:", err);
    process.exit(1);
  });
}
