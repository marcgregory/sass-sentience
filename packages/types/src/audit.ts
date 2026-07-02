export type AuditAction = "create" | "update" | "delete" | "login" | "logout" | "export" | "diagnostic" | "config_change" | "permission_change" | "password_reset" | "mfa_change";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: AuditAction;
  resource: string;
  resourceId?: string;
  description: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
