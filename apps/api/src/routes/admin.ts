import type { FastifyInstance } from "fastify";
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