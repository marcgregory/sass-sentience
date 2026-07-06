import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { diagnosticTests, diagnosticResults, devices } from "../db/schema";
import { eq, and, desc, count, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const runDiagnosticSchema = z.object({
  testId: z.string().uuid(),
  deviceId: z.string().uuid(),
});

const listResultsSchema = z.object({
  deviceId: z.string().uuid().optional(),
  testId: z.string().uuid().optional(),
  status: z.enum(["passed", "failed", "warning"]).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Simulate running a diagnostic test.
 *
 * In a production system this would dispatch to a device-agent or MQTT
 * command. Here we simulate a realistic result based on the test type
 * and device state so the frontend has real-looking data to render.
 */
function simulateResult(
  testType: string,
  device: typeof devices.$inferSelect,
): { status: "passed" | "failed" | "warning"; message: string; details: Record<string, unknown>; durationMs: number } {
  // Base success probability weighted by device status
  const successWeight =
    device.status === "online" ? 0.92 :
    device.status === "warning" ? 0.65 :
    device.status === "fault" ? 0.30 : 0.10;

  const roll = Math.random();
  // Bias toward seed results matching status
  const outcome: "passed" | "failed" | "warning" =
    roll < successWeight ? "passed" :
    roll < successWeight + (1 - successWeight) * 0.6 ? "warning" :
    "failed";

  // Common detail generators
  const rssi = device.signalStrength ?? -70;
  const battery = device.battery ?? 50;

  switch (testType) {
    case "ping": {
      const success = outcome === "passed";
      return {
        status: outcome,
        message: success ? `Ping successful (${Math.round(Math.random() * 50 + 1)}ms, 0% loss)` : "Ping failed — no response after 10s",
        details: { success, latencyMs: success ? Math.round(Math.random() * 50 + 1) : null, packetLoss: success ? 0 : 100, ipAddress: "10.0.0." + Math.floor(Math.random() * 255) },
        durationMs: success ? Math.round(Math.random() * 3000 + 200) : 10000,
      };
    }
    case "connection": {
      const connected = outcome === "passed";
      return {
        status: outcome,
        message: connected ? "Connection verified — full data path operational" : "Connection timed out — device unreachable",
        details: { connected, roundTripMs: connected ? Math.round(Math.random() * 180 + 10) : null, hops: connected ? Math.round(Math.random() * 8 + 3) : null },
        durationMs: connected ? Math.round(Math.random() * 4000 + 500) : 15000,
      };
    }
    case "mqtt": {
      const connected = outcome !== "failed";
      return {
        status: outcome,
        message: connected ? "MQTT broker connected — messages flowing" : "MQTT connection failed — broker unreachable",
        details: { connected, broker: "mqtt://mosquitto:1883", lastMessage: new Date().toISOString(), messagesSent: Math.round(Math.random() * 1000 + 100), qos: 1 },
        durationMs: Math.round(Math.random() * 2000 + 300),
      };
    }
    case "signal": {
      const good = rssi >= -80;
      const fair = rssi >= -95;
      return {
        status: good ? "passed" : fair ? "warning" : "failed",
        message: good ? `Signal strength: ${rssi} dBm (excellent)` : fair ? `Signal strength: ${rssi} dBm (fair)` : `Signal strength: ${rssi} dBm (poor)`,
        details: { rssi, snr: Math.round(Math.random() * 30 + 10), linkQuality: good ? Math.round(Math.random() * 20 + 80) : fair ? Math.round(Math.random() * 20 + 60) : Math.round(Math.random() * 30 + 20), channel: Math.round(Math.random() * 12 + 1), noiseFloor: Math.round(Math.random() * 15 - 105) },
        durationMs: Math.round(Math.random() * 2000 + 500),
      };
    }
    case "battery": {
      return {
        status: battery >= 60 ? "passed" : battery >= 20 ? "warning" : "failed",
        message: battery >= 60 ? `Battery health: Good (${battery}%)` : battery >= 20 ? `Battery health: Fair (${battery}%)` : `Battery critical: ${battery}% — replace immediately`,
        details: { voltage: parseFloat((2.8 + battery / 100 * 1.2).toFixed(2)), capacity: battery, cycleCount: Math.round(Math.random() * 800 + 50), temperature: Math.round(Math.random() * 15 + 25), health: battery >= 60 ? "good" : battery >= 20 ? "fair" : "poor" },
        durationMs: Math.round(Math.random() * 2000 + 500),
      };
    }
    case "firmware": {
      const outdated = Math.random() < 0.15;
      return {
        status: outdated ? "warning" : "passed",
        message: outdated ? `Firmware update available: ${device.firmwareVersion ?? "1.0.0"} → 4.2.0` : `Firmware ${device.firmwareVersion ?? "1.0.0"} is up to date`,
        details: { currentVersion: device.firmwareVersion ?? "1.0.0", latestVersion: outdated ? "4.2.0" : device.firmwareVersion ?? "1.0.0", updateAvailable: outdated, releaseDate: outdated ? new Date(Date.now() - 7 * 86400_000).toISOString() : new Date(Date.now() - 30 * 86400_000).toISOString(), changelog: outdated ? "Security patches and performance improvements." : "No updates available." },
        durationMs: Math.round(Math.random() * 3000 + 1000),
      };
    }
    default:
      return { status: "passed", message: "Test completed successfully", details: {}, durationMs: 1000 };
  }
}

export async function diagnosticRoutes(app: FastifyInstance) {
  // ─── List available tests ─────────────────────────────────────────
  // Can optionally filter by deviceType to get only compatible tests.
  app.get("/tests", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as { deviceType?: string };

    const conditions: SQL[] = [eq(diagnosticTests.enabled, true)];

    if (query.deviceType) {
      // Filter tests that support this device type
      conditions.push(
        z.string().parse(query.deviceType) as unknown as SQL,
      );
    }

    const tests = await db
      .select()
      .from(diagnosticTests)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(diagnosticTests.sortOrder);

    // Post-filter by device type since it's a JSONB array
    let filtered = tests;
    if (query.deviceType) {
      filtered = tests.filter((t) => {
        const types = t.supportedDeviceTypes as string[];
        return types.includes(query.deviceType!);
      });
    }

    return reply.send({ tests: filtered });
  });

  // ─── Single test detail ────────────────────────────────────────────

  app.get("/tests/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [test] = await db
      .select()
      .from(diagnosticTests)
      .where(eq(diagnosticTests.id, id))
      .limit(1);

    if (!test) {
      return reply.status(404).send({ message: "Diagnostic test not found", code: "NOT_FOUND" });
    }

    return reply.send(test);
  });

  // ─── Run a diagnostic ──────────────────────────────────────────────
  // Simulates execution and stores the result.

  app.post("/run", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const body = runDiagnosticSchema.parse(request.body);

    // Verify test exists
    const [test] = await db
      .select()
      .from(diagnosticTests)
      .where(eq(diagnosticTests.id, body.testId))
      .limit(1);

    if (!test) {
      return reply.status(404).send({ message: "Diagnostic test not found", code: "NOT_FOUND" });
    }

    // Verify device exists
    const [device] = await db
      .select()
      .from(devices)
      .where(eq(devices.id, body.deviceId))
      .limit(1);

    if (!device) {
      return reply.status(404).send({ message: "Device not found", code: "NOT_FOUND" });
    }

    // Verify test supports this device type
    const supportedTypes = test.supportedDeviceTypes as string[];
    if (!supportedTypes.includes(device.type)) {
      return reply.status(400).send({
        message: `Test "${test.name}" does not support device type "${device.type}"`,
        code: "INCOMPATIBLE_TEST",
      });
    }

    // Simulate execution
    const startedAt = new Date();
    const result = simulateResult(test.type, device);
    const completedAt = new Date(startedAt.getTime() + result.durationMs);

    // Store result
    const [created] = await db
      .insert(diagnosticResults)
      .values({
        testId: test.id,
        deviceId: device.id,
        status: result.status,
        message: result.message,
        details: result.details,
        ranBy: user.sub,
        startedAt,
        completedAt,
        durationMs: result.durationMs,
      })
      .returning();

    return reply.status(201).send({
      ...created,
      testName: test.name,
      testType: test.type,
      deviceName: device.name,
      deviceType: device.type,
      ranByName: user.name,
    });
  });

  // ─── List results ──────────────────────────────────────────────────
  // Paginated, filterable by device, test, or status.

  app.get("/results", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listResultsSchema.parse(request.query);

    const conditions: SQL[] = [];

    if (query.deviceId) {
      conditions.push(eq(diagnosticResults.deviceId, query.deviceId));
    }
    if (query.testId) {
      conditions.push(eq(diagnosticResults.testId, query.testId));
    }
    if (query.status) {
      conditions.push(eq(diagnosticResults.status, query.status));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(diagnosticResults)
      .where(where);

    const offset = (query.page - 1) * query.limit;

    const rows = await db
      .select({
        id: diagnosticResults.id,
        testId: diagnosticResults.testId,
        deviceId: diagnosticResults.deviceId,
        status: diagnosticResults.status,
        message: diagnosticResults.message,
        details: diagnosticResults.details,
        ranBy: diagnosticResults.ranBy,
        startedAt: diagnosticResults.startedAt,
        completedAt: diagnosticResults.completedAt,
        durationMs: diagnosticResults.durationMs,
        testName: diagnosticTests.name,
        testType: diagnosticTests.type,
        deviceName: devices.name,
        deviceType: devices.type,
      })
      .from(diagnosticResults)
      .leftJoin(diagnosticTests, eq(diagnosticResults.testId, diagnosticTests.id))
      .leftJoin(devices, eq(diagnosticResults.deviceId, devices.id))
      .where(where)
      .orderBy(desc(diagnosticResults.completedAt))
      .limit(query.limit)
      .offset(offset);

    const data = rows.map((r) => ({
      id: r.id,
      testId: r.testId,
      testName: r.testName ?? "Unknown",
      testType: (r.testType ?? "ping") as any,
      deviceId: r.deviceId,
      deviceName: r.deviceName ?? "Unknown",
      deviceType: (r.deviceType ?? "controller") as any,
      status: r.status,
      message: r.message,
      details: r.details,
      ranBy: r.ranBy,
      ranByName: "",
      startedAt: r.startedAt.toISOString(),
      completedAt: r.completedAt.toISOString(),
      durationMs: r.durationMs,
    }));

    return reply.send({
      data,
      pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    });
  });

  // ─── Single result ─────────────────────────────────────────────────

  app.get("/results/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [row] = await db
      .select({
        id: diagnosticResults.id,
        testId: diagnosticResults.testId,
        deviceId: diagnosticResults.deviceId,
        status: diagnosticResults.status,
        message: diagnosticResults.message,
        details: diagnosticResults.details,
        ranBy: diagnosticResults.ranBy,
        startedAt: diagnosticResults.startedAt,
        completedAt: diagnosticResults.completedAt,
        durationMs: diagnosticResults.durationMs,
        testName: diagnosticTests.name,
        testType: diagnosticTests.type,
        deviceName: devices.name,
        deviceType: devices.type,
      })
      .from(diagnosticResults)
      .leftJoin(diagnosticTests, eq(diagnosticResults.testId, diagnosticTests.id))
      .leftJoin(devices, eq(diagnosticResults.deviceId, devices.id))
      .where(eq(diagnosticResults.id, id))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ message: "Diagnostic result not found", code: "NOT_FOUND" });
    }

    return reply.send({
      id: row.id,
      testId: row.testId,
      testName: row.testName ?? "Unknown",
      testType: (row.testType ?? "ping") as any,
      deviceId: row.deviceId,
      deviceName: row.deviceName ?? "Unknown",
      deviceType: (row.deviceType ?? "controller") as any,
      status: row.status,
      message: row.message,
      details: row.details,
      ranBy: row.ranBy,
      ranByName: "",
      startedAt: row.startedAt.toISOString(),
      completedAt: row.completedAt.toISOString(),
      durationMs: row.durationMs,
    });
  });
}
