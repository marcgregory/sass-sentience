import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { roles, rolePermissions } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const grantPermissionSchema = z.object({
  resource: z.string().min(1),
  action: z.string().min(1),
});

export async function roleRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (_request, reply) => {
    const result = await db.select().from(roles);

    return reply.send({ data: result });
  });

  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

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

  app.post("/:id/permissions", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = grantPermissionSchema.parse(request.body);

    // Verify role exists
    const [role] = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
    if (!role) {
      return reply.status(404).send({ message: "Role not found", code: "NOT_FOUND" });
    }

    // Check for duplicate
    const [existing] = await db
      .select()
      .from(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, id),
          eq(rolePermissions.resource, body.resource),
          eq(rolePermissions.action, body.action),
        ),
      )
      .limit(1);

    if (existing) {
      return reply.send(existing);
    }

    const [permission] = await db
      .insert(rolePermissions)
      .values({
        roleId: id,
        resource: body.resource,
        action: body.action,
      })
      .returning();

    return reply.status(201).send(permission);
  });

  app.delete("/:id/permissions", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const query = request.query as { resource?: string; action?: string };

    if (!query.resource || !query.action) {
      return reply.status(400).send({ message: "resource and action query params are required", code: "VALIDATION_ERROR" });
    }

    const [deleted] = await db
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, id),
          eq(rolePermissions.resource, query.resource),
          eq(rolePermissions.action, query.action),
        ),
      )
      .returning({ id: rolePermissions.id });

    if (!deleted) {
      return reply.status(404).send({ message: "Permission not found", code: "NOT_FOUND" });
    }

    return reply.status(204).send();
  });
}
