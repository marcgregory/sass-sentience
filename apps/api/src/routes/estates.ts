import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { estates, sites, devices } from "../db/schema";
import { eq, ilike, and, or, asc, desc, count, inArray, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, customerScope, type JwtPayload } from "../middleware/auth";

// ─── Zod Schemas ─────────────────────────────────────────────────────────

const createEstateSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  region: z.string().min(1),
  country: z.string().min(1),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(1),
  customerId: z.string().uuid().optional(),
});

const updateEstateSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  country: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().min(1).optional(),
});

export async function estateRoutes(app: FastifyInstance) {
  // ─── List estates ─────────────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as {
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
      conditions.push(eq(estates.customerId, user.customerId) as SQL);
    }

    // ── Search ────────────────────────────────────────────────────────
    if (query.search) {
      const pattern = `%${query.search}%`;
      conditions.push(
        or(
          ilike(estates.name, pattern),
          ilike(estates.address, pattern),
          ilike(estates.region, pattern),
          ilike(estates.city, pattern),
        ) as SQL,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) as SQL : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(estates)
      .where(where);

    const sortField = query.sort === "name" ? estates.name : estates.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(estates)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  });

  // ─── Single estate ───────────────────────────────────────────────────
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [estate] = await db.select().from(estates).where(eq(estates.id, id)).limit(1);

    if (!estate) {
      return reply.status(404).send({ message: "Estate not found", code: "NOT_FOUND" });
    }

    // Customer isolation
    if (user.customerId && estate.customerId !== user.customerId) {
      return reply.status(404).send({ message: "Estate not found", code: "NOT_FOUND" });
    }

    return reply.send(estate);
  });

  // ─── Create estate ───────────────────────────────────────────────────
  app.post("/", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const body = createEstateSchema.parse(request.body);

    // Admins can optionally specify a customerId; otherwise default to the
    // admin's own customer association (if any) or a platform-level estate.
    const customerId = body.customerId ?? user.customerId;

    const [created] = await db
      .insert(estates)
      .values({ ...body, customerId: customerId ?? "" })
      .returning();

    return reply.status(201).send(created);
  });

  // ─── Update estate ───────────────────────────────────────────────────
  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateEstateSchema.parse(request.body);

    const [updated] = await db
      .update(estates)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(estates.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Estate not found", code: "NOT_FOUND" });
    }

    return reply.send(updated);
  });

  // ─── Delete estate ───────────────────────────────────────────────────
  app.delete("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    // Check for existing sites
    const [{ siteCount }] = await db
      .select({ siteCount: count() })
      .from(sites)
      .where(eq(sites.estateId, id));

    if (siteCount > 0) {
      return reply.status(409).send({
        message: `Cannot delete estate with ${siteCount} site(s). Remove all sites first.`,
        code: "HAS_RELATED_RECORDS",
      });
    }

    const [deleted] = await db
      .delete(estates)
      .where(eq(estates.id, id))
      .returning({ id: estates.id });

    if (!deleted) {
      return reply.status(404).send({ message: "Estate not found", code: "NOT_FOUND" });
    }

    return reply.send({ success: true });
  });
}
