import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { firmwarePackages } from "../db/schema";
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

const listFirmwareQuerySchema = z.object({
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sort: z.enum(["name", "version", "createdAt"]).optional().default("createdAt"),
  order: z.enum(["asc", "desc"]).optional().default("desc"),
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
        })
        .returning();

      await logAuditEvent({
        userId: user.sub,
        userName: user.name,
        userRole: user.role,
        action: "create",
        resource: "FirmwarePackage",
        resourceId: created.id,
        description: `Firmware package "${body.name} v${body.version}" created`,
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

  // ─── Delete firmware package ─────────────────────────────────────────────
  app.delete(
    "/:id",
    { preHandler: [requireAuth, requireRole("admin")] },
    async (request, reply) => {
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
      const user = request.user as JwtPayload;

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
