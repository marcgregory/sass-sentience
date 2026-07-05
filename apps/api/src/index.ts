import Fastify from "fastify";
import type { FastifyInstance, FastifyRequest } from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./config";
import { db, pool } from "./db";
import { registerErrorHandler } from "./lib/errors";
import { initSocketIO } from "./socket";
import { connectBridgeListener } from "./socket/bridge-listener";

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
import { adminRoutes } from "./routes/admin";
import { apiKeyRoutes } from "./routes/api-keys";
import { notificationRoutes } from "./routes/notifications";
import { notificationRuleRoutes } from "./routes/notification-rules";

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
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // Allow empty JSON body (DELETE requests from frontend send Content-Type but no body)
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    if (body === "") {
      done(null, {});
      return;
    }
    try {
      done(null, JSON.parse(body as string));
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error("Invalid JSON");
      done(e, undefined);
    }
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // CSP managed by frontend
    crossOriginResourcePolicy: { policy: "same-origin" },
  });

  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
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
  await app.register(adminRoutes, { prefix: "/api/admin" });
  await app.register(apiKeyRoutes, { prefix: "/api/api-keys" });
  await app.register(notificationRoutes, { prefix: "/api/notifications" });
  await app.register(notificationRuleRoutes, { prefix: "/api/notification-rules" });

  // ─── Socket.IO (shares the same HTTP server) ────────────────────

  initSocketIO(app.server);

  // ─── Start ──────────────────────────────────────────────────────

  try {
    // Verify DB connection
    await pool.query("SELECT 1");
    app.log.info("Database connected");

    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`API server listening on http://${env.HOST}:${env.PORT}`);

    // Connect to the realtime bridge to listen for alert:created events
    // and persist them as notifications in the database.
    connectBridgeListener();
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
