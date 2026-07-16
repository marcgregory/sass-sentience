import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { deviceGroups, devices, sites, estates } from "../db/schema";
import { eq, ilike, and, or, count, asc, desc, inArray, sql, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const createGroupSchema = z.object({
  name: z.string().min(1).max(128),
  description: z.string().max(512).optional(),
  deviceIds: z.array(z.string().uuid()).optional().default([]),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  description: z.string().max(512).optional().nullable(),
  deviceIds: z.array(z.string().uuid()).optional(),
});

const listQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["name", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
});

const groupDeviceQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["name", "status", "type", "createdAt"]).optional().default("name"),
  order: z.enum(["asc", "desc"]).optional().default("asc"),
});

export async function deviceGroupRoutes(app: FastifyInstance) {
  // ─── List groups ──────────────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listQuerySchema.parse(request.query);

    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(deviceGroups.name, pattern),
          ilike(deviceGroups.description, pattern),
        ) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) as SQL : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(deviceGroups)
      .where(where);

    const sortField = query.sort === "name" ? deviceGroups.name : deviceGroups.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(deviceGroups)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Single group ─────────────────────────────────────────────────────
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [group] = await db.select().from(deviceGroups).where(eq(deviceGroups.id, id)).limit(1);

    if (!group) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    return reply.send(group);
  });

  // ─── Group devices (paginated, searchable, sortable) ──────────────────
  app.get("/:id/devices", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = groupDeviceQuerySchema.parse(request.query);

    // Verify group exists
    const [group] = await db
      .select({ deviceIds: deviceGroups.deviceIds })
      .from(deviceGroups)
      .where(eq(deviceGroups.id, id))
      .limit(1);

    if (!group) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;

    // If group has no devices, return empty result immediately
    if (group.deviceIds.length === 0) {
      return reply.send({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      });
    }

    const conditions: SQL[] = [inArray(devices.id, group.deviceIds)];

    if (query.search) {
      conditions.push(
        ilike(devices.name, `%${query.search}%`) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(devices)
      .where(where);

    const sortField =
      query.sort === "status" ? devices.status :
      query.sort === "type" ? devices.type :
      query.sort === "createdAt" ? devices.createdAt :
      devices.name;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select({
        id: devices.id,
        serialNumber: devices.serialNumber,
        name: devices.name,
        type: devices.type,
        status: devices.status,
        battery: devices.battery,
        signalStrength: devices.signalStrength,
        temperature: devices.temperature,
        uptime: devices.uptime,
        lastHeartbeat: devices.lastHeartbeat,
        siteId: devices.siteId,
        tags: devices.tags,
        createdAt: devices.createdAt,
        updatedAt: devices.updatedAt,
      })
      .from(devices)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Enrich with site/estate names
    const siteIds = [...new Set(result.map((d) => d.siteId))];
    const siteRows = siteIds.length > 0
      ? await db
          .select({
            id: sites.id,
            name: sites.name,
            estateId: sites.estateId,
          })
          .from(sites)
          .where(inArray(sites.id, siteIds))
      : [];
    const siteMap = new Map(siteRows.map((s) => [s.id, s]));

    const estateIds = [...new Set(siteRows.filter((s) => s.estateId).map((s) => s.estateId))];
    const estateRows = estateIds.length > 0
      ? await db
          .select({ id: estates.id, name: estates.name })
          .from(estates)
          .where(inArray(estates.id, estateIds))
      : [];
    const estateNameMap = new Map(estateRows.map((e) => [e.id, e.name]));

    const enriched = result.map((d) => {
      const site = siteMap.get(d.siteId);
      return {
        ...d,
        siteName: site?.name ?? null,
        estateName: site ? estateNameMap.get(site.estateId) ?? null : null,
      };
    });

    return reply.send({
      data: enriched,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Create group ─────────────────────────────────────────────────────
  app.post("/", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const body = createGroupSchema.parse(request.body);

    const [created] = await db
      .insert(deviceGroups)
      .values({
        name: body.name,
        description: body.description ?? null,
        deviceIds: body.deviceIds,
        deviceCount: body.deviceIds.length,
      })
      .returning();

    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "create",
      resource: "DeviceGroup",
      resourceId: created.id,
      description: `Device group "${body.name}" created with ${body.deviceIds.length} device(s)`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.status(201).send(created);
  });

  // ─── Update group ─────────────────────────────────────────────────────
  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateGroupSchema.parse(request.body);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.deviceIds !== undefined) {
      updateData.deviceIds = body.deviceIds;
      updateData.deviceCount = body.deviceIds.length;
    }

    const [updated] = await db
      .update(deviceGroups)
      .set(updateData)
      .where(eq(deviceGroups.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "update",
      resource: "DeviceGroup",
      resourceId: id,
      description: `Device group "${updated.name}" updated`,
      details: Object.keys(body).length > 0 ? { changed: Object.keys(body) } : undefined,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });

  // ─── Remove device from group ──────────────────────────────────────────
  /**
   * Atomic removal of a device from a group's deviceIds array using
   * PostgreSQL array_remove() — no read-modify-write race condition.
   */
  app.delete("/:groupId/devices/:deviceId", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const { groupId, deviceId } = z
      .object({ groupId: z.string().uuid(), deviceId: z.string().uuid() })
      .parse(request.params);

    // Verify group exists
    const [group] = await db
      .select({ id: deviceGroups.id, name: deviceGroups.name })
      .from(deviceGroups)
      .where(eq(deviceGroups.id, groupId))
      .limit(1);

    if (!group) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    // Atomically remove deviceId from the array
    const [updated] = await db
      .update(deviceGroups)
      .set({
        deviceIds: sql`array_remove(${deviceGroups.deviceIds}, ${deviceId}::uuid)`,
        deviceCount: sql`(SELECT COALESCE(array_length(array_remove(${deviceGroups.deviceIds}, ${deviceId}::uuid), 1), 0))`,
        updatedAt: new Date(),
      })
      .where(eq(deviceGroups.id, groupId))
      .returning({ id: deviceGroups.id, name: deviceGroups.name, deviceCount: deviceGroups.deviceCount });

    if (!updated) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "update",
      resource: "DeviceGroup",
      resourceId: groupId,
      description: `Device ${deviceId} removed from group "${group.name}"`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send({ success: true });
  });

  // ─── Delete group ─────────────────────────────────────────────────────
  app.delete("/:id", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [deleted] = await db
      .delete(deviceGroups)
      .where(eq(deviceGroups.id, id))
      .returning({ id: deviceGroups.id });

    if (!deleted) {
      return reply.status(404).send({ message: "Group not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "delete",
      resource: "DeviceGroup",
      resourceId: id,
      description: "Device group deleted",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send({ success: true });
  });
}
