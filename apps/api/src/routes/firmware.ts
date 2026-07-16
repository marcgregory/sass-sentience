import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { firmwarePackages, rollouts } from "../db/schema";
import { eq, and, ilike, or, count, asc, desc, sql, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const createFirmwareSchema = z.object({
  name: z.string().min(1).max(128),
  version: z.string().min(1).max(64),
  deviceType: z.array(z.string().min(1)).min(1).max(20),
  releaseNotes: z.string().max(4096).optional().nullable(),
  fileHash: z.string().max(128).optional().nullable(),
  fileSize: z.number().int().min(0).optional().nullable(),
});

const updateFirmwareSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  version: z.string().min(1).max(64).optional(),
  deviceType: z.array(z.string().min(1)).min(1).max(20).optional(),
  releaseNotes: z.string().max(4096).optional().nullable(),
  fileHash: z.string().max(128).optional().nullable(),
  fileSize: z.number().int().min(0).optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

const listFirmwareQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["name", "version", "status", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.enum(["active", "deprecated"]).optional(),
});

export async function firmwareRoutes(app: FastifyInstance) {
  // ─── List firmware packages ──────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = listFirmwareQuerySchema.parse(request.query);

    const page = query.page;
    const limit = query.limit;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(firmwarePackages.name, pattern),
          ilike(firmwarePackages.version, pattern),
        ) as SQL,
      );
    }

    if (query.status) {
      conditions.push(eq(firmwarePackages.status, query.status));
    }

    const where = conditions.length > 0 ? (and(...conditions) as SQL) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(firmwarePackages)
      .where(where);

    const sortField =
      query.sort === "name"
        ? firmwarePackages.name
        : query.sort === "version"
          ? firmwarePackages.version
          : query.sort === "status"
            ? firmwarePackages.status
            : firmwarePackages.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(firmwarePackages)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Create firmware package ─────────────────────────────────────────────
  app.post(
    "/",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const user = request.user as JwtPayload;
      const body = createFirmwareSchema.parse(request.body);

      const [created] = await db
        .insert(firmwarePackages)
        .values({
          name: body.name,
          version: body.version,
          deviceType: body.deviceType,
          releaseNotes: body.releaseNotes ?? null,
          fileHash: body.fileHash ?? null,
          fileSize: body.fileSize ?? null,
          status: "active",
          createdBy: user.sub,
        })
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "create",
        resource: "FirmwarePackage",
        resourceId: created.id,
        description: `Firmware package "${body.name} v${body.version}" created (active)`,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.status(201).send(created);
    },
  );

  // ─── Single firmware package ─────────────────────────────────────────────
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [pkg] = await db
      .select()
      .from(firmwarePackages)
      .where(eq(firmwarePackages.id, id))
      .limit(1);

    if (!pkg) {
      return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
    }

    return reply.send(pkg);
  });

  // ─── Update firmware package metadata ────────────────────────────────────
  app.patch(
    "/:id",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;
      const body = updateFirmwareSchema.parse(request.body);

      const [existing] = await db
        .select({ id: firmwarePackages.id, name: firmwarePackages.name, version: firmwarePackages.version })
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (body.name !== undefined) updateData.name = body.name;
      if (body.version !== undefined) updateData.version = body.version;
      if (body.deviceType !== undefined) updateData.deviceType = body.deviceType;
      if (body.releaseNotes !== undefined) updateData.releaseNotes = body.releaseNotes;
      if (body.fileHash !== undefined) updateData.fileHash = body.fileHash;
      if (body.fileSize !== undefined) updateData.fileSize = body.fileSize;
      if (body.metadata !== undefined) updateData.metadata = body.metadata;

      const [updated] = await db
        .update(firmwarePackages)
        .set(updateData)
        .where(eq(firmwarePackages.id, id))
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "update",
        resource: "FirmwarePackage",
        resourceId: id,
        description: `Firmware package "${existing.name} v${existing.version}" updated`,
        details: { changes: Object.keys(updateData).filter((k) => k !== "updatedAt") },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─── Deprecate firmware package ──────────────────────────────────────────
  app.post(
    "/:id/deprecate",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      const [existing] = await db
        .select()
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      if (existing.status !== "active") {
        return reply.status(409).send({
          message: `Firmware package is already "${existing.status}"`,
          code: "INVALID_TRANSITION",
        });
      }

      const [updated] = await db
        .update(firmwarePackages)
        .set({ status: "deprecated", updatedAt: new Date() })
        .where(eq(firmwarePackages.id, id))
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "update",
        resource: "FirmwarePackage",
        resourceId: id,
        description: `Firmware package "${existing.name} v${existing.version}" deprecated`,
        details: { previousStatus: "active", newStatus: "deprecated" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─── Reactivate firmware package ─────────────────────────────────────────
  app.post(
    "/:id/activate",
    { preHandler: [requireAuth, requireRole("admin", "support")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      const [existing] = await db
        .select()
        .from(firmwarePackages)
        .where(eq(firmwarePackages.id, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      if (existing.status !== "deprecated") {
        return reply.status(409).send({
          message: `Firmware package is already "${existing.status}"`,
          code: "INVALID_TRANSITION",
        });
      }

      const [updated] = await db
        .update(firmwarePackages)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(firmwarePackages.id, id))
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "update",
        resource: "FirmwarePackage",
        resourceId: id,
        description: `Firmware package "${existing.name} v${existing.version}" reactivated`,
        details: { previousStatus: "deprecated", newStatus: "active" },
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send(updated);
    },
  );

  // ─── Delete firmware package ─────────────────────────────────────────────
  app.delete(
    "/:id",
    { preHandler: [requireAuth, requireRole("admin")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

      // Guard: prevent deletion if the package is referenced by any rollout
      const [referenced] = await db
        .select({ count: count() })
        .from(rollouts)
        .where(eq(rollouts.firmwarePackageId, id));

      if (referenced && referenced.count > 0) {
        return reply.status(409).send({
          message: `Cannot delete firmware package: ${referenced.count} rollout(s) reference it`,
          code: "HAS_ACTIVE_ROLLOUTS",
        });
      }

      const [deleted] = await db
        .delete(firmwarePackages)
        .where(eq(firmwarePackages.id, id))
        .returning({ id: firmwarePackages.id, name: firmwarePackages.name, version: firmwarePackages.version });

      if (!deleted) {
        return reply.status(404).send({ message: "Firmware package not found", code: "NOT_FOUND" });
      }

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "delete",
        resource: "FirmwarePackage",
        resourceId: id,
        description: `Firmware package "${deleted.name} v${deleted.version}" deleted`,
        ipAddress: request.ip,
        userAgent: request.headers["user-agent"],
      });

      return reply.send({ success: true });
    },
  );
}
