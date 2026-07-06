import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { alerts } from "../db/schema";
import { eq, and, count, SQL, asc, desc } from "drizzle-orm";
import { requireAuth, requireRole, customerScope, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

const updateAlertSchema = z.object({
  status: z.enum(["open", "acknowledged", "resolved"]),
  resolution: z.string().optional(),
  acknowledgedBy: z.string().uuid().optional(),
  resolvedBy: z.string().uuid().optional(),
});

export async function alertRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as {
      severity?: string;
      status?: string;
      category?: string;
      device_id?: string;
      estate_id?: string;
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
        eq(alerts.severity, query.severity as typeof alerts.$inferSelect.severity),
      );
    }

    if (query.status) {
      conditions.push(
        eq(alerts.status, query.status as typeof alerts.$inferSelect.status),
      );
    }

    if (query.category) {
      conditions.push(eq(alerts.category, query.category));
    }

    if (query.device_id) {
      conditions.push(eq(alerts.deviceId, query.device_id));
    }

    if (query.estate_id) {
      conditions.push(eq(alerts.estateId, query.estate_id));
    }

    // ── Customer data isolation ────────────────────────────────────────
    const scopeCondition = await customerScope(user, alerts.estateId);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(alerts)
      .where(where);

    const sortField = query.sort === "title" ? alerts.title : alerts.occurredAt;
    const orderBy = query.order === "asc" ? asc(sortField) : desc(sortField);

    const result = await db
      .select()
      .from(alerts)
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
    const user = request.user as JwtPayload;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const conditions: SQL[] = [eq(alerts.id, id)];

    // ── Customer data isolation ────────────────────────────────────────
    const scopeCondition = await customerScope(user, alerts.estateId);
    if (scopeCondition) {
      conditions.push(scopeCondition);
    }

    const [alert] = await db.select().from(alerts).where(and(...conditions)).limit(1);

    if (!alert) {
      return reply.status(404).send({ message: "Alert not found", code: "NOT_FOUND" });
    }

    return reply.send(alert);
  });

  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateAlertSchema.parse(request.body);

    const updateData: Record<string, unknown> = {
      status: body.status,
      updatedAt: new Date(),
    };

    if (body.status === "acknowledged" && body.acknowledgedBy) {
      updateData.acknowledgedBy = body.acknowledgedBy;
      updateData.acknowledgedAt = new Date();
    }

    if (body.status === "resolved") {
      updateData.resolvedBy = body.resolvedBy;
      updateData.resolvedAt = new Date();
      updateData.resolution = body.resolution;
    }

    const [updated] = await db
      .update(alerts)
      .set(updateData)
      .where(eq(alerts.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Alert not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "update",
      resource: "Alert",
      resourceId: id,
      description: `Alert ${body.status === "acknowledged" ? "acknowledged" : "resolved"} — ${updated.title}`,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });
}
