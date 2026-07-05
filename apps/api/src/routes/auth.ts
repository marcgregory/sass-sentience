import type { FastifyInstance } from "fastify";
import { z } from "zod";
import bcrypt from "bcrypt";
import { db } from "../db";
import { users, roles } from "../db/schema";
import { eq } from "drizzle-orm";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user by email, joining with roles table to get role name
    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        passwordHash: users.passwordHash,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        avatar: users.avatar,
        customerId: users.customerId,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.email, body.email))
      .limit(1);

    if (!result) {
      return reply.status(401).send({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Verify password with bcrypt (cost factor 12)
    const passwordValid = await bcrypt.compare(body.password, result.passwordHash);
    if (!passwordValid) {
      return reply.status(401).send({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!result.isActive) {
      return reply.status(403).send({
        message: "Account is deactivated",
        code: "ACCOUNT_DISABLED",
      });
    }

    // Generate JWT — embed role name (not UUID) so frontend can use it directly
    // Embed customerId so downstream middleware can scope queries per tenant
    const token = app.jwt.sign({
      sub: result.id,
      email: result.email,
      role: result.roleName,
      name: result.name,
      customerId: result.customerId,
    });

    return reply.send({
      token,
      user: {
        id: result.id,
        email: result.email,
        name: result.name,
        role: result.roleName,
        isActive: result.isActive,
        mfaEnabled: result.mfaEnabled,
        avatar: result.avatar,
      },
    });
  });

  app.get("/me", async (request, reply) => {
    await request.jwtVerify();
    const payload = request.user as { sub: string; email: string; role: string; name: string };

    const [result] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        mfaEnabled: users.mfaEnabled,
        avatar: users.avatar,
        lastLogin: users.lastLogin,
        createdAt: users.createdAt,
        roleName: roles.name,
      })
      .from(users)
      .innerJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!result) {
      return reply.status(404).send({ message: "User not found", code: "NOT_FOUND" });
    }

    return reply.send({
      id: result.id,
      email: result.email,
      name: result.name,
      role: result.roleName,
      isActive: result.isActive,
      mfaEnabled: result.mfaEnabled,
      avatar: result.avatar,
      lastLogin: result.lastLogin,
      createdAt: result.createdAt,
    });
  });
}
