import type { FastifyInstance } from "fastify";
import { z } from "zod";
import crypto from "crypto";
import { db } from "../db";
import { apiKeys } from "../db/schema";
import { eq, and, count, desc, ilike, or, SQL } from "drizzle-orm";
import { requireAuth, requireRole, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

const createApiKeySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  expiresAt: z.string().datetime().optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  status: z.enum(["active", "expired", "revoked"]).optional(),
});

/**
 * Generate a masked representation of an API key.
 * Shows only the prefix "sk-" + first 4 chars + "..." + last 4 chars.
 */
function maskApiKey(key: string): string {
  return `sk-${key.slice(3, 7)}...${key.slice(-4)}`;
}

export async function apiKeyRoutes(app: FastifyInstance) {
  // List API keys (admin only)
  app.get("/", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const query = request.query as {
      status?: string;
      search?: string;
      page?: string;
      limit?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.status && ["active", "expired", "revoked"].includes(query.status)) {
      conditions.push(eq(apiKeys.status, query.status as "active" | "expired" | "revoked"));
    }

    if (query.search) {
      conditions.push(
        or(ilike(apiKeys.name, `%${query.search}%`))!,
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(apiKeys)
      .where(where);

    const result = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        maskedKey: apiKeys.maskedKey,
        status: apiKeys.status,
        createdBy: apiKeys.createdBy,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        requestCount: apiKeys.requestCount,
      })
      .from(apiKeys)
      .where(where)
      .orderBy(desc(apiKeys.createdAt))
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

  // Get single API key (admin only)
  app.get("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [key] = await db
      .select({
        id: apiKeys.id,
        name: apiKeys.name,
        maskedKey: apiKeys.maskedKey,
        status: apiKeys.status,
        createdBy: apiKeys.createdBy,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        requestCount: apiKeys.requestCount,
      })
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!key) {
      return reply.status(404).send({ message: "API key not found", code: "NOT_FOUND" });
    }

    return reply.send(key);
  });

  // Create API key (admin only)
  app.post("/", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const body = createApiKeySchema.parse(request.body);
    const user = request.user as JwtPayload;

    // Generate a cryptographically secure API key
    const rawKey = `sk-${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const maskedKey = maskApiKey(rawKey);

    const [created] = await db
      .insert(apiKeys)
      .values({
        name: body.name,
        keyHash,
        maskedKey,
        status: "active",
        createdBy: user.sub,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        requestCount: 0,
      })
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        maskedKey: apiKeys.maskedKey,
        status: apiKeys.status,
        createdBy: apiKeys.createdBy,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
      });

    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "create",
      resource: "ApiKey",
      resourceId: created.id,
      description: `API key "${body.name}" created`,
      details: { name: body.name, maskedKey: created.maskedKey },
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.status(201).send({
      ...created,
      fullKey: rawKey, // Only returned on creation
      message: "Make sure to copy your API key now. You won't be able to see it again.",
    });
  });

  // Update API key (admin only) — rename or revoke
  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateApiKeySchema.parse(request.body);

    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.status !== undefined) updateData.status = body.status;

    if (Object.keys(updateData).length === 0) {
      return reply.status(400).send({ message: "No fields to update", code: "NO_UPDATES" });
    }

    // If revoking, record the time
    if (body.status === "revoked") {
      updateData.lastUsedAt = new Date();
    }

    const [updated] = await db
      .update(apiKeys)
      .set(updateData)
      .where(eq(apiKeys.id, id))
      .returning({
        id: apiKeys.id,
        name: apiKeys.name,
        maskedKey: apiKeys.maskedKey,
        status: apiKeys.status,
        createdBy: apiKeys.createdBy,
        createdAt: apiKeys.createdAt,
        expiresAt: apiKeys.expiresAt,
        lastUsedAt: apiKeys.lastUsedAt,
        requestCount: apiKeys.requestCount,
      });

    if (!updated) {
      return reply.status(404).send({ message: "API key not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    const changeDesc = body.status === "revoked"
      ? `API key "${updated.name}" revoked`
      : body.name ? `API key renamed to "${body.name}"` : "API key updated";

    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: body.status === "revoked" ? "delete" : "update",
      resource: "ApiKey",
      resourceId: id,
      description: changeDesc,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });

  // Delete API key (admin only)
  app.delete("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);

    const [deleted] = await db
      .delete(apiKeys)
      .where(eq(apiKeys.id, id))
      .returning({ id: apiKeys.id });

    if (!deleted) {
      return reply.status(404).send({ message: "API key not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;

    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "delete",
      resource: "ApiKey",
      resourceId: id,
      description: "API key deleted",
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.status(204).send();
  });
}
