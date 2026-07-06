import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { settings } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

const updateSettingSchema = z.object({
  value: z.any(),
});

export async function settingRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (_request, reply) => {
    const result = await db.select().from(settings);
    return reply.send({ data: result });
  });

  app.patch("/:key", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { key } = request.params as { key: string };
    const body = updateSettingSchema.parse(request.body);

    const [updated] = await db
      .update(settings)
      .set({ value: body.value, updatedAt: new Date() })
      .where(eq(settings.key, key))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Setting not found", code: "NOT_FOUND" });
    }

    const user = request.user as { sub: string; name: string; role: string };
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "config_change",
      resource: "Settings",
      resourceId: key,
      description: `Setting "${key}" changed`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });
}
