import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { notificationRules } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";

const updateRuleSchema = z.object({
  enabled: z.boolean().optional(),
  severityThreshold: z.enum(["critical", "warning", "info"]).optional(),
  channels: z.array(z.enum(["email", "web", "push", "sms"])).optional(),
  cooldownMinutes: z.number().int().min(0).max(1440).optional(),
  rolePreferences: z.record(z.boolean()).optional(),
});

export async function notificationRuleRoutes(app: FastifyInstance) {
  // List all notification rules (admin only)
  app.get("/", { preHandler: [requireAuth, requireRole("admin")] }, async (_request, reply) => {
    const result = await db
      .select()
      .from(notificationRules)
      .orderBy(notificationRules.alertType);

    return reply.send({ data: result });
  });

  // Get a single notification rule (admin only)
  app.get("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [rule] = await db
      .select()
      .from(notificationRules)
      .where(eq(notificationRules.id, id))
      .limit(1);

    if (!rule) {
      return reply.status(404).send({ message: "Notification rule not found", code: "NOT_FOUND" });
    }

    return reply.send(rule);
  });

  // Update a notification rule (admin only)
  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateRuleSchema.parse(request.body);

    const updateData: Record<string, unknown> = { ...body, updatedAt: new Date() };

    // Channels need special handling for the postgres array type
    if (body.channels !== undefined) {
      updateData.channels = body.channels;
    }

    const [updated] = await db
      .update(notificationRules)
      .set(updateData)
      .where(eq(notificationRules.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Notification rule not found", code: "NOT_FOUND" });
    }

    return reply.send(updated);
  });
}
