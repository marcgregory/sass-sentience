export type UserRole = "admin" | "support" | "installer" | "customer";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  isActive: boolean;
  mfaEnabled: boolean;
  customerId?: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: UserRole;
  label: string;
  description: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  resource: string;
  action: "create" | "read" | "update" | "delete" | "manage";
  conditions?: Record<string, unknown>;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: string;
  ipAddress?: string;
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
}
