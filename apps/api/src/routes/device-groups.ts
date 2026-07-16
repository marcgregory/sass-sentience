import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { deviceGroups } from "../db/schema";
import { eq, ilike, and, or, count, asc, desc, type SQL } from "drizzle-orm";
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
