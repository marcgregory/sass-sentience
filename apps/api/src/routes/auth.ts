import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import * as crypto from "crypto";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/login", async (request, reply) => {
    const body = loginSchema.parse(request.body);

    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);

    if (!user) {
      return reply.status(401).send({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Verify password (simple hash for dev — use bcrypt in production)
    const hash = crypto.createHash("sha256").update(body.password).digest("hex");
    if (user.passwordHash !== hash) {
      return reply.status(401).send({
        message: "Invalid email or password",
        code: "INVALID_CREDENTIALS",
      });
    }

    if (!user.isActive) {
      return reply.status(403).send({
        message: "Account is deactivated",
        code: "ACCOUNT_DISABLED",
      });
    }

    // Generate JWT
    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      role: user.roleId,
      name: user.name,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.roleId,
        isActive: user.isActive,
        mfaEnabled: user.mfaEnabled,
        avatar: user.avatar,
      },
    });
  });

  app.get("/me", async (request, reply) => {
    await request.jwtVerify();
    const payload = request.user as { sub: string; email: string; role: string; name: string };

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.sub))
      .limit(1);

    if (!user) {
      return reply.status(404).send({ message: "User not found", code: "NOT_FOUND" });
    }

    return reply.send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.roleId,
      isActive: user.isActive,
      mfaEnabled: user.mfaEnabled,
      avatar: user.avatar,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
    });
  });
}
