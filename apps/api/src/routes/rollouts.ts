import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { rollouts, rolloutDevices, firmwarePackages, deviceGroups, devices } from "../db/schema";
import { eq, and, or, ilike, count, asc, desc, inArray, sql, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createRolloutSchema = z.object({
  name: z.string().min(1).max(128),
  firmwarePackageId: z.string().uuid(),
  targetGroupId: z.string().uuid(),
});

const listRolloutQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["name", "status", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["draft", "running", "completed", "failed", "cancelled"]).optional(),
});

const deviceStatusQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  status: z.enum(["pending", "running", "succeeded", "failed", "skipped", "cancelled"]).optional(),
});

// ─── Valid state transitions ─────────────────────────────────────────────────

/** Valid rollout status transitions — returns false if transition is invalid. */
function isValidRolloutTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    draft: ["running"],
    running: ["completed", "failed", "cancelled"],
    completed: [],
    failed: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

/** Valid device status transitions — for retry: failed → pending */
function isValidDeviceTransition(from: string, to: string): boolean {
  const allowed: Record<string, string[]> = {
    pending: ["running", "skipped", "cancelled"],
    running: ["succeeded", "failed"],
    succeeded: [],
    failed: ["pending"], // retry
    skipped: [],
    cancelled: [],
  };
  return allowed[from]?.includes(to) ?? false;
}

