/**
 * Socket.IO server — accepts connections from the Next.js frontend,
 * handles room subscriptions, and emits normalized MQTT events.
 *
 * Room naming convention:
 *   room:dashboard           — all connected clients (global)
 *   room:device:{deviceId}   — per-device updates
 *   room:site:{siteId}       — per-site updates
 *   room:estate:{estateId}   — per-estate updates
 *
 * Client events (matching ClientToServerEvents from socket-client.ts):
 *   subscribe(rooms: RoomSubscription[])  — join rooms
 *   unsubscribe(rooms: RoomSubscription[]) — leave rooms
 */

import { Server as SocketIOServer } from "socket.io";
import { createServer } from "net";
import jwt from "jsonwebtoken";

// ─── Re-export types for normalizer ─────────────────────────────────

export type DeviceStatusValue = "online" | "offline" | "fault" | "warning";

// ─── Room naming ───────────────────────────────────────────────────

export const ROOMS = {
  DASHBOARD: "room:dashboard",
  DEVICE: (id: string) => `room:device:${id}`,
  SITE: (id: string) => `room:site:${id}`,
  ESTATE: (id: string) => `room:estate:${id}`,
} as const;

// ─── Socket.IO Event Names (matching socket-client.ts ServerToClientEvents) ──

export const EVENTS = {
  DEVICE_STATUS: "device:status",
  DEVICE_TELEMETRY: "device:telemetry",
  DEVICE_DIAGNOSTIC: "device:diagnostic",
  ALERT_CREATED: "alert:created",
  ALERT_UPDATED: "alert:updated",
  NOTIFICATION_NEW: "notification:new",
  NOTIFICATION_UPDATED: "notification:updated",
  EVENT_NEW: "event:new",
  ESTATE_UPDATED: "estate:updated",
  SITE_UPDATED: "site:updated",
  USER_UPDATED: "user:updated",
  REPORT: "report",
  KPI_UPDATED: "kpi:updated",

  /** Emitted when the simulator fleet is reset/restarted */
  SIMULATOR_RESET: "simulator:reset",
} as const;

// ─── Room Subscription (matching socket-client.ts RoomSubscription) ─

export interface RoomSubscription {
  type: "estate" | "site" | "device";
  id: string;
}

// ─── Port check ────────────────────────────────────────────────────

/**
 * Check whether a TCP port is already in use.
 * Returns true if something is listening on the port.
 */
function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") resolve(true);
      else resolve(false);
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

// ─── Server ─────────────────────────────────────────────────────────

export interface SocketServerOptions {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  allowUnauthenticated: boolean;
}

export async function createSocketServer(
  options: SocketServerOptions,
): Promise<SocketIOServer> {
  const { port, corsOrigin, jwtSecret, allowUnauthenticated } = options;

  const inUse = await isPortInUse(port);
  if (inUse) {
    console.error(
      `[socket] ERROR: Port ${port} is already in use. Is another realtime bridge running?`,
    );
    console.error(
      `[socket]        Kill the existing process or use a different PORT/SOCKET_PORT.`,
    );
    process.exit(1);
  }

  const io = new SocketIOServer(port, {
    cors: {
      origin: corsOrigin,
      methods: ["GET", "POST"],
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  // ─── JWT Authentication middleware ───────────────────────────────

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      if (allowUnauthenticated) {
        (socket as any).user = null;
        return next();
      }
      return next(new Error("Authentication required: no token provided"));
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as {
        sub: string;
        email: string;
        role: string;
        name: string;
      };
      (socket as any).user = decoded;
      next();
    } catch {
      if (allowUnauthenticated) {
        (socket as any).user = null;
        return next();
      }
      return next(new Error("Authentication failed: invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    // Join the global dashboard room on connect
    socket.join(ROOMS.DASHBOARD);

    console.log(
      `[socket] Client connected: ${socket.id} (total: ${io.engine.clientsCount})`,
    );

    // Handle room subscriptions from the frontend
    socket.on("subscribe", (rooms: RoomSubscription[]) => {
      for (const room of rooms) {
        const roomName = resolveRoom(room);
        if (roomName) {
          socket.join(roomName);
        }
      }
      console.log(
        `[socket] ${socket.id} subscribed to ${rooms.length} room(s)`,
      );
    });

    socket.on("unsubscribe", (rooms: RoomSubscription[]) => {
      for (const room of rooms) {
        const roomName = resolveRoom(room);
        if (roomName) {
          socket.leave(roomName);
        }
      }
      console.log(
        `[socket] ${socket.id} unsubscribed from ${rooms.length} room(s)`,
      );
    });

    // Handle simulator reset requests from any client — broadcast to all
    socket.on(EVENTS.SIMULATOR_RESET, (payload: unknown) => {
      console.log(
        `[socket] simulator:reset received from ${socket.id}`,
      );
      io.to(ROOMS.DASHBOARD).emit(EVENTS.SIMULATOR_RESET, payload);
    });

    // Handle notification events from server-side clients (API server)
    // and rebroadcast to all dashboard clients in real time.
    socket.on(EVENTS.NOTIFICATION_NEW, (payload: unknown) => {
      io.to(ROOMS.DASHBOARD).emit(EVENTS.NOTIFICATION_NEW, payload);
    });

    socket.on("disconnect", (reason) => {
      console.log(
        `[socket] Client disconnected: ${socket.id} (reason: ${reason})`,
      );
    });
  });

  console.log(
    `[socket] Server listening on port ${port} (cors: ${corsOrigin})`,
  );

  return io;
}

// ─── Helpers ───────────────────────────────────────────────────────

function resolveRoom(subscription: RoomSubscription): string | null {
  switch (subscription.type) {
    case "estate":
      return ROOMS.ESTATE(subscription.id);
    case "site":
      return ROOMS.SITE(subscription.id);
    case "device":
      return ROOMS.DEVICE(subscription.id);
    default:
      return null;
  }
}
