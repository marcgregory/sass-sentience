import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async (_request, reply) => {
    let dbStatus = "healthy";
    let dbLatency: number | null = null;

    try {
      const start = Date.now();
      await pool.query("SELECT 1");
      dbLatency = Date.now() - start;
    } catch {
      dbStatus = "unhealthy";
    }

    return reply.send({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: {
        status: dbStatus,
        latency: dbLatency ? `${dbLatency}ms` : null,
      },
    });
  });
}
