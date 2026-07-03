import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { users, roles } from "../db/schema";
import { eq, ilike, and, or, asc, desc, count, SQL } from "drizzle-orm";
import { requireAuth, requireRole } from "../middleware/auth";
import * as crypto from "crypto";

// ─── Shared Columns ─────────────────────────────────────────────────────────
const userWithRole = {
  id: users.id,
  email: users.email,
  name: users.name,
  avatar: users.avatar,
  roleId: users.roleId,
  role: roles.name,
  isActive: users.isActive,
  mfaEnabled: users.mfaEnabled,
  customerId: users.customerId,
  lastLogin: users.lastLogin,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
};

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1),
  roleId: z.string().uuid(),
  customerId: z.string().uuid().optional(),
  avatar: z.string().optional(),
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  roleId: z.string().uuid().optional(),
  isActive: z.boolean().optional(),
  avatar: z.string().optional(),
});

export async function userRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const query = request.query as {
      search?: string;
      role?: string;
      status?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.search) {
      conditions.push(
        or(
          ilike(users.name, `%${query.search}%`),
          ilike(users.email, `%${query.search}%`),
        )!,
      );
    }

    if (query.role) {
      conditions.push(eq(users.roleId, query.role));
    }

    if (query.status === "active") {
      conditions.push(eq(users.isActive, true));
    } else if (query.status === "inactive") {
      conditions.push(eq(users.isActive, false));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(users)
      .where(where);

    const sortField = query.sort === "email" ? users.email : users.name;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select(userWithRole)
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
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

    const [user] = await db
      .select(userWithRole)
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ message: "User not found", code: "NOT_FOUND" });
    }

    return reply.send(user);
  });

  app.post("/", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const body = createUserSchema.parse(request.body);

    // Check for duplicate email
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (existing) {
      return reply.status(409).send({
        message: "Email already in use",
        code: "EMAIL_CONFLICT",
      });
    }

    const hash = crypto.createHash("sha256").update(body.password).digest("hex");

    const [newUser] = await db
      .insert(users)
      .values({
        email: body.email,
        passwordHash: hash,
        name: body.name,
        roleId: body.roleId,
        customerId: body.customerId,
        avatar: body.avatar,
      })
      .returning({ id: users.id });

    // Fetch the created user with role name
    const [created] = await db
      .select(userWithRole)
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, newUser.id))
      .limit(1);

    return reply.status(201).send(created);
  });

  app.patch("/:id", { preHandler: [requireAuth] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = updateUserSchema.parse(request.body);

    const [updated] = await db
      .update(users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    if (!updated) {
      return reply.status(404).send({ message: "User not found", code: "NOT_FOUND" });
    }

    // Fetch the updated user with role name
    const [updatedUser] = await db
      .select(userWithRole)
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id))
      .limit(1);

    return reply.send(updatedUser);
  });

  app.delete("/:id", { preHandler: [requireAuth, requireRole("admin")] }, async (request, reply) => {
    const { id } = request.params as { id: string };

    const [deactivated] = await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning({ id: users.id, isActive: users.isActive });

    if (!deactivated) {
      return reply.status(404).send({ message: "User not found", code: "NOT_FOUND" });
    }

    return reply.send(deactivated);
  });
}
