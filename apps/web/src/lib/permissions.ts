import type { UserRole } from "@sentience/types";

/**
 * Resource identifiers for RBAC.
 * Maps to page routes and action-level permissions.
 */
export type Resource =
  | "dashboard"
  | "estates"
  | "sites"
  | "devices"
  | "device-groups"
  | "firmware"
  | "rollouts"
  | "alerts"
  | "events"
  | "reports"
  | "diagnostics"
  | "users"
  | "roles"
  | "notifications"
  | "audit-log"
  | "settings"
  | "profile"
  | "admin";

export type Action = "read" | "create" | "update" | "delete" | "manage";

/**
 * Permission matrix defining which roles have which actions on which resources.
 * `manage` implies all lower actions (create, read, update, delete).
 */
const permissionMatrix: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  admin: {
    dashboard: ["manage"],
    estates: ["manage"],
    sites: ["manage"],
    devices: ["manage"],
    "device-groups": ["manage"],
    firmware: ["manage"],
    rollouts: ["manage"],
    alerts: ["manage"],
    events: ["manage"],
    reports: ["manage"],
    diagnostics: ["manage"],
    users: ["manage"],
    roles: ["manage"],
    notifications: ["manage"],
    "audit-log": ["manage"],
    settings: ["manage"],
    profile: ["manage"],
    admin: ["manage"],
  },

  support: {
    dashboard: ["read"],
    estates: ["read"],
    sites: ["read"],
    devices: ["read", "update"],
    "device-groups": ["read", "create", "update", "delete"],
    firmware: ["read", "create", "update", "delete"],
    rollouts: ["read", "create", "update", "delete"],
    alerts: ["read", "update"],
    events: ["read"],
    reports: ["read", "create", "delete"],
    diagnostics: ["read"],
    notifications: ["read", "update"],
    profile: ["read", "update"],
  },

  installer: {
    dashboard: ["read"],
    sites: ["read"],
    devices: ["read", "update"],
    alerts: ["read"],
    events: ["read"],
    reports: ["read"],
    diagnostics: ["read", "update"],
    notifications: ["read"],
    profile: ["read", "update"],
  },

  customer: {
    dashboard: ["read"],
    devices: ["read"],
    alerts: ["read"],
    events: ["read"],
    reports: ["read"],
    notifications: ["read"],
    profile: ["read", "update"],
  },
};

/** All available resources for iteration */
export const ALL_RESOURCES: Resource[] = [
  "dashboard",
  "estates",
  "sites",
  "devices",
  "device-groups",
  "firmware",
  "rollouts",
  "alerts",
  "events",
  "reports",
  "diagnostics",
  "users",
  "roles",
  "notifications",
  "audit-log",
  "settings",
  "profile",
  "admin",
];

/** All available actions for iteration */
export const ALL_ACTIONS: Action[] = ["read", "create", "update", "delete", "manage"];

/** Resource → display label for UI */
export const RESOURCE_LABELS: Record<Resource, string> = {
  dashboard: "Dashboard",
  estates: "Estates",
  sites: "Sites",
  devices: "Devices",
  "device-groups": "Device Groups",
  firmware: "Firmware",
  rollouts: "Rollouts",
  alerts: "Alerts",
  events: "Events",
  reports: "Reports",
  diagnostics: "Diagnostics",
  users: "Users",
  roles: "Roles",
  notifications: "Notifications",
  "audit-log": "Audit Log",
  settings: "Settings",
  profile: "Profile",
  admin: "Admin",
};

/** Role → metadata */
export interface RoleMeta {
  id: string;
  name: UserRole;
  label: string;
  description: string;
  color: string; // Tailwind text class
  bgColor: string; // Tailwind bg class
}

export const ROLE_META: Record<UserRole, RoleMeta> = {
  admin: {
    id: "role-admin",
    name: "admin",
    label: "Administrator",
    description: "Full system access — all resources and actions",
    color: "text-purple-600 dark:text-purple-400",
    bgColor: "bg-purple-100 dark:bg-purple-900/50",
  },
  support: {
    id: "role-support",
    name: "support",
    label: "Support",
    description: "Customer support, device management, and diagnostics",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-100 dark:bg-blue-900/50",
  },
  installer: {
    id: "role-installer",
    name: "installer",
    label: "Installer",
    description: "Device provisioning, site configuration, and field diagnostics",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-100 dark:bg-amber-900/50",
  },
  customer: {
    id: "role-customer",
    name: "customer",
    label: "Customer",
    description: "View own devices, alerts, and reports",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/50",
  },
};

/**
 * Check if a role has a specific action on a resource.
 */
export function hasPermission(
  role: UserRole | undefined | null,
  resource: Resource,
  action: Action,
): boolean {
  if (!role) return false;
  const actions = permissionMatrix[role]?.[resource];
  if (!actions) return false;
  // "manage" implies all other actions
  if (actions.includes("manage")) return true;
  return actions.includes(action);
}

/**
 * Get all actions a role has for a given resource.
 */
export function getActions(role: UserRole | undefined | null, resource: Resource): Action[] {
  if (!role) return [];
  return permissionMatrix[role]?.[resource] ?? [];
}

/**
 * Get all resources a role can access (at minimum, read).
 */
export function getAccessibleResources(role: UserRole | undefined | null): Resource[] {
  if (!role) return [];
  return ALL_RESOURCES.filter((r) => hasPermission(role, r, "read"));
}
