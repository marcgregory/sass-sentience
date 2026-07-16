import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { devices, sites, estates } from "../db/schema";
import { eq, and, count, ilike, SQL, asc, desc, inArray, sql } from "drizzle-orm";
import { requireAuth, requireRole, customerScope, type JwtPayload } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

const updateDeviceSchema = z.object({
  name: z.string().min(1).optional(),
  status: z.enum(["online", "offline", "fault", "warning"]).optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  lastMaintenance: z.string().optional(),
  firmwareVersion: z.string().optional(),
  firmwareBuild: z.string().optional(),
  firmwareReleasedAt: z.string().optional(),
  firmwareInstalledAt: z.string().optional(),
  deviceConfig: z.any().optional(),
  deviceIo: z.any().optional(),
});

export async function deviceRoutes(app: FastifyInstance) {
  app.get("/", { preHandler: [requireAuth] }, async (request, reply) => {
    const user = request.user as JwtPayload;
    const query = request.query as {
      site_id?: string;
      estate_id?: string;
      status?: string;
      type?: string;
      tags?: string;
      search?: string;
      page?: string;
      limit?: string;
      sort?: string;
      order?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? "1"));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? "20")));
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.status) {
      conditions.push(eq(devices.status, query.status as typeof devices.$inferSelect.status));
    }

    if (query.type) {
      conditions.push(eq(devices.type, query.type as typeof devices.$inferSelect.type));
    }

    if (query.site_id) {
      conditions.push(eq(devices.siteId, query.site_id));
    }

    if (query.estate_id) {
      // Find sites for this estate
      const estateSites = await db
        .select({ id: sites.id })
        .from(sites)
        .where(eq(sites.estateId, query.estate_id));
      const siteIds = estateSites.map((s) => s.id);
      if (siteIds.length > 0) {
        conditions.push(inArray(devices.siteId, siteIds));
      }
    }

    if (query.search) {
      conditions.push(
        ilike(devices.name, `%${query.search}%`) as SQL,
      );
    }

    if (query.tags) {
      const tagList = query.tags.split(",").map((t) => t.trim()).filter(Boolean);
      if (tagList.length > 0) {
        // Filter where tags JSONB array contains ANY of the requested tags
        const tagConditions = tagList.map(
          (tag) => sql`${devices.tags} ? ${tag}`,
        );
        // Combine with OR using reduce
        const combined = tagConditions.reduce((acc, curr) => sql`${acc} OR ${curr}`);
        conditions.push(combined);
      }
    }

    // ── Customer data isolation ────────────────────────────────────────
    // Customer users see only devices belonging to their own estates.
    if (user.customerId) {
      const custEstates = await db
        .select({ id: estates.id })
        .from(estates)
        .where(eq(estates.customerId, user.customerId));
      const custEstateIds = custEstates.map((e) => e.id);
      if (custEstateIds.length > 0) {
        const custSites = await db
          .select({ id: sites.id })
          .from(sites)
          .where(inArray(sites.estateId, custEstateIds));
        const custSiteIds = custSites.map((s) => s.id);
        if (custSiteIds.length > 0) {
          conditions.push(inArray(devices.siteId, custSiteIds));
        } else {
          conditions.push(eq(devices.id, "00000000-0000-0000-0000-000000000000"));
        }
      } else {
        conditions.push(eq(devices.id, "00000000-0000-0000-0000-000000000000"));
      }
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(devices)
      .where(where);

    const sortField = query.sort === "name" ? devices.name : devices.createdAt;
    const orderBy = query.order === "desc" ? desc(sortField) : asc(sortField);

    const result = await db
      .select()
      .from(devices)
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

    const [device] = await db.select().from(devices).where(eq(devices.id, id)).limit(1);

    if (!device) {
      return reply.status(404).send({ message: "Device not found", code: "NOT_FOUND" });
    }

    // Fetch site and estate for context (also used for customer isolation check)
    const [site] = await db.select().from(sites).where(eq(sites.id, device.siteId)).limit(1);
    let estateName: string | undefined;
    if (site) {
      const [estate] = await db
        .select({ name: estates.name, customerId: estates.customerId })
        .from(estates)
        .where(eq(estates.id, site.estateId))
        .limit(1);

      // ── Customer data isolation ────────────────────────────────────
      // Customer users cannot access devices outside their own estates.
      if (user.customerId && estate?.customerId !== user.customerId) {
        return reply.status(404).send({ message: "Device not found", code: "NOT_FOUND" });
      }

      estateName = estate?.name;
    } else if (user.customerId) {
      // Device has no site — customer users should not access it
      return reply.status(404).send({ message: "Device not found", code: "NOT_FOUND" });
    }

    return reply.send({
      ...device,
      siteName: site?.name,
      estateName,
    });
  });

  app.patch("/:id", { preHandler: [requireAuth, requireRole("admin", "support")] }, async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = updateDeviceSchema.parse(request.body);

    const { firmwareReleasedAt, firmwareInstalledAt, lastMaintenance, ...rest } = body;
    const updateData: Record<string, unknown> = { ...rest, updatedAt: new Date() };

    if (lastMaintenance) {
      updateData.lastMaintenance = new Date(lastMaintenance);
    }
    if (firmwareReleasedAt) {
      updateData.firmwareReleasedAt = new Date(firmwareReleasedAt);
    }
    if (firmwareInstalledAt) {
      updateData.firmwareInstalledAt = new Date(firmwareInstalledAt);
    }

    const [updated] = await db
      .update(devices)
      .set(updateData)
      .where(eq(devices.id, id))
      .returning();

    if (!updated) {
      return reply.status(404).send({ message: "Device not found", code: "NOT_FOUND" });
    }

    const user = request.user as JwtPayload;
    await logAuditEvent({
      userId: user.sub,
      userName: user.name,
      userRole: user.role,
      action: "update",
      resource: "Device",
      resourceId: id,
      description: `Device "${updated.name}" updated`,
      details: Object.keys(body).length > 0 ? { changed: Object.keys(body) } : undefined,
      ipAddress: request.ip,
      userAgent: request.headers["user-agent"],
    });

    return reply.send(updated);
  });
}
