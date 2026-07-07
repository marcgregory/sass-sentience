import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { users, devices, alerts } from "../db/schema";
import { count, eq } from "drizzle-orm";
import { env } from "../config";
import { requireAuth, requireRole } from "../middleware/auth";
import { logAuditEvent } from "../lib/audit";

interface RenderDeployResponse {
  id?: string;
  deploy?: {
    id?: string;
  };
}

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    "/stats",
    { preHandler: [requireAuth, requireRole("admin")] },
    async (_request, reply) => {
      const [userResult] = await db
        .select({ count: count() })
        .from(users);
      const [activeUserResult] = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.isActive, true));
      const [deviceResult] = await db
        .select({ count: count() })
        .from(devices);
      const [onlineResult] = await db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.status, "online"));
      const [offlineResult] = await db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.status, "offline"));
      const [faultResult] = await db
        .select({ count: count() })
        .from(devices)
        .where(eq(devices.status, "fault"));
      const [openAlertResult] = await db
        .select({ count: count() })
        .from(alerts)
        .where(eq(alerts.status, "open"));

      return reply.send({
        stats: {
          totalUsers: Number(userResult?.count ?? 0),
          activeUsers: Number(activeUserResult?.count ?? 0),
          totalDevices: Number(deviceResult?.count ?? 0),
          onlineDevices: Number(onlineResult?.count ?? 0),
          offlineDevices: Number(offlineResult?.count ?? 0),
          faultCount: Number(faultResult?.count ?? 0),
          openAlerts: Number(openAlertResult?.count ?? 0),
          platformVersion: "v1.5.x",
          systemUptime: process.uptime(),
        },
      });
    },
  );

  app.post(
    "/simulator/restart",
    { preHandler: [requireAuth, requireRole("admin")] },
    async (_request, reply) => {
      if (!env.RENDER_API_KEY || !env.RENDER_SIMULATOR_SERVICE_ID) {
        app.log.error("Render simulator restart is not configured");
        return reply.status(500).send({
          message: "Simulator restart is not configured",
          code: "RENDER_RESTART_NOT_CONFIGURED",
        });
      }

      const response = await fetch(
        `https://api.render.com/v1/services/${env.RENDER_SIMULATOR_SERVICE_ID}/deploys`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${env.RENDER_API_KEY}`,
          },
          body: JSON.stringify({ clearCache: "do_not_clear" }),
        },
      );

      const body = (await response.json().catch(() => ({}))) as RenderDeployResponse & {
        message?: string;
      };

      if (!response.ok) {
        app.log.error(
          { status: response.status, renderMessage: body.message },
          "Render simulator restart request failed",
        );
        return reply.status(502).send({
          message: "Unable to restart simulator service",
          code: "RENDER_RESTART_FAILED",
        });
      }

      const reqUser = _request.user as { sub: string; name: string; role: string } | undefined;
      await logAuditEvent({
        userId: reqUser?.sub ?? "system",
        userName: reqUser?.name ?? "System",
        userRole: reqUser?.role ?? "admin",
        action: "update",
        resource: "Simulator",
        description: "Simulator restart triggered",
        ipAddress: _request.ip,
        userAgent: _request.headers["user-agent"],
      });

      return reply.status(202).send({
        message: "Simulator restart triggered",
        deployId: body.deploy?.id ?? body.id ?? null,
      });
    },
  );
}