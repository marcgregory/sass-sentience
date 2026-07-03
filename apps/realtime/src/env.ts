/**
 * Environment variable loading for the realtime bridge.
 *
 * All configuration comes from the environment with sensible development
 * defaults. In production, every variable should be set explicitly.
 */

import "dotenv/config";

export interface Env {
  /** MQTT broker URL (default: mqtt://localhost:1883) */
  MQTT_URL: string;
  /** MQTT username (optional for dev, required for production) */
  MQTT_USERNAME: string | undefined;
  /** MQTT password (optional for dev, required for production) */
  MQTT_PASSWORD: string | undefined;
  /** Port for the Socket.IO server (default: 3001) */
  SOCKET_PORT: number;
  /** JWT secret for authenticating WebSocket connections (matches API server) */
  JWT_SECRET: string;
  /** Allow unauthenticated connections (DEV ONLY) */
  ALLOW_UNAUTHENTICATED: boolean;
  /** CORS origin for Socket.IO connections (default: http://localhost:3000) */
  CORS_ORIGIN: string;
  /** Topic prefix for MQTT subscriptions (default: sentience) */
  MQTT_TOPIC_PREFIX: string;
  /** Log level: debug, info, warn, error (default: info) */
  LOG_LEVEL: string;
}

export function loadEnv(): Env {
  return {
    MQTT_URL: process.env.MQTT_URL ?? "mqtt://localhost:1883",
    MQTT_USERNAME: process.env.MQTT_USERNAME || undefined,
    MQTT_PASSWORD: process.env.MQTT_PASSWORD || undefined,
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    SOCKET_PORT: parseInt(
      process.env.PORT ?? process.env.SOCKET_PORT ?? "3002",
      10,
    ),
    MQTT_TOPIC_PREFIX: process.env.MQTT_TOPIC_PREFIX ?? "sentience",
    LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
    JWT_SECRET:
      process.env.JWT_SECRET ?? "change-me-to-a-random-secret-in-production",
    ALLOW_UNAUTHENTICATED: process.env.SOCKET_ALLOW_UNAUTHENTICATED === "true",
  };
}
