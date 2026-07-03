import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { env } from "./config";
import { db, pool } from "./db";
import { registerErrorHandler } from "./lib/errors";

// ─── Type augmentation ────────────────────────────────────────────

type DbInstance = typeof db;

declare module "fastify" {
  interface FastifyInstance {
    db: DbInstance;
  }
  interface FastifyRequest {
    db: DbInstance;
  }
}

// ─── Route Imports ─────────────────────────────────────────────────
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { roleRoutes } from "./routes/roles";
import { deviceRoutes } from "./routes/devices";
import { eventRoutes } from "./routes/events";
import { alertRoutes } from "./routes/alerts";
import { reportRoutes } from "./routes/reports";
import { settingRoutes } from "./routes/settings";
import { auditLogRoutes } from "./routes/audit-logs";

let app: FastifyInstance | undefined;

async function main() {
  app = Fastify({
    logger: {
      transport: {
        target: "pino-pretty",
        options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" },
      },
    },
  });

  // ─── Plugins ────────────────────────────────────────────────────

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: "24h" },
  });

  // ─── Error Handler ──────────────────────────────────────────────

  registerErrorHandler(app);

  // ─── Decorate with db ───────────────────────────────────────────

  app.decorate("db", db);

  // ─── Routes ─────────────────────────────────────────────────────

  await app.register(healthRoutes, { prefix: "/api" });
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(userRoutes, { prefix: "/api/users" });
  await app.register(roleRoutes, { prefix: "/api/roles" });
  await app.register(deviceRoutes, { prefix: "/api/devices" });
  await app.register(eventRoutes, { prefix: "/api/events" });
  await app.register(alertRoutes, { prefix: "/api/alerts" });
  await app.register(reportRoutes, { prefix: "/api/reports" });
  await app.register(settingRoutes, { prefix: "/api/settings" });
  await app.register(auditLogRoutes, { prefix: "/api/audit-logs" });

  // ─── Start ──────────────────────────────────────────────────────

  try {
    // Verify DB connection
    await pool.query("SELECT 1");
    app.log.info("Database connected");

    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API server listening on http://${env.HOST}:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ─────────────────────────────────────────────

const signals: NodeJS.Signals[] = ["SIGINT", "SIGTERM"];
for (const signal of signals) {
  process.on(signal, async () => {
    console.log(`\n[api] Received ${signal}, shutting down...`);
    if (app) {
      await app.close();
    }
    await pool.end();
    process.exit(0);
  });
}

main();
