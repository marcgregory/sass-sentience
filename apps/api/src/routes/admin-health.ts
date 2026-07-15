/**
 * Platform Health Route — GET /api/admin/health
 *
 * Returns real-time health status for all platform services:
 * - API Service   (process metrics)
 * - Database      (connection pool, storage, latency)
 * - MQTT Broker   (TCP connectivity check)
 * - Bridge        (Socket.IO connection state)
 * - Simulator     (recent event activity)
 *
 * All checks are performed from within the API process with no
 * external health-check dependencies.
 */

import type { FastifyInstance } from "fastify";
import net from "net";
import { pool } from "../db";
import { getBridgeStatus } from "../socket/bridge-listener";
import { requireAuth, requireRole } from "../middleware/auth";

interface HealthService {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  description: string;
  uptime: number;
  lastCheck: string;
  metrics: { label: string; value: string }[];
}

interface HealthResponse {
  overallStatus: "healthy" | "degraded" | "down";
  lastChecked: string;
  services: HealthService[];
}

const MQTT_HOST = process.env.MQTT_HOST ?? "localhost";
const MQTT_PORT = Number(process.env.MQTT_PORT ?? 1883);
const MEMINFO_REGEX = /^MemTotal:\s+(\d+)\s+kB\s*\nMemAvailable:\s+(\d+)\s+kB\s*\n/m;

/**
 * Check MQTT broker connectivity via raw TCP socket.
 * Returns true if the port accepts a connection.
 */
function checkMqttConnectivity(): Promise<{ connected: boolean; latency: number }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on("connect", () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ connected: true, latency });
    });

    socket.on("error", () => {
      socket.destroy();
      resolve({ connected: false, latency: 0 });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ connected: false, latency: 3000 });
    });

    socket.connect(MQTT_PORT, MQTT_HOST);
  });
}

/**
 * Get database storage size in human-readable form.
 */
async function getDatabaseSize(): Promise<string> {
  try {
    const result = await pool.query(
      "SELECT pg_size_pretty(pg_database_size(current_database())) AS size",
    );
    return result.rows[0]?.size ?? "—";
  } catch {
    return "—";
  }
}

/**
 * Get the number of active database connections.
 */
