import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { events } from "../db/schema";
import { eq, and, count, ilike, gte, lte, or, asc, desc, SQL } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function eventRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      severity?: string;
      category?: string;
      device_id?: string;
      estate_id?: string;
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

    if (query.severity) {
      conditions.push(
        eq(events.severity, query.severity as typeof events.$inferSelect.severity),
      );
    }

    if (query.category) {
      conditions.push(eq(events.category, query.category));
    }

    if (query.device_id) {
      conditions.push(eq(events.deviceId, query.device_id));
    }

    if (query.estate_id) {
      conditions.push(eq(events.estateId, query.estate_id));
    }

    if (query.start_date) {
      conditions.push(gte(events.occurredAt, new Date(query.start_date)));
    }

    if (query.end_date) {
      conditions.push(lte(events.occurredAt, new Date(query.end_date)));
    }

    if (query.search) {
      conditions.push(
        or(
          ilike(events.title, `%${query.search}%`),
          ilike(events.description, `%${query.search}%`),
        )!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(events)
      .where(where);

    const sortField = query.sort === "title" ? events.title : events.occurredAt;
    const orderBy = query.order === "asc" ? asc(sortField) : desc(sortField);

    const result = await db
      .select()
      .from(events)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset);

    return reply.send({
      data: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [event] = await db.select().from(events).where(eq(events.id, id)).limit(1);

    if (!event) {
      return reply.status(404).send({ message: "Event not found", code: "NOT_FOUND" });
    }

    return reply.send(event);
  });
}
