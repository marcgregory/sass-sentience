import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { customers } from "../db/schema";
import { asc } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function customerRoutes(app: FastifyInstance) {
  // ─── List customers ───────────────────────────────────────────────────
  app.get("/", { preHandler: [requireAuth] }, async (_request, reply) => {
    const result = await db
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .orderBy(asc(customers.name));

    return reply.send({ data: result });
  });
}