async function getDatabaseConnections(): Promise<number> {
  try {
    const result = await pool.query(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE state = 'active'",
    );
    return result.rows[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Check if the simulator has published any events recently.
 */
async function checkSimulatorActivity(): Promise<{
  active: boolean;
  deviceCount: number;
  secondsSinceLastEvent: number;
}> {
  try {
    // Count devices
    const deviceResult = await pool.query("SELECT count(*)::int AS count FROM devices");
    const totalDevices = Number(deviceResult.rows[0]?.count ?? 0);

    // Find most recent event timestamp
    const recentEventResult = await pool.query("SELECT MAX(timestamp) AS max_ts FROM events");
    const lastEventTs: Date | null = recentEventResult.rows[0]?.max_ts ?? null;

    if (!lastEventTs) {
      return { active: false, deviceCount: totalDevices, secondsSinceLastEvent: 0 };
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(lastEventTs).getTime();
    const secondsSinceLastEvent = Math.floor(diffMs / 1000);
    const active = secondsSinceLastEvent < 60; // active if event in last 60s

    return { active, deviceCount: totalDevices, secondsSinceLastEvent };
  } catch {
    return { active: false, deviceCount: 0, secondsSinceLastEvent: 0 };
  }
}

/**
 * Format seconds into a human-readable uptime string.
 */
function formatUptime(seconds: number): string {
  if (seconds <= 0) return "N/A";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  return parts.join(" ") || "<1m";
}

/**
 * Get approximate process memory usage in MB.
 */
function getMemoryUsageMB(): string {
  const usage = process.memoryUsage();
  return `${Math.round(usage.rss / 1024 / 1024)} MB`;
}

export async function adminHealthRoutes(app: FastifyInstance) {
  app.get<{ Reply: HealthResponse }>(
    "/admin/health",
    { preHandler: [requireAuth, requireRole("admin")] },
    async (_request, reply) => {
      const now = new Date();
      const nowIso = now.toISOString();
      const apiUptime = Math.floor(process.uptime());
      const services: HealthService[] = [];

      // 1. Database health
      let dbStatus: "healthy" | "degraded" | "down" = "healthy";
      let dbLatencyMs: number | null = null;
      let dbSize = "—";
      let dbConnections = 0;

      try {
        const start = Date.now();
        await pool.query("SELECT 1");
        dbLatencyMs = Date.now() - start;
        dbSize = await getDatabaseSize();
        dbConnections = await getDatabaseConnections();
      } catch {
        dbStatus = "down";
      }

      services.push({
        id: "database",
        name: "Database",
        status: dbStatus,
        description: "PostgreSQL 16 — primary data store",
        uptime: apiUptime,
        lastCheck: nowIso,
        metrics: [
          { label: "Connections", value: String(dbConnections) },
          { label: "Storage", value: dbSize },
          { label: "Latency", value: dbLatencyMs !== null ? `${dbLatencyMs}ms` : "—" },
        ],
      });

      // 2. MQTT broker health
      const mqtt = await checkMqttConnectivity();
      services.push({
        id: "mqtt",
        name: "MQTT Broker",
        status: mqtt.connected ? "healthy" : "down",
        description: "Mosquitto message broker for device telemetry",
        uptime: mqtt.connected ? apiUptime : 0,
        lastCheck: nowIso,
        metrics: [
          { label: "Host", value: `${MQTT_HOST}:${MQTT_PORT}` },
          { label: "Status", value: mqtt.connected ? "Connected" : "Unreachable" },
          { label: "Latency", value: mqtt.connected ? `${mqtt.latency}ms` : "—" },
        ],
      });

      // 3. Bridge (Socket.IO connection to realtime service)
      const bridge = getBridgeStatus();
      services.push({
        id: "bridge",
        name: "Realtime Bridge",
        status: bridge.connected ? "healthy" : "down",
        description: "Socket.IO gateway connecting MQTT events to the web application",
        uptime: bridge.connected ? apiUptime : 0,
        lastCheck: nowIso,
        metrics: [
          { label: "Connected", value: bridge.connected ? "Yes" : "No" },
          { label: "Realtime URL", value: bridge.url },
          { label: "Status", value: bridge.connected ? "Active" : "Disconnected" },
        ],
      });

      // 4. Simulator activity
      const simulator = await checkSimulatorActivity();
      services.push({
        id: "simulator",
        name: "Device Simulator",
        status: simulator.active ? "healthy" : simulator.deviceCount > 0 ? "degraded" : "down",
        description: "Faker-based device telemetry simulator for development and testing",
        uptime: simulator.active ? apiUptime : 0,
        lastCheck: nowIso,
        metrics: [
          { label: "Simulated Devices", value: String(simulator.deviceCount) },
          {
            label: "Last Event",
            value: simulator.secondsSinceLastEvent > 0
              ? `${simulator.secondsSinceLastEvent}s ago`
              : "Never",
          },
          { label: "Status", value: simulator.active ? "Active" : simulator.deviceCount > 0 ? "Idle" : "Offline" },
        ],
      });

      // 5. API service — runs inside the process itself
      const apiMemory = getMemoryUsageMB();
      services.push({
        id: "api",
        name: "API Service",
        status: "healthy",
        description: "REST API — Fastify 5 + Drizzle ORM + PostgreSQL",
        uptime: apiUptime,
        lastCheck: nowIso,
        metrics: [
          { label: "Uptime", value: formatUptime(apiUptime) },
          { label: "Memory", value: apiMemory },
          { label: "DB Latency", value: dbLatencyMs !== null ? `${dbLatencyMs}ms` : "—" },
        ],
      });

      // Compute overall status
      const hasDown = services.some((s) => s.status === "down");
      const hasDegraded = services.some((s) => s.status === "degraded");
      const overallStatus = hasDown ? "down" : hasDegraded ? "degraded" : "healthy";

      return reply.send({
        overallStatus,
        lastChecked: nowIso,
        services,
      });
    },
  );
}
