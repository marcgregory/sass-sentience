/**
 * Query key factory for TanStack Query.
 *
 * Every query key is generated through these factories to ensure
 * consistency across the app. Never construct query key arrays
 * manually — always use a factory function.
 *
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */

export const queryKeys = {
  /** Estate/tenant hierarchy */
  estates: {
    all: ["estates"] as const,
    list: (params?: Record<string, unknown>) => ["estates", "list", params] as const,
    detail: (id: string) => ["estates", "detail", id] as const,
  },

  /** Sites within estates */
  sites: {
    all: ["sites"] as const,
    list: (estateId?: string, params?: Record<string, unknown>) =>
      ["sites", "list", estateId, params] as const,
    detail: (id: string) => ["sites", "detail", id] as const,
  },

  /** Devices */
  devices: {
    all: ["devices"] as const,
    list: (siteId?: string, params?: Record<string, unknown>) =>
      ["devices", "list", siteId, params] as const,
    detail: (id: string) => ["devices", "detail", id] as const,
    diagnostics: (deviceId: string) => ["devices", "diagnostics", deviceId] as const,
    maintenance: (deviceId: string) => ["devices", "maintenance", deviceId] as const,
  },

  /** Alerts */
  alerts: {
    all: ["alerts"] as const,
    list: (params?: Record<string, unknown>) => ["alerts", "list", params] as const,
    detail: (id: string) => ["alerts", "detail", id] as const,
  },

  /** Events/audit log */
  events: {
    all: ["events"] as const,
    list: (params?: Record<string, unknown>) => ["events", "list", params] as const,
    detail: (id: string) => ["events", "detail", id] as const,
  },

  /** Notifications */
  notifications: {
    all: ["notifications"] as const,
    list: (params?: Record<string, unknown>) => ["notifications", "list", params] as const,
    unreadCount: ["notifications", "unreadCount"] as const,
  },

  /** Reports */
  reports: {
    all: ["reports"] as const,
    list: (params?: Record<string, unknown>) => ["reports", "list", params] as const,
    detail: (id: string) => ["reports", "detail", id] as const,
  },

  /** Users and roles */
  users: {
    all: ["users"] as const,
    list: (params?: Record<string, unknown>) => ["users", "list", params] as const,
    detail: (id: string) => ["users", "detail", id] as const,
    profile: (id: string) => ["users", "profile", id] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: () => ["roles", "list"] as const,
    detail: (id: string) => ["roles", "detail", id] as const,
  },

  /** Audit logs */
  auditLogs: {
    all: ["auditLogs"] as const,
    list: (params?: Record<string, unknown>) => ["auditLogs", "list", params] as const,
    detail: (id: string) => ["auditLogs", "detail", id] as const,
  },

  /** Settings */
  settings: {
    all: ["settings"] as const,
  },

  /** Dashboard KPIs */
  dashboard: {
    all: ["dashboard"] as const,
    summary: ["dashboard", "summary"] as const,
    kpis: (estateId?: string) => ["dashboard", "kpis", estateId] as const,
  },

  /** Notification rules (admin) */
  notificationRules: {
    all: ["notificationRules"] as const,
    list: () => ["notificationRules", "list"] as const,
    detail: (id: string) => ["notificationRules", "detail", id] as const,
  },

  /** Admin */
  admin: {
    all: ["admin"] as const,
    stats: ["admin", "stats"] as const,
  },

  /** API keys (admin) */
  apiKeys: {
    all: ["apiKeys"] as const,
    list: (params?: Record<string, unknown>) => ["apiKeys", "list", params] as const,
    detail: (id: string) => ["apiKeys", "detail", id] as const,
  },

  /** Customers */
  customers: {
    all: ["customers"] as const,
  },

  /** Health / system status */
  health: {
    status: ["health", "status"] as const,
  },

  /** Diagnostics */
  diagnostics: {
    all: ["diagnostics"] as const,
    tests: (deviceType?: string) => ["diagnostics", "tests", deviceType] as const,
    testDetail: (id: string) => ["diagnostics", "tests", id] as const,
    results: (params?: Record<string, unknown>) => ["diagnostics", "results", params] as const,
    resultDetail: (id: string) => ["diagnostics", "results", id] as const,
  },
} as const;
