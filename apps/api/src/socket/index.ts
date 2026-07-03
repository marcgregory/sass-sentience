/**
 * Socket.IO server with JWT authentication.
 *
 * Shares the same HTTP server as Fastify so both REST and WebSocket
 * run on the same port without CORS issues.
 *
 * Authentication flow:
 * 1. Client connects with `auth: { token: "<JWT>" }` in the handshake
 * 2. Server verifies the JWT using the same secret as Fastify's @fastify/jwt
 * 3. If valid, the socket is authenticated and can subscribe to rooms
 * 4. If invalid/missing, connection is rejected with an error
 *
 * Local development: if SOCKET_ALLOW_UNAUTHENTICATED=true, unauthenticated
 * connections are allowed for testing. NEVER enable this in production.
 */

import { Server as SocketIOServer, type Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";

/**
 * Decoded JWT payload attached to authenticated sockets.
 */
export interface SocketUser {
  sub: string;
  email: string;
  role: string;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-to-a-random-secret-in-production";
const ALLOW_UNAUTHENTICATED = process.env.SOCKET_ALLOW_UNAUTHENTICATED === "true";

let io: SocketIOServer | null = null;

/**
 * Initializes Socket.IO on the shared HTTP server.
 * Must be called after the Fastify app is ready but before listening.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  if (io) return io;

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
      credentials: true,
    },
    // Require a valid token in the handshake auth
    connectionStateRecovery: {
      maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
    },
  });

  // ─── Authentication middleware ─────────────────────────────────────

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      if (ALLOW_UNAUTHENTICATED) {
        (socket as any).user = null;
        return next();
      }
      return next(new Error("Authentication required: no token provided"));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as SocketUser;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      if (ALLOW_UNAUTHENTICATED) {
        (socket as any).user = null;
        return next();
      }
      return next(new Error("Authentication failed: invalid or expired token"));
    }
  });

  // ─── Connection handler ────────────────────────────────────────────

  io.on("connection", (socket: Socket) => {
    const user = (socket as any).user as SocketUser | null;

    if (user) {
      console.log(`[socket] Authenticated: ${user.name} (${user.email}, role: ${user.role})`);

      // Auto-join user to their personal notification room
      socket.join(`user:${user.sub}`);

      // Emit welcome with user info
      socket.emit("connected", {
        userId: user.sub,
        role: user.role,
      });
    } else {
      console.log(`[socket] Unauthenticated connection (DEV MODE): ${socket.id}`);
      socket.emit("connected", {
        userId: null,
        role: null,
      });
    }

    // ─── Room subscriptions ──────────────────────────────────────────

    socket.on("subscribe", (rooms: Array<{ type: string; id: string }>) => {
      if (!Array.isArray(rooms)) return;

      for (const room of rooms) {
        if (room?.type && room?.id) {
          const roomName = `${room.type}:${room.id}`;
          socket.join(roomName);
          console.log(`[socket] ${user?.email ?? socket.id} joined ${roomName}`);
        }
      }
    });

    socket.on("unsubscribe", (rooms: Array<{ type: string; id: string }>) => {
      if (!Array.isArray(rooms)) return;

      for (const room of rooms) {
        if (room?.type && room?.id) {
          const roomName = `${room.type}:${room.id}`;
          socket.leave(roomName);
          console.log(`[socket] ${user?.email ?? socket.id} left ${roomName}`);
        }
      }
    });

    // ─── Disconnect ──────────────────────────────────────────────────

    socket.on("disconnect", (reason) => {
      if (user) {
        console.log(`[socket] Disconnected: ${user.name} (${reason})`);
      } else {
        console.log(`[socket] Disconnected (unauthenticated): ${socket.id} (${reason})`);
      }
    });
  });

  console.log("[socket] Socket.IO initialized with JWT authentication");
  return io;
}

/**
 * Returns the Socket.IO server instance, or null if not initialized.
 */
export function getIO(): SocketIOServer | null {
  return io;
}
