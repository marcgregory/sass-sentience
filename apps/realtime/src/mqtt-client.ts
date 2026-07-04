/**
 * MQTT client — connects to the broker, subscribes to device topics,
 * and dispatches parsed payloads to registered handlers.
 *
 * Handles:
 * - Auto-reconnect with backoff (built into mqtt.js)
 * - Extraction of deviceId from the MQTT topic wildcard
 * - Dispatch by topic suffix (telemetry, status, events)
 */

import mqtt from "mqtt";
import type { MqttPayload } from "./normalizer";

// ─── Topic Patterns ─────────────────────────────────────────────────

const TOPIC_PATTERN = /^sentience\/devices\/([^/]+)\/(telemetry|status|events)$/;
const SYSTEM_PATTERN = /^sentience\/system\/(.+)$/;

export type MqttTopicType = "telemetry" | "status" | "events";

export interface MqttMessage {
  deviceId: string;
  topicType: MqttTopicType;
  payload: MqttPayload;
  raw: string;
}

export type MessageHandler = (msg: MqttMessage) => void;
export type SystemMessageHandler = (payload: Record<string, unknown>) => void;
export type ErrorHandler = (err: Error) => void;

// ─── Client ────────────────────────────────────────────────────────

export interface MqttClientOptions {
  brokerUrl: string;
  topicPrefix: string;
  username?: string;
  password?: string;
  onMessage: MessageHandler;
  onSystemMessage?: SystemMessageHandler;
  onError?: ErrorHandler;
  onConnect?: () => void;
}

export async function createMqttClient(
  options: MqttClientOptions,
): Promise<mqtt.MqttClient> {
  const { brokerUrl, topicPrefix, username, password, onMessage, onSystemMessage, onError, onConnect } = options;

  const client = await mqtt.connectAsync(brokerUrl, {
    username,
    password,
    clean: true,
    reconnectPeriod: 5_000,
    connectTimeout: 10_000,
  });

  // Note: connectAsync already waited for the connection, so the
  // "connect" event won't fire again. Subscribe directly.
  const topics = [
    `${topicPrefix}/devices/+/telemetry`,
    `${topicPrefix}/devices/+/status`,
    `${topicPrefix}/devices/+/events`,
    `${topicPrefix}/system/simulator/started`,
  ];

  await client.subscribeAsync(topics, { qos: 1 });
  console.log(`[mqtt] Subscribed to ${topics.length} topic patterns`);
  onConnect?.();

  // On reconnect the mqtt.js library automatically re-subscribes
  // when clean is true. The reconnect handler logs for visibility.
  client.on("reconnect", () => {
    console.log(`[mqtt] Reconnecting...`);
  });

  client.on("message", (topic, rawPayload) => {
    try {
      // Check for system topics first
      const sysMatch = topic.match(SYSTEM_PATTERN);
      if (sysMatch) {
        const parsed = JSON.parse(rawPayload.toString()) as Record<string, unknown>;
        options.onSystemMessage?.({ ...parsed, _topic: sysMatch[1] });
        return;
      }

      const match = topic.match(TOPIC_PATTERN);
      if (!match) return;

      const deviceId = match[1];
      const topicType = match[2] as MqttTopicType;
      const parsed: MqttPayload = JSON.parse(rawPayload.toString());

      onMessage({ deviceId, topicType, payload: parsed, raw: rawPayload.toString() });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(`[mqtt] Error processing message on ${topic}:`, error.message);
      onError?.(error);
    }
  });

  client.on("error", (err) => {
    console.error(`[mqtt] Connection error:`, err.message);
    onError?.(err);
  });

  client.on("close", () => {
    console.log(`[mqtt] Connection closed`);
  });

  return client;
}
