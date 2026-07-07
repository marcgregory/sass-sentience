import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { auditLogs } from "../db/schema";
import { eq, and, count, ilike, or, gte, lte, asc, desc, SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function auditLogRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      action?: string;
      resource?: string;
      search?: string;
      start_date?: string;
      end_date?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.action) {
      conditions.push(eq(auditLogs.action, query.action));
    }

    if (query.resource) {
      conditions.push(eq(auditLogs.resource, query.resource));
    }

    if (query.start_date) {
      conditions.push(gte(auditLogs.createdAt, new Date(query.start_date)));
    }

    if (query.end_date) {
      conditions.push(lte(auditLogs.createdAt, new Date(query.end_date)));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(auditLogs.userName, `%${query.search}%`),
          ilike(auditLogs.description, `%${query.search}%`),
          ilike(auditLogs.resource, `%${query.search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(auditLogs)
      .where(where);

    const sortField = query.sort === "action" ? auditLogs.action : auditLogs.createdAt;
    const orderBy = query.order === "asc" ? asc(sortField) : desc(sortField);

    const result = await db
      .select()
      .from(auditLogs)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    // Add isSimulated: false for every persisted entry — the UI uses this
    // to distinguish real database records from client-side simulated entries.
    const data = result.map((entry) => ({ ...entry, isSimulated: false }));

    return reply.send({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.id, id)).limit(1);

    if (!entry) {
      return reply.status(404).send({ message: "Audit entry not found", code: "NOT_FOUND" });
    }

    return reply.send(entry);
  });
}
