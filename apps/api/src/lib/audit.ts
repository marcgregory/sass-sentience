/**
 * Server-side audit logging helper.
 *
 * Provides a single function to write audit log entries to the database.
 * Every meaningful user or system action (auth, CRUD, config changes, etc.)
 * should call this once, at the point where the action is confirmed.
 *
 * IMPORTANT: This is NOT called for telemetry updates or every MQTT message —
 * only actions that matter for accountability and compliance.
 */

import { db } from "../db";
import { auditLogs } from "../db/schema";

// Mirrors @sentience/types AuditAction — inlined to avoid adding a
// dependency on the shared types package from the API server.
type AuditAction =
  | "create" | "update" | "delete"
  | "login" | "logout" | "failed_login"
  | "export" | "diagnostic"
  | "config_change" | "permission_change"
  | "password_reset" | "mfa_change"
  | "firmware_rollout";

export interface AuditLogInput {
  userId: string | null;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Persist an audit log entry to the database.
 *
 * Usage in route handlers:
 *
 *   await logAuditEvent({
 *     userId: user.sub,
 *     userName: user.name,
 *     userRole: user.role,
 *     action: "create",
 *     resource: "estate",
 *     resourceId: created.id,
 *     description: `Estate "${name}" created`,
 *     ipAddress: request.ip,
 *     userAgent: request.headers["user-agent"],
 *   });
 */
export async function logAuditEvent(input: AuditLogInput): Promise<void> {
  await db.insert(auditLogs).values({
    userId: input.userId,
    userName: input.userName,
    userRole: input.userRole,
    action: input.action,
    resource: input.resource,
    resourceId: input.resourceId ?? null,
    description: input.description,
    details: input.details ?? null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ?? null,
  });
}