export async function rolloutRoutes(app: FastifyInstance) {
  // ─── Create rollout ──────────────────────────────────────────────────────
  app.post(
    "/",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const body = createRolloutSchema.parse(request.body);

      // Verify firmware package exists
      const [fw] = await db
        .select({ id: firmwarePackages.id })
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, body.firmwarePackageId))
        .limit(1);

      if (!fw) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      // Verify device group exists and get its devices
      const [group] = await db
        .select({ id: deviceGroups.id, name: deviceGroups.name, deviceIds: deviceGroups.deviceIds })
        .from(deviceGroups)
        .where(eq(deviceGroups.id, body.targetGroupId))
        .limit(1);

      if (!group) {
        return reply.status(404).send({ message: "Device group not found", code: "NOT_FOUND" });
      }

      if (group.deviceIds.length === 0) {
        return reply.status(400).send({
          message: "Device group has no devices",
          code: "EMPTY_GROUP",
        });
      }

      // Create the rollout in draft status
      const [created] = await db
        .insert(rollouts)
        .values({
          jobType: "firmware",
          name: body.name,
          firmwarePackageId: body.firmwarePackageId,
          targetGroupId: body.targetGroupId,
          status: "draft",
          deviceCount: group.deviceIds.length,
          completedCount: 0,
          failedCount: 0,
          createdBy: user.sub,
        })
        .returning();

      // Create per-device tracking entries
      const deviceEntries = group.deviceIds.map((deviceId) => ({
        rolloutId: created.id,
        deviceId,
        status: "pending" as const,
      }));

      // Batch insert device entries (Drizzle's bulk insert)
      await db.insert(rolloutDevices).values(
        deviceEntries.map((d) => ({
          rolloutId: d.rolloutId,
          deviceId: d.deviceId,
          status: d.status,
        })),
      );

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "firmware_rollout",
        resource: "Rollout",
        resourceId: created.id,
        description: `Rollout "${body.name}" created targeting group "${group.name}" with ${group.deviceIds.length} device(s)`,
        details: { targetGroupId: body.targetGroupId, firmwarePackageId: body.firmwarePackageId, deviceCount: group.deviceIds.length },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(created);
    },
  );

  // ─── List rollouts ──────────────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listRolloutQuerySchema.parse(request.query);

    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(rollouts.jobType, "firmware")];

    if (query.search) {
      conditions.push(ilike(rollouts.name, `%${query.search}%`) as SQL);
    }

    if (query.status) {
      conditions.push(eq(rollouts.status, query.status));
    }

    const where = conditions.length > 0 ? (and(...conditions) as SQL) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(rollouts)
      .where(where);

    const sortField =
      query.sort === "name"
        ? rollouts.name
        : query.sort === "status"
          ? rollouts.status
          : rollouts.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(rollouts)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Single rollout ─────────────────────────────────────────────────────
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [rollout] = await db
      .select()
      .from(rollouts)
      .where(eq(rollouts.id, id))
      .limit(1);

    if (!rollout) {
      return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
    }

    // Enrich with firmware and group names
    let firmwareName: string | null = null;
    if (rollout.firmwarePackageId) {
      const [fw] = await db
        .select({ name: firmwarePackages.name, version: firmwarePackages.version })
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, rollout.firmwarePackageId))
        .limit(1);
      if (fw) {
        firmwareName = `${fw.name} v${fw.version}`;
      }
    }

    const [group] = await db
      .select({ name: deviceGroups.name })
      .from(deviceGroups)
      .where(eq(deviceGroups.id, rollout.targetGroupId))
      .limit(1);

    return reply.send({
      ...rollout,
      firmwareName,
      targetGroupName: group?.name ?? null,
    });
  });

  // ─── Per-device status ───────────────────────────────────────────────────
  app.get("/:id/devices", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = deviceStatusQuerySchema.parse(request.query);

    // Verify rollout exists
    const [rollout] = await db
      .select({ id: rollouts.id })
      .from(rollouts)
      .where(eq(rollouts.id, id))
      .limit(1);

    if (!rollout) {
      return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
    }

    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [eq(rolloutDevices.rolloutId, id)];

    if (query.status) {
      conditions.push(eq(rolloutDevices.status, query.status));
    }

    const where = conditions.length > 0 ? (and(...conditions) as SQL) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(rolloutDevices)
      .where(where);

    const result = await db
      .select()
      .from(rolloutDevices)
      .where(where)
      .orderBy(asc(rolloutDevices.deviceId))
      .limit(limit)
      .offset(offset);

    // Enrich with device names
    const deviceIds = result.map((rd) => rd.deviceId);
    const deviceRows = deviceIds.length > 0
      ? await db
          .select({ id: devices.id, name: devices.name, serialNumber: devices.serialNumber })
          .from(devices)
          .where(inArray(devices.id, deviceIds))
      : [];
    const deviceMap = new Map(deviceRows.map((d) => [d.id, d]));

    const enriched = result.map((rd) => ({
      ...rd,
      deviceName: deviceMap.get(rd.deviceId)?.name ?? null,
      deviceSerial: deviceMap.get(rd.deviceId)?.serialNumber ?? null,
    }));

    return reply.send({
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Start rollout (draft → running) ────────────────────────────────────
  app.post(
    "/:id/start",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      const [rollout] = await db
        .select()
        .from(rollouts)
        .where(eq(rollouts.id, id))
        .limit(1);

      if (!rollout) {
        return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
      }

      if (!isValidRolloutTransition(rollout.status, "running")) {
        return reply.status(409).send({
          message: `Cannot start rollout in "${rollout.status}" status`,
          code: "INVALID_TRANSITION",
        });
      }

      const [updated] = await db
        .update(rollouts)
        .set({ status: "running", startedAt: new Date(), updatedAt: new Date() })
        .where(eq(rollouts.id, id))
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "firmware_rollout",
        resource: "Rollout",
        resourceId: id,
        description: `Rollout "${rollout.name}" started`,
        details: { previousStatus: rollout.status, newStatus: "running" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─── Cancel rollout ─────────────────────────────────────────────────────
  app.post(
    "/:id/cancel",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      const [rollout] = await db
        .select()
        .from(rollouts)
        .where(eq(rollouts.id, id))
        .limit(1);

      if (!rollout) {
        return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
      }

      if (!isValidRolloutTransition(rollout.status, "cancelled")) {
        return reply.status(409).send({
          message: `Cannot cancel rollout in "${rollout.status}" status`,
          code: "INVALID_TRANSITION",
        });
      }

      const [updated] = await db
        .update(rollouts)
        .set({ status: "cancelled", cancelledAt: new Date(), updatedAt: new Date() })
        .where(eq(rollouts.id, id))
        .returning();

      // Mark pending devices as cancelled (in-flight devices continue)
      await db
        .update(rolloutDevices)
        .set({ status: "cancelled" })
        .where(
          and(
            eq(rolloutDevices.rolloutId, id),
            eq(rolloutDevices.status, "pending"),
          ),
        );

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "firmware_rollout",
        resource: "Rollout",
        resourceId: id,
        description: `Rollout "${rollout.name}" cancelled`,
        details: { previousStatus: rollout.status, newStatus: "cancelled" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─── Retry failed devices ───────────────────────────────────────────────
  app.post(
    "/:id/retry",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      const [rollout] = await db
        .select()
        .from(rollouts)
        .where(eq(rollouts.id, id))
        .limit(1);

      if (!rollout) {
        return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
      }

      // Allow retry on running, completed, or failed rollouts
      if (!["running", "completed", "failed"].includes(rollout.status)) {
        return reply.status(409).send({
          message: `Cannot retry rollout in "${rollout.status}" status`,
          code: "INVALID_TRANSITION",
        });
      }

      // Reset failed devices back to pending
      const result = await db
        .update(rolloutDevices)
        .set({ status: "pending", errorMessage: null, startedAt: null, completedAt: null })
        .where(
          and(
            eq(rolloutDevices.rolloutId, id),
            eq(rolloutDevices.status, "failed"),
          ),
        )
        .returning({ id: rolloutDevices.id });

      const retriedCount = result.length;

      // If rollout was terminal, move it back to running if there's work to do
      if (["completed", "failed"].includes(rollout.status) && retriedCount > 0) {
        await db
          .update(rollouts)
          .set({ status: "running", failedCount: 0, updatedAt: new Date() })
          .where(eq(rollouts.id, id));
      }

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "firmware_rollout",
        resource: "Rollout",
        resourceId: id,
        description: `Rollout "${rollout.name}" — ${retriedCount} failed device(s) queued for retry`,
        details: { retriedCount, rolloutStatus: rollout.status },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ success: true, retriedCount });
    },
  );

  // ─── Eligibility preview ────────────────────────────────────────────────
  app.get(
    "/:id/eligibility",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

      const [rollout] = await db
        .select({ targetGroupId: rollouts.targetGroupId, firmwarePackageId: rollouts.firmwarePackageId })
        .from(rollouts)
        .where(eq(rollouts.id, id))
        .limit(1);

      if (!rollout) {
        return reply.status(404).send({ message: "Rollout not found", code: "NOT_FOUND" });
      }

      const [group] = await db
        .select({ deviceIds: deviceGroups.deviceIds })
        .from(deviceGroups)
        .where(eq(deviceGroups.id, rollout.targetGroupId))
        .limit(1);

      if (!group || group.deviceIds.length === 0) {
        return reply.send({ eligibleCount: 0, ineligibleCount: 0, eligibleDevices: [], ineligibleDevices: [] });
      }

      // Fetch devices with their current firmware version info (stored as tags or metadata)
      // For MVP, we use device type as the compatibility check
      let fw: { deviceType: string[] } | undefined;

      if (rollout.firmwarePackageId) {
        const [fwResult] = await db
          .select({ deviceType: firmwarePackages.deviceType })
          .from(firmwarePackages)
          .where(eq(firmwarePackages.id, rollout.firmwarePackageId))
          .limit(1);
        fw = fwResult;
      }

      const deviceRows = await db
        .select({ id: devices.id, name: devices.name, type: devices.type, status: devices.status })
        .from(devices)
        .where(inArray(devices.id, group.deviceIds));

      const eligible: typeof deviceRows = [];
      const ineligible: Array<(typeof deviceRows)[number] & { reason: string }> = [];

      for (const device of deviceRows) {
        if (fw && fw.deviceType.length > 0 && !fw.deviceType.includes(device.type)) {
          ineligible.push({ ...device, reason: `Device type "${device.type}" not compatible with this firmware` });
        } else if (device.status !== "online") {
          ineligible.push({ ...device, reason: `Device is "${device.status}" (must be online)` });
        } else {
          eligible.push(device);
        }
      }

      return reply.send({
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
        eligibleDevices: eligible,
        ineligibleDevices: ineligible,
      });
    },
  );

  // ─── Rollout eligibility preview (pre-creation, by group) ───────────────
  app.get(
    "/eligibility/group/:groupId/package/:firmwarePackageId",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { groupId, firmwarePackageId } = z
        .object({ groupId: z.string().uuid(), firmwarePackageId: z.string().uuid() })
        .parse(request.params);

      // Verify resources exist
      const [group] = await db
        .select({ deviceIds: deviceGroups.deviceIds })
        .from(deviceGroups)
        .where(eq(deviceGroups.id, groupId))
        .limit(1);

      if (!group) {
        return reply.status(404).send({ message: "Device group not found", code: "NOT_FOUND" });
      }

      const [fw] = await db
        .select({ deviceType: firmwarePackages.deviceType })
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, firmwarePackageId))
        .limit(1);

      if (!fw) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      if (group.deviceIds.length === 0) {
        return reply.send({ eligibleCount: 0, ineligibleCount: 0, eligibleDevices: [], ineligibleDevices: [] });
      }

      const deviceRows = await db
        .select({ id: devices.id, name: devices.name, type: devices.type, status: devices.status })
        .from(devices)
        .where(inArray(devices.id, group.deviceIds));

      const eligible: typeof deviceRows = [];
      const ineligible: Array<(typeof deviceRows)[number] & { reason: string }> = [];

      for (const device of deviceRows) {
        if (fw.deviceType.length > 0 && !fw.deviceType.includes(device.type)) {
          ineligible.push({ ...device, reason: `Device type "${device.type}" not compatible` });
        } else if (device.status !== "online") {
          ineligible.push({ ...device, reason: `Device is "${device.status}" (must be online)` });
        } else {
          eligible.push(device);
        }
      }

      return reply.send({
        eligibleCount: eligible.length,
        ineligibleCount: ineligible.length,
        eligibleDevices: eligible,
        ineligibleDevices: ineligible,
      });
    },
  );
}
