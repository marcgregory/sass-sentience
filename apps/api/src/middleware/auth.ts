import type { FastifyReply, FastifyRequest } from "fastify";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  name: string;
}

/**
 * Require the user to be authenticated.
 * Attaches `request.user` with the decoded JWT payload.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    reply.status(401).send({ message: "Unauthorized", code: "UNAUTHORIZED" });
  }
}

/**
 * Require the user to have a specific role.
 * Must be used after `requireAuth`.
 */
export function requireRole(...roles: string[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as JwtPayload | undefined;
    if (!user || !roles.includes(user.role)) {
      reply.status(403).send({ message: "Forbidden", code: "FORBIDDEN" });
    }
  };
}
