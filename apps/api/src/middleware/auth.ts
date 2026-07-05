import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../db";
import { estates } from "../db/schema";
import { eq, inArray, type SQL } from "drizzle-orm";

export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
  name: string;
  customerId?: string | null;
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

/**
 * Compute a customer-scoping SQL condition for multi-tenant data access.
 *
 * - **Platform roles** (admin, support, installer — no customerId in JWT)
 *   see all records (no filter).
 * - **Customer roles** (have customerId) see only records belonging to
 *   estates owned by their customer.
 *
 * @param user — decoded JWT payload
 * @param estateIdColumn — the table column to filter by estate ID
 *   (e.g. `events.estateId`, `alerts.estateId`, `devices.siteId` via subquery)
 * @returns a SQL condition, or `undefined` when no scoping is needed
 */
export async function customerScope(
  user: JwtPayload,
  estateIdColumn: any,
): Promise<SQL | undefined> {
  if (!user.customerId) {
    // Platform role — no scoping
    return undefined;
  }

  // Customer role — find estate IDs belonging to this customer
  const customerEstates = await db
    .select({ id: estates.id })
    .from(estates)
    .where(eq(estates.customerId, user.customerId));

  const estateIds = customerEstates.map((e) => e.id);
  if (estateIds.length === 0) {
    // No estates → no data visible
    return eq(estates.id, "00000000-0000-0000-0000-000000000000") as unknown as SQL;
  }

  return inArray(estateIdColumn, estateIds) as unknown as SQL;
}
