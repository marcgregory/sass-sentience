import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { roles, rolePermissions } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middleware/auth";

export async function roleRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (_request, reply) => {
    const result = await db.select().from(roles);

    return reply.send({ data: result });
  });

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);

    if (!role) {
      return reply.status(404).send({ message: "Role not found", code: "NOT_FOUND" });
    }

    const permissions = await db
      .select()
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, id));

    return reply.send({ ...role, permissions });
  });
}
