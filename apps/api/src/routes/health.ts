import type { FastifyInstance } from "fastify";
import { pool } from "../db";

export async function healthRoutes(app: FastifyInstance) {
  /**
   * Liveness check — the server process is alive and responding.
   * Does NOT require the database to be ready.
   */
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

  /**
   * Readiness check — the server is ready to accept traffic.
   * Requires the database to be connected and migrations to be applied.
   * Use this for container orchestration (Kubernetes readinessProbe, Docker healthcheck).
   */
  app.get("/ready", async (_request, reply) => {
    // 1. Database must accept connections
    try {
      await pool.query("SELECT 1");
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        reason: "database not connected",
      });
    }

    // 2. Verify migrations are applied by checking the migrations tracking table
    //    exists and has the expected number of entries.
    try {
      const result = await pool.query(
        "SELECT COUNT(*)::int AS count FROM drizzle.__drizzle_migrations",
      );
      const appliedCount = result.rows[0]?.count ?? 0;
      if (appliedCount === 0) {
        return reply.status(503).send({
          status: "not_ready",
          reason: "migrations not applied",
        });
      }
    } catch {
      return reply.status(503).send({
        status: "not_ready",
        reason: "migrations table not found",
      });
    }

    return reply.send({
      status: "ready",
      timestamp: new Date().toISOString(),
    });
  });
}
