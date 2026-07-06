import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { sites, estates, devices } from "../db/schema";
import { eq, ilike, and, or, asc, desc, count, inArray, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const createSiteSchema = z.object({
  name: z.string().min(1),
  estateId: z.string().uuid(),
  address: z.string().min(1),
  buildingCount: z.number().int().min(1).optional().default(1),
  floorCount: z.number().int().min(1).optional().default(1),
  roomCount: z.number().int().min(1).optional().default(1),
});

const updateSiteSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  buildingCount: z.number().int().min(1).optional(),
  floorCount: z.number().int().min(1).optional(),
  roomCount: z.number().int().min(1).optional(),
});

/**
 * Compute customer-scoped estate IDs for a user.
 * Platform roles see all estates; customer roles see only their own.
 */
async function getScopedEstateIds(user: JwtPayload): Promise<string[] | null> {
  if (!user.customerId) return null; // platform role — no scoping

  const custEstates = await db
    .select({ id: estates.id })
    .from(estates)
    .where(eq(estates.customerId, user.customerId));

  const ids = custEstates.map((e) => e.id);
  return ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"];
}

export async function siteRoutes(app: FastifyInstance) {
  // ─── List sites ──────────────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as {
      estate_id?: string;
      search?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    // ── Customer data isolation ───────────────────────────────────────
    if (user.customerId) {
      const scopedIds = await getScopedEstateIds(user);
      conditions.push(inArray(sites.estateId, scopedIds!) as SQL);
    }

    // ── Estate filter ─────────────────────────────────────────────────
    if (query.estate_id) {
      conditions.push(eq(sites.estateId, query.estate_id) as SQL);
    }

    // ── Search ───────────────────────────────────────────────────────
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(sites.name, pattern),
          ilike(sites.address, pattern),
        ) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) as SQL : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(sites)
      .where(where);

    const sortField = query.sort === "name" ? sites.name : sites.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(sites)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Attach estate names
    const estateIds = [...new Set(result.map((s) => s.estateId))];
    const estateMap = new Map<string, string>();
    if (estateIds.length > 0) {
      const estateRows = await db
        .select({ id: estates.id, name: estates.name })
        .from(estates)
        .where(inArray(estates.id, estateIds));
      for (const e of estateRows) {
        estateMap.set(e.id, e.name);
      }
    }

    const data = result.map((s) => ({
      ...s,
      estateName: estateMap.get(s.estateId) ?? null,
    }));

    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Single site ────────────────────────────────────────────────────
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [site] = await db.select().from(sites).where(eq(sites.id, id)).limit(1);

    if (!site) {
      return reply.status(404).send({ message: "Site not found", code: "NOT_FOUND" });
    }

    // Customer isolation
    if (user.customerId) {
      const [estate] = await db
        .select({ customerId: estates.customerId })
        .from(estates)
        .where(eq(estates.id, site.estateId))
        .limit(1);

      if (!estate || estate.customerId !== user.customerId) {
        return reply.status(404).send({ message: "Site not found", code: "NOT_FOUND" });
      }
    }

    // Attach estate name
    const [estate] = await db
      .select({ name: estates.name })
      .from(estates)
      .where(eq(estates.id, site.estateId))
      .limit(1);

    return reply.send({ ...site, estateName: estate?.name ?? null });
  });

  // ─── Create site ────────────────────────────────────────────────────
  app.post("/", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const body = createSiteSchema.parse(request.body);

    const [created] = await db.insert(sites).values(body).returning();

    // Update parent estate's siteCount
    const [{ count: newCount }] = await db
      .select({ count: count() })
      .from(sites)
      .where(eq(sites.estateId, body.estateId));

    await db
      .update(estates)
      .set({ siteCount: newCount, updatedAt: new Date() })
      .where(eq(estates.id, body.estateId));

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "create",
      resource: "Site",
      resourceId: created.id,
      description: `Site "${body.name}" created`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.status(201).send(created);
  });

  // ─── Update site ────────────────────────────────────────────────────
  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateSiteSchema.parse(request.body);

    const [updated] = await db
      .update(sites)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(sites.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Site not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "update",
      resource: "Site",
      resourceId: id,
      description: `Site "${updated.name}" updated`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });

  // ─── Delete site ────────────────────────────────────────────────────
  app.delete("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    // Check for existing devices
    const [{ deviceCount }] = await db
      .select({ deviceCount: count() })
      .from(devices)
      .where(eq(devices.siteId, id));

    if (deviceCount > 0) {
      return reply.status(409).send({
        message: `Cannot delete site with ${deviceCount} device(s). Remove all devices first.`,
        code: "HAS_RELATED_RECORDS",
      });
    }

    const [site] = await db
      .select({ estateId: sites.estateId })
      .from(sites)
      .where(eq(sites.id, id))
      .limit(1);

    const [deleted] = await db
      .delete(sites)
      .where(eq(sites.id, id))
      .returning({ id: sites.id });

    if (!deleted) {
      return reply.status(404).send({ message: "Site not found", code: "NOT_FOUND" });
    }

    // Update parent estate's siteCount
    if (site) {
      const [{ count: newCount }] = await db
        .select({ count: count() })
        .from(sites)
        .where(eq(sites.estateId, site.estateId));

      await db
        .update(estates)
        .set({ siteCount: newCount, updatedAt: new Date() })
        .where(eq(estates.id, site.estateId));
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "delete",
      resource: "Site",
      resourceId: id,
      description: "Site deleted",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send({ success: true });
  });
}
