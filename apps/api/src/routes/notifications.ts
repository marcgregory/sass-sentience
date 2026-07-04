import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, and, count, desc, SQL } from "drizzle-orm";
import { requireAuth, type JwtPayload } from "../middleware/auth";
import { emitNotification } from "../socket/notifications-emitter";

const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  category: z.enum(["alert", "device", "system", "report", "user", "maintenance"]).default("system"),
  link: z.string().url().optional(),
});

export async function notificationRoutes(app: FastifyInstance) {
  // Create a new notification (admin or system internal)
  app.post("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const body = createNotificationSchema.parse(request.body);

    const [notification] = await db
      .insert(notifications)
      .values({
        userId: body.userId,
        title: body.title,
        message: body.message,
        priority: body.priority,
        category: body.category,
        link: body.link ?? null,
      })
      .returning();

    // Emit live event through the bridge
    emitNotification({
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title,
      message: notification.message,
      priority: notification.priority as "low" | "normal" | "high" | "critical",
      timestamp: notification.createdAt.toISOString(),
    });

    return reply.status(201).send(notification);
  });
  // List notifications for the current user
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as {
      is_read?: string;
      category?: string;
      priority?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    // Always scope to the authenticated user
    const conditions: SQL[] = [eq(notifications.userId, user.sub)];

    if (query.is_read === "true") {
      conditions.push(eq(notifications.isRead, true));
    } else if (query.is_read === "false") {
      conditions.push(eq(notifications.isRead, false));
    }

    if (query.category) {
      conditions.push(eq(notifications.category, query.category as any));
    }

    if (query.priority) {
      conditions.push(eq(notifications.priority, query.priority as any));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(notifications)
      .where(where);

    const result = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
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

  // Get unread count for the current user
  app.get("/unread-count", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;

    const [{ count: unreadCount }] = await db
      .select({ count: count() })
      .from(notifications)
      .where(
        and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)),
      );

    return reply.send({ unreadCount });
  });

  // Get a single notification
  app.get("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.sub)))
      .limit(1);

    if (!notification) {
      return reply.status(404).send({ message: "Notification not found", code: "NOT_FOUND" });
    }

    return reply.send(notification);
  });

  // Mark a single notification as read
  app.patch("/:id/read", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, user.sub)))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Notification not found", code: "NOT_FOUND" });
    }

    return reply.send(updated);
  });

  // Mark all notifications as read for the current user
  app.patch("/read-all", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;

    const [{ count: updatedCount }] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)))
      .returning({ id: notifications.id })
      .then((rows) => [{ count: rows.length }]);

    return reply.send({ updatedCount });
  });
}
