import type { FastifyInstance } from "fastify";

export interface ApiErrorResponse {
  message: string;
  code: string;
  details?: unknown;
}

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: Error & { code?: string; statusCode?: number }, _request, reply) => {
    const err = error as Error & { code?: string; statusCode?: number };

    // Zod validation errors
    if (err.name === "ZodError") {
      return reply.status(400).send({
        message: "Validation error",
        code: "VALIDATION_ERROR",
        details: err,
      } satisfies ApiErrorResponse);
    }

    // Fastify JWT errors
    if (err.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
      return reply.status(401).send({
        message: "Missing authorization header",
        code: "NO_AUTH_HEADER",
      } satisfies ApiErrorResponse);
    }

    if (err.code === "FST_JWT_AUTHORIZATION_TOKEN_EXPIRED") {
      return reply.status(401).send({
        message: "Token expired",
        code: "TOKEN_EXPIRED",
      } satisfies ApiErrorResponse);
    }

    if (err.code === "FST_JWT_BAD_REQUEST" || err.code === "FST_JWT_MISSING_TOKEN") {
      return reply.status(401).send({
        message: "Invalid token",
        code: "INVALID_TOKEN",
      } satisfies ApiErrorResponse);
    }

    // Rate limit errors
    if (err.statusCode === 429) {
      return reply.status(429).send({
        message: "Too many requests",
        code: "RATE_LIMITED",
      } satisfies ApiErrorResponse);
    }

    // Default 500
    console.error("[api] Unhandled error:", err);
    return reply.status(err.statusCode ?? 500).send({
      message: err.message ?? "Internal server error",
      code: "INTERNAL_ERROR",
    } satisfies ApiErrorResponse);
  });
}
