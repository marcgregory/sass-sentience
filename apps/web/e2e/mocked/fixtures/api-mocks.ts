import type { Page } from "@playwright/test";

// ─── Seed data constants ─────────────────────────────────────────────

export const MOCK_USERS = {
  admin: {
    id: "user-1", email: "admin@sentience.io", name: "Alice Johnson",
    role: "admin", isActive: true, mfaEnabled: false,
    createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-06-01T12:00:00Z",
    lastLogin: "2026-07-06T10:00:00Z",
  },
  support: {
    id: "user-2", email: "support@sentience.io", name: "Bob Smith",
    role: "support", isActive: true, mfaEnabled: false,
    createdAt: "2026-02-20T09:00:00Z", updatedAt: "2026-05-15T10:00:00Z",
    lastLogin: "2026-07-06T09:30:00Z",
  },
  installer: {
    id: "user-3", email: "installer@sentience.io", name: "Carol Davis",
    role: "installer", isActive: true, mfaEnabled: false,
    createdAt: "2026-03-10T07:30:00Z", updatedAt: "2026-04-20T14:00:00Z",
    lastLogin: "2026-07-05T16:00:00Z",
  },
  customer: {
    id: "user-4", email: "customer@sentience.io", name: "Dan Wilson",
    role: "customer", isActive: true, mfaEnabled: false,
    customerId: "CUST-001",
    createdAt: "2026-01-05T10:00:00Z", updatedAt: "2026-06-10T09:00:00Z",
    lastLogin: "2026-07-06T08:00:00Z",
  },
} as const;

export const MOCK_DEVICES = [
  { id: "dev-1", serialNumber: "SN-001", macAddress: "00:1A:2B:3C:4D:01", name: "Temperature Sensor A1", type: "temperature", status: "online", firmwareVersion: "2.1.0", firmwareBuild: "build-421", firmwareReleasedAt: "2026-05-01T00:00:00Z", firmwareInstalledAt: "2026-05-10T00:00:00Z", battery: 85, voltage: 3.7, temperature: 23.5, signalStrength: -65, uptime: 864000, lastHeartbeat: "2026-07-06T10:00:00Z", siteId: "site-1", roomId: null, installedAt: "2026-01-15T08:00:00Z", lastMaintenance: "2026-06-01T00:00:00Z", notes: null, tags: ["temperature", "indoor"], deviceConfig: null, deviceIo: null, lastDiagnostics: null, siteName: "Warehouse A", estateName: "Greenfield Estate", createdAt: "2026-01-15T08:00:00Z", updatedAt: "2026-06-01T12:00:00Z" },
  { id: "dev-2", serialNumber: "SN-002", macAddress: "00:1A:2B:3C:4D:02", name: "Humidity Sensor B2", type: "humidity", status: "online", firmwareVersion: "2.1.0", firmwareBuild: "build-421", firmwareReleasedAt: "2026-05-01T00:00:00Z", firmwareInstalledAt: "2026-05-10T00:00:00Z", battery: 92, voltage: 3.8, temperature: 22.1, signalStrength: -58, uptime: 1728000, lastHeartbeat: "2026-07-06T10:00:00Z", siteId: "site-1", roomId: null, installedAt: "2026-01-20T09:00:00Z", lastMaintenance: null, notes: null, tags: ["humidity", "indoor"], deviceConfig: null, deviceIo: null, lastDiagnostics: null, siteName: "Warehouse A", estateName: "Greenfield Estate", createdAt: "2026-01-20T09:00:00Z", updatedAt: "2026-05-20T10:00:00Z" },
  { id: "dev-3", serialNumber: "SN-003", macAddress: "00:1A:2B:3C:4D:03", name: "Vibration Sensor C1", type: "vibration", status: "offline", firmwareVersion: "1.8.3", firmwareBuild: "build-398", firmwareReleasedAt: "2026-03-01T00:00:00Z", firmwareInstalledAt: "2026-03-10T00:00:00Z", battery: 23, voltage: 2.9, temperature: 31.2, signalStrength: -85, uptime: 0, lastHeartbeat: "2026-07-05T22:00:00Z", siteId: "site-2", roomId: null, installedAt: "2026-02-01T08:00:00Z", lastMaintenance: "2026-05-01T00:00:00Z", notes: null, tags: ["vibration", "industrial"], deviceConfig: null, deviceIo: null, lastDiagnostics: null, siteName: "Workshop B", estateName: "Greenfield Estate", createdAt: "2026-02-01T08:00:00Z", updatedAt: "2026-04-15T12:00:00Z" },
  { id: "dev-4", serialNumber: "SN-004", macAddress: "00:1A:2B:3C:4D:04", name: "Power Meter D1", type: "power", status: "fault", firmwareVersion: "3.0.1", firmwareBuild: "build-512", firmwareReleasedAt: "2026-06-01T00:00:00Z", firmwareInstalledAt: "2026-06-15T00:00:00Z", battery: 67, voltage: 3.5, temperature: 45.3, signalStrength: -72, uptime: 432000, lastHeartbeat: "2026-07-06T09:55:00Z", siteId: "site-3", roomId: null, installedAt: "2026-03-01T08:00:00Z", lastMaintenance: null, notes: "Intermittent connectivity issues", tags: ["power", "critical"], deviceConfig: null, deviceIo: null, lastDiagnostics: null, siteName: "Control Room", estateName: "Riverside Park", createdAt: "2026-03-01T08:00:00Z", updatedAt: "2026-06-20T14:00:00Z" },
  { id: "dev-5", serialNumber: "SN-005", macAddress: "00:1A:2B:3C:4D:05", name: "Temp-River-North", type: "temperature", status: "online", firmwareVersion: "2.1.0", firmwareBuild: "build-421", firmwareReleasedAt: "2026-05-01T00:00:00Z", firmwareInstalledAt: "2026-05-12T00:00:00Z", battery: 78, voltage: 3.6, temperature: 19.8, signalStrength: -60, uptime: 1209600, lastHeartbeat: "2026-07-06T10:00:00Z", siteId: "site-3", roomId: null, installedAt: "2026-02-10T08:00:00Z", lastMaintenance: null, notes: null, tags: ["temperature", "outdoor"], deviceConfig: null, deviceIo: null, lastDiagnostics: null, siteName: "Control Room", estateName: "Riverside Park", createdAt: "2026-02-10T08:00:00Z", updatedAt: "2026-05-15T12:00:00Z" },
];

export const MOCK_ALERTS = [
  { id: "alert-1", title: "Device offline", description: "Vibration Sensor C1 has been offline for 12 hours", severity: "critical", status: "open", category: "connectivity", deviceId: "dev-3", siteId: "site-2", siteName: "Workshop B", estateId: "est-1", estateName: "Greenfield Estate", customerId: null, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolution: null, source: "system", occurredAt: "2026-07-06T08:00:00Z", createdAt: "2026-07-06T08:00:00Z", updatedAt: "2026-07-06T08:00:00Z" },
  { id: "alert-2", title: "Battery low", description: "Power Meter D1 battery below 20% threshold", severity: "warning", status: "acknowledged", category: "battery", deviceId: "dev-4", siteId: "site-3", siteName: "Control Room", estateId: "est-2", estateName: "Riverside Park", customerId: null, assignedTo: null, acknowledgedBy: "Alice Johnson", acknowledgedAt: "2026-07-06T09:00:00Z", resolvedBy: null, resolvedAt: null, resolution: null, source: "system", occurredAt: "2026-07-06T06:00:00Z", createdAt: "2026-07-06T06:00:00Z", updatedAt: "2026-07-06T09:00:00Z" },
  { id: "alert-3", title: "Temperature high", description: "Power Meter D1 temperature at 45.3°C exceeds threshold", severity: "warning", status: "open", category: "temperature", deviceId: "dev-4", siteId: "site-3", siteName: "Control Room", estateId: "est-2", estateName: "Riverside Park", customerId: null, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolution: null, source: "system", occurredAt: "2026-07-06T07:30:00Z", createdAt: "2026-07-06T07:30:00Z", updatedAt: "2026-07-06T07:30:00Z" },
  { id: "alert-4", title: "Signal weak", description: "Vibration Sensor C1 signal strength below -80 dBm", severity: "info", status: "resolved", category: "signal", deviceId: "dev-3", siteId: "site-2", siteName: "Workshop B", estateId: "est-1", estateName: "Greenfield Estate", customerId: null, assignedTo: null, acknowledgedBy: "Bob Smith", acknowledgedAt: "2026-07-05T14:00:00Z", resolvedBy: "Bob Smith", resolvedAt: "2026-07-05T16:00:00Z", resolution: "Recalibrated sensor position", source: "system", occurredAt: "2026-07-05T10:00:00Z", createdAt: "2026-07-05T10:00:00Z", updatedAt: "2026-07-05T16:00:00Z" },
  { id: "alert-5", title: "Firmware update available", description: "New firmware v3.0.1 available for Power Meter D1", severity: "info", status: "open", category: "firmware", deviceId: "dev-4", siteId: "site-3", siteName: "Control Room", estateId: "est-2", estateName: "Riverside Park", customerId: null, assignedTo: null, acknowledgedBy: null, acknowledgedAt: null, resolvedBy: null, resolvedAt: null, resolution: null, source: "system", occurredAt: "2026-07-04T00:00:00Z", createdAt: "2026-07-04T00:00:00Z", updatedAt: "2026-07-04T00:00:00Z" },
];

export const MOCK_EVENTS = [
  { id: "evt-1", deviceId: "dev-1", title: "Device came online", description: "Temperature Sensor A1 heartbeat received", severity: "info", category: "connectivity", siteId: "site-1", estateId: "est-1", createdAt: "2026-07-06T10:00:00Z" },
  { id: "evt-2", deviceId: "dev-3", title: "Device went offline", description: "Vibration Sensor C1 heartbeat timeout", severity: "critical", category: "connectivity", siteId: "site-2", estateId: "est-1", createdAt: "2026-07-05T22:00:00Z" },
  { id: "evt-3", deviceId: "dev-4", title: "Fault detected", description: "Power Meter D1 temperature exceeded 45°C", severity: "error", category: "diagnostic", siteId: "site-3", estateId: "est-2", createdAt: "2026-07-06T07:30:00Z" },
  { id: "evt-4", deviceId: "dev-2", title: "Battery status update", description: "Humidity Sensor B2 battery at 92%", severity: "info", category: "status", siteId: "site-1", estateId: "est-1", createdAt: "2026-07-06T09:00:00Z" },
  { id: "evt-5", deviceId: "dev-5", title: "Configuration changed", description: "Sampling interval updated to 60s", severity: "warning", category: "config", siteId: "site-3", estateId: "est-2", createdAt: "2026-07-06T08:00:00Z" },
];

export const MOCK_NOTIFICATIONS = [
  { id: "notif-1", userId: "user-1", title: "Device offline alert", message: "Vibration Sensor C1 has been offline for 12 hours", priority: "critical", category: "alert", isRead: false, link: "/devices/dev-3", createdAt: "2026-07-06T08:00:00Z" },
  { id: "notif-2", userId: "user-1", title: "Alert acknowledged", message: "Battery low alert acknowledged by Alice Johnson", priority: "normal", category: "alert", isRead: false, link: "/alerts", createdAt: "2026-07-06T09:00:00Z" },
  { id: "notif-3", userId: "user-1", title: "Report ready", message: "Weekly fleet health report is ready for download", priority: "low", category: "report", isRead: true, link: "/reports", createdAt: "2026-07-05T12:00:00Z" },
  { id: "notif-4", userId: "user-1", title: "System update", message: "Platform maintenance scheduled for July 8th 02:00 UTC", priority: "high", category: "system", isRead: true, link: null, createdAt: "2026-07-04T10:00:00Z" },
  { id: "notif-5", userId: "user-1", title: "User created", message: "New user Eve Adams has been added to the platform", priority: "normal", category: "user", isRead: false, link: "/users", createdAt: "2026-07-06T07:00:00Z" },
];

export const MOCK_API_KEYS = [
  { id: "apikey-1", name: "Production API Key", maskedKey: "sk_prod_****...a1b2", status: "active", createdBy: "Alice Johnson", createdAt: "2026-03-15T08:00:00Z", expiresAt: "2027-03-15T08:00:00Z", lastUsedAt: "2026-07-06T09:00:00Z", requestCount: 15234 },
  { id: "apikey-2", name: "Staging Key", maskedKey: "sk_staging_****...c3d4", status: "active", createdBy: "Alice Johnson", createdAt: "2026-04-01T10:00:00Z", expiresAt: null, lastUsedAt: "2026-07-05T16:00:00Z", requestCount: 3891 },
  { id: "apikey-3", name: "Legacy Integration", maskedKey: "sk_legacy_****...e5f6", status: "revoked", createdBy: "Bob Smith", createdAt: "2026-01-10T09:00:00Z", expiresAt: "2026-06-10T09:00:00Z", lastUsedAt: "2026-06-01T12:00:00Z", requestCount: 45678 },
];

export const MOCK_NOTIFICATION_RULES = [
  { id: "rule-1", alertType: "device_offline", label: "Device Offline", description: "Alert when a device goes offline", severityThreshold: "critical", channels: ["email", "web"], enabled: true, cooldownMinutes: 15, rolePreferences: { admin: true, support: true, installer: false, customer: false }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z" },
  { id: "rule-2", alertType: "battery_low", label: "Battery Low", description: "Alert when device battery drops below 20%", severityThreshold: "warning", channels: ["email", "web", "push"], enabled: true, cooldownMinutes: 60, rolePreferences: { admin: true, support: true, installer: true, customer: false }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-05-15T00:00:00Z" },
  { id: "rule-3", alertType: "temperature_high", label: "High Temperature", description: "Alert when device temperature exceeds threshold", severityThreshold: "warning", channels: ["web"], enabled: true, cooldownMinutes: 30, rolePreferences: { admin: true, support: true, installer: false, customer: true }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-04-10T00:00:00Z" },
  { id: "rule-4", alertType: "signal_weak", label: "Weak Signal", description: "Alert when signal strength drops below -80 dBm", severityThreshold: "info", channels: ["web"], enabled: false, cooldownMinutes: 120, rolePreferences: { admin: false, support: true, installer: true, customer: false }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-03-01T00:00:00Z" },
  { id: "rule-5", alertType: "firmware_update", label: "Firmware Update", description: "Notify when firmware updates are available", severityThreshold: "info", channels: ["email"], enabled: true, cooldownMinutes: 1440, rolePreferences: { admin: true, support: true, installer: false, customer: false }, createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-02-01T00:00:00Z" },
];

export const MOCK_AUDIT_LOGS = [
  { id: "audit-1", userId: "user-1", userName: "Alice Johnson", userRole: "admin", action: "login", resource: "Session", description: "User Alice Johnson logged in as Administrator", ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", createdAt: "2026-07-06T10:00:00Z" },
  { id: "audit-2", userId: "user-1", userName: "Alice Johnson", userRole: "admin", action: "update", resource: "Settings", resourceId: "maintenance_mode", description: "Updated setting maintenance_mode to false", ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", createdAt: "2026-07-06T09:30:00Z" },
  { id: "audit-3", userId: "user-1", userName: "Alice Johnson", userRole: "admin", action: "create", resource: "ApiKey", resourceId: "apikey-4", description: "Created API key: Monitoring Integration", ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", createdAt: "2026-07-06T09:00:00Z" },
  { id: "audit-4", userId: "user-2", userName: "Bob Smith", userRole: "support", action: "update", resource: "Alert", resourceId: "alert-2", description: "Acknowledged alert: Battery low", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0", createdAt: "2026-07-06T09:00:00Z" },
  { id: "audit-5", userId: "user-1", userName: "Alice Johnson", userRole: "admin", action: "permission_change", resource: "Role", resourceId: "role-support", description: "Updated permissions for Role: Support Engineer", ipAddress: "192.168.1.100", userAgent: "Mozilla/5.0", createdAt: "2026-07-05T16:00:00Z" },
];

export const MOCK_REPORT_SUMMARY = {
  totalDevices: 24,
  onlineDevices: 18,
  offlineDevices: 3,
  faultDevices: 2,
  warningDevices: 1,
  avgBattery: 74.5,
  avgSignal: -68.3,
  healthScore: 78.2,
  onlinePct: 75,
  batteryDistribution: [
    { label: "Good (>60%)", value: 65, count: 15, color: "#22c55e" },
    { label: "Fair (20-60%)", value: 22, count: 5, color: "#eab308" },
    { label: "Low (<20%)", value: 13, count: 3, color: "#ef4444" },
  ],
  signalDistribution: [
    { label: "Excellent (<-50 dBm)", value: 20, count: 5, color: "#22c55e" },
    { label: "Good (-50 to -70)", value: 45, count: 11, color: "#16a34a" },
    { label: "Fair (-70 to -90)", value: 25, count: 6, color: "#eab308" },
    { label: "Poor (>-90 dBm)", value: 10, count: 2, color: "#ef4444" },
  ],
  faultDistribution: [
    { category: "Connectivity", count: 8, color: "#3b82f6" },
    { category: "Battery", count: 5, color: "#eab308" },
    { category: "Temperature", count: 4, color: "#ef4444" },
    { category: "Signal", count: 3, color: "#a855f7" },
    { category: "Firmware", count: 2, color: "#06b6d4" },
    { category: "Hardware", count: 1, color: "#f97316" },
  ],
};

export const MOCK_REPORT_TRENDS = {
  alertTrends: [
    { date: "2026-07-01", label: "Jul 1", critical: 2, warning: 3, info: 1, online: 20, offline: 2, fault: 2 },
    { date: "2026-07-02", label: "Jul 2", critical: 1, warning: 4, info: 2, online: 19, offline: 3, fault: 2 },
    { date: "2026-07-03", label: "Jul 3", critical: 0, warning: 2, info: 3, online: 21, offline: 1, fault: 2 },
    { date: "2026-07-04", label: "Jul 4", critical: 3, warning: 1, info: 1, online: 18, offline: 4, fault: 2 },
    { date: "2026-07-05", label: "Jul 5", critical: 1, warning: 3, info: 2, online: 19, offline: 3, fault: 2 },
    { date: "2026-07-06", label: "Jul 6", critical: 1, warning: 2, info: 1, online: 18, offline: 3, fault: 3 },
  ],
  availability: [
    { name: "Week 1", online: 85, offline: 10, fault: 5 },
    { name: "Week 2", online: 88, offline: 8, fault: 4 },
    { name: "Week 3", online: 82, offline: 12, fault: 6 },
    { name: "Week 4", online: 90, offline: 7, fault: 3 },
  ],
  days: 30,
};

// ─── Mock helpers ────────────────────────────────────────────────────

/**
 * Helper: fulfill a route with JSON.
 * Uses {status, body, headers} pattern instead of Response to satisfy
 * Playwright's type expectations.
 */
function jsonFulfill(status: number, body: unknown) {
  return {
    status,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  };
}

function paginated<T = unknown>(data: T[], page = 1, limit = 20) {
  return {
    data,
    pagination: {
      page,
      limit,
      total: data.length,
      totalPages: Math.ceil(data.length / limit),
    },
  };
}

// ─── Route mocks ─────────────────────────────────────────────────────

export async function mockAuthRoutes(page: Page) {
  await page.route("**/api/auth/login**", async (route) => {
    const body = route.request().postDataJSON();
    const user = Object.values(MOCK_USERS).find((u) => u.email === body?.email);
    if (!user) {
      return route.fulfill(jsonFulfill(401, { message: "Invalid credentials" }));
    }
    return route.fulfill(jsonFulfill(200, {
      token: "mock-jwt-token-for-e2e-tests",
      user: { id: user.id, email: user.email, name: user.name, role: user.role, isActive: true, mfaEnabled: false },
    }));
  });

  await page.route("**/api/health**", async (route) => {
    return route.fulfill(jsonFulfill(200, { status: "ok", db: "connected", uptime: 3600 }));
  });
}

export async function mockDeviceRoutes(page: Page) {
  await page.route("**/api/devices**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/devices\/([^/]+)$/)?.[1];
    if (id && id !== "summary") {
      const device = MOCK_DEVICES.find((d) => d.id === id);
      return device
        ? route.fulfill(jsonFulfill(200, device))
        : route.fulfill(jsonFulfill(404, { message: "Device not found" }));
    }
    return route.fulfill(jsonFulfill(200, paginated(MOCK_DEVICES)));
  });
}

export async function mockAlertRoutes(page: Page) {
  await page.route("**/api/alerts**", async (route, request) => {
    if (request.method() === "PATCH") {
      return route.fulfill(jsonFulfill(200, { ...MOCK_ALERTS[0], status: "acknowledged", acknowledgedAt: new Date().toISOString() }));
    }
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/alerts\/([^/]+)$/)?.[1];
    if (id) {
      const alert = MOCK_ALERTS.find((a) => a.id === id);
      return alert
        ? route.fulfill(jsonFulfill(200, alert))
        : route.fulfill(jsonFulfill(404, { message: "Alert not found" }));
    }
    return route.fulfill(jsonFulfill(200, paginated(MOCK_ALERTS)));
  });
}

export async function mockEventRoutes(page: Page) {
  await page.route("**/api/events**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/events\/([^/]+)$/)?.[1];
    if (id) {
      const event = MOCK_EVENTS.find((e) => e.id === id);
      return event
        ? route.fulfill(jsonFulfill(200, event))
        : route.fulfill(jsonFulfill(404, { message: "Event not found" }));
    }
    return route.fulfill(jsonFulfill(200, paginated(MOCK_EVENTS)));
  });
}

export async function mockNotificationRoutes(page: Page) {
  await page.route("**/api/notifications**", async (route, request) => {
    if (request.method() === "PATCH") {
      return route.fulfill(jsonFulfill(200, { updatedCount: 1 }));
    }
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/notifications\/([^/]+)\/read$/)?.[1];
    if (id) {
      const notif = MOCK_NOTIFICATIONS.find((n) => n.id === id);
      return notif
        ? route.fulfill(jsonFulfill(200, { ...notif, isRead: true }))
        : route.fulfill(jsonFulfill(404, { message: "Notification not found" }));
    }
    if (url.pathname.endsWith("/unread-count")) {
      return route.fulfill(jsonFulfill(200, { unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length }));
    }
    if (url.pathname.endsWith("/read-all")) {
      return route.fulfill(jsonFulfill(200, { updatedCount: 3 }));
    }
    return route.fulfill(jsonFulfill(200, {
      data: MOCK_NOTIFICATIONS,
      pagination: { page: 1, limit: 20, total: MOCK_NOTIFICATIONS.length, totalPages: 1 },
      unreadCount: MOCK_NOTIFICATIONS.filter((n) => !n.isRead).length,
    }));
  });
}

export async function mockApiKeyRoutes(page: Page) {
  await page.route("**/api/api-keys**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/api-keys\/([^/]+)$/)?.[1];

    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const newKey = {
        id: `apikey-${Date.now()}`,
        name: body.name,
        maskedKey: `sk_****...${Math.random().toString(36).slice(2, 6)}`,
        status: "active",
        createdBy: "Alice Johnson",
        createdAt: new Date().toISOString(),
        expiresAt: body.expiresAt || null,
        fullKey: `sk_live_${Math.random().toString(36).repeat(3).slice(0, 32)}`,
        message: "Store this key securely — it will not be shown again.",
      };
      return route.fulfill(jsonFulfill(201, newKey));
    }

    if (request.method() === "PATCH" && id) {
      const body = request.postDataJSON();
      const key = MOCK_API_KEYS.find((k) => k.id === id);
      if (!key) return route.fulfill(jsonFulfill(404, { message: "API key not found" }));
      return route.fulfill(jsonFulfill(200, { ...key, ...body }));
    }

    if (request.method() === "DELETE" && id) {
      return route.fulfill(jsonFulfill(200, { success: true }));
    }

    if (id) {
      const key = MOCK_API_KEYS.find((k) => k.id === id);
      return key
        ? route.fulfill(jsonFulfill(200, key))
        : route.fulfill(jsonFulfill(404, { message: "API key not found" }));
    }

    return route.fulfill(jsonFulfill(200, paginated(MOCK_API_KEYS)));
  });
}

export async function mockNotificationRuleRoutes(page: Page) {
  await page.route("**/api/notification-rules**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/notification-rules\/([^/]+)$/)?.[1];

    if (request.method() === "PATCH" && id) {
      const body = request.postDataJSON();
      const rule = MOCK_NOTIFICATION_RULES.find((r) => r.id === id);
      if (!rule) return route.fulfill(jsonFulfill(404, { message: "Rule not found" }));
      return route.fulfill(jsonFulfill(200, { ...rule, ...body, updatedAt: new Date().toISOString() }));
    }

    if (id) {
      const rule = MOCK_NOTIFICATION_RULES.find((r) => r.id === id);
      return rule
        ? route.fulfill(jsonFulfill(200, rule))
        : route.fulfill(jsonFulfill(404, { message: "Rule not found" }));
    }

    return route.fulfill(jsonFulfill(200, { data: MOCK_NOTIFICATION_RULES }));
  });
}

export async function mockReportRoutes(page: Page) {
  // Single handler routing by pathname to avoid Playwright's LIFO pattern matching
  await page.route("**/api/reports**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    if (path.endsWith("/summary")) {
      return route.fulfill(jsonFulfill(200, MOCK_REPORT_SUMMARY));
    }

    if (path.endsWith("/trends")) {
      return route.fulfill(jsonFulfill(200, MOCK_REPORT_TRENDS));
    }

    if (request.method() === "POST") {
      const body = request.postDataJSON();
      return route.fulfill(jsonFulfill(200, {
        id: "report-generated-1", name: body.name, type: body.type || "adhoc",
        status: "ready", format: body.format || "csv",
        dateRangeStart: body.dateRangeStart, dateRangeEnd: body.dateRangeEnd,
        filters: body.filters || null, metrics: [], generatedBy: "Alice Johnson",
        generatedAt: new Date().toISOString(), fileUrl: "/reports/download/report-1.csv",
        createdAt: new Date().toISOString(),
      }));
    }

    const id = path.match(/\/api\/reports\/([^/]+)$/)?.[1];
    if (id) {
      return route.fulfill(jsonFulfill(200, { id, name: "Monthly Report", type: "monthly", status: "ready", format: "csv", dateRangeStart: "2026-06-01", dateRangeEnd: "2026-06-30", filters: null, metrics: [], generatedBy: "Alice Johnson", generatedAt: "2026-07-01T00:00:00Z", fileUrl: `/reports/download/report-${id}.csv`, createdAt: "2026-07-01T00:00:00Z" }));
    }

    return route.fulfill(jsonFulfill(200, { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }));
  });
}

export async function mockAuditLogRoutes(page: Page) {
  await page.route("**/api/audit-logs**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/audit-logs\/([^/]+)$/)?.[1];
    if (id) {
      const entry = MOCK_AUDIT_LOGS.find((a) => a.id === id);
      return entry
        ? route.fulfill(jsonFulfill(200, entry))
        : route.fulfill(jsonFulfill(404, { message: "Audit log entry not found" }));
    }
    const action = url.searchParams.get("action");
    const search = url.searchParams.get("search");
    let filtered = [...MOCK_AUDIT_LOGS];
    if (action) filtered = filtered.filter((e) => e.action === action);
    if (search) filtered = filtered.filter((e) => e.description.toLowerCase().includes(search.toLowerCase()));
    return route.fulfill(jsonFulfill(200, paginated(filtered)));
  });
}

export async function mockUserRoutes(page: Page) {
  await page.route("**/api/users**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/users\/([^/]+)$/)?.[1];
    if (request.method() === "PATCH" && id) {
      const body = request.postDataJSON();
      const user = Object.values(MOCK_USERS).find((u) => u.id === id);
      return user
        ? route.fulfill(jsonFulfill(200, { ...user, ...body }))
        : route.fulfill(jsonFulfill(404, { message: "User not found" }));
    }
    if (request.method() === "DELETE" && id) {
      return route.fulfill(jsonFulfill(200, { success: true }));
    }
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      return route.fulfill(jsonFulfill(201, { id: "user-new", ...body, isActive: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }));
    }
    if (id) {
      const user = Object.values(MOCK_USERS).find((u) => u.id === id);
      return user
        ? route.fulfill(jsonFulfill(200, user))
        : route.fulfill(jsonFulfill(404, { message: "User not found" }));
    }
    return route.fulfill(jsonFulfill(200, paginated(Object.values(MOCK_USERS))));
  });
}

export async function mockRoleRoutes(page: Page) {
  await page.route("**/api/roles**", async (route, request) => {
    const url = new URL(request.url());
    const id = url.pathname.match(/\/api\/roles\/([^/]+)$/)?.[1];
    if (id) {
      return route.fulfill(jsonFulfill(200, {
        id, name: id === "role-admin" ? "Administrator" : "Support Engineer",
        description: "Role description", isSystem: true,
        permissions: [], createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-06-01T00:00:00Z",
      }));
    }
    return route.fulfill(jsonFulfill(200, {
      data: [
        { id: "role-admin", name: "Administrator", description: "Full system access", isSystem: true, userCount: 2 },
        { id: "role-support", name: "Support Engineer", description: "Support operations access", isSystem: true, userCount: 5 },
        { id: "role-installer", name: "Field Installer", description: "Device installation and maintenance", isSystem: true, userCount: 8 },
        { id: "role-customer", name: "Customer", description: "Limited view of own devices and data", isSystem: true, userCount: 50 },
      ],
    }));
  });
}

// ─── Device Group mock data ────────────────────────────────────────────

interface MockDeviceGroup {
  id: string;
  name: string;
  description: string | null;
  deviceIds: string[];
  deviceCount: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const MOCK_DEVICE_GROUPS: MockDeviceGroup[] = [
  {
    id: "group-1",
    name: "Building A Sensors",
    description: "All temperature and humidity sensors in Building A",
    deviceIds: ["dev-1", "dev-2"],
    deviceCount: 2,
    archivedAt: null,
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "group-2",
    name: "Critical Infrastructure",
    description: "Mission-critical devices requiring immediate attention",
    deviceIds: ["dev-4"],
    deviceCount: 1,
    archivedAt: null,
    createdAt: "2026-06-05T09:00:00Z",
    updatedAt: "2026-06-10T12:00:00Z",
  },
  {
    id: "group-3",
    name: "Riverside Fleet",
    description: "All devices deployed at Riverside Park estate",
    deviceIds: ["dev-4", "dev-5"],
    deviceCount: 2,
    archivedAt: null,
    createdAt: "2026-06-10T07:00:00Z",
    updatedAt: "2026-06-12T14:00:00Z",
  },
  {
    id: "group-4",
    name: "Legacy Deployment",
    description: "Decommissioned devices from the 2025 rollout",
    deviceIds: [],
    deviceCount: 0,
    archivedAt: "2026-07-01T00:00:00Z",
    createdAt: "2025-12-01T08:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  },
  {
    id: "group-5",
    name: "Warehouse Zone A",
    description: "Devices monitoring the north wing of Warehouse A",
    deviceIds: ["dev-1"],
    deviceCount: 1,
    archivedAt: null,
    createdAt: "2026-06-20T10:00:00Z",
    updatedAt: "2026-06-20T10:00:00Z",
  },
];

// Map group -> device list for the group-devices endpoint
const GROUP_DEVICES_MAP: Record<string, typeof MOCK_DEVICES> = {
  "group-1": [MOCK_DEVICES[0], MOCK_DEVICES[1]],
  "group-2": [MOCK_DEVICES[3]],
  "group-3": [MOCK_DEVICES[3], MOCK_DEVICES[4]],
  "group-4": [],
  "group-5": [MOCK_DEVICES[0]],
};

/** Clone a group object so POST/PATCH don't mutate the seed data. */
function cloneGroup(g: MockDeviceGroup): MockDeviceGroup {
  return JSON.parse(JSON.stringify(g)) as MockDeviceGroup;
}

/** Filter groups by archive state. */
function filterGroupsByArchive(
  groups: MockDeviceGroup[],
  filter: string | null,
): MockDeviceGroup[] {
  if (filter === "true") return groups.filter((g) => !!g.archivedAt);
  if (filter === "false") return groups.filter((g) => !g.archivedAt);
  return groups; // "all"
}

/** In-memory mutable groups store for tests to mutate. */
let mockGroups: MockDeviceGroup[];

export function resetMockGroups() {
  mockGroups = MOCK_DEVICE_GROUPS.map((g) => cloneGroup(g));
}

export async function mockDeviceGroupRoutes(page: Page) {
  await page.route("**/api/device-groups**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    // ── POST /api/device-groups — create ──────────────────────────────
    if (request.method() === "POST") {
      // Check for action sub-routes first
      const postMatch = path.match(
        /\/api\/device-groups\/([^/]+)\/(archive|restore|duplicate)$/,
      );
      if (postMatch) {
        const gid = postMatch[1];
        const action = postMatch[2];
        const group = mockGroups.find((g) => g.id === gid);
        if (!group)
          return route.fulfill(jsonFulfill(404, { message: "Group not found" }));

        if (action === "archive") {
          group.archivedAt = new Date().toISOString();
          return route.fulfill(
            jsonFulfill(200, { success: true, name: group.name }),
          );
        }
        if (action === "restore") {
          group.archivedAt = null;
          return route.fulfill(
            jsonFulfill(200, { success: true, name: group.name }),
          );
        }
        if (action === "duplicate") {
          const dup = {
            ...cloneGroup(group),
            id: `group-dup-${Date.now()}`,
            name: `${group.name} (Copy)`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          mockGroups.push(dup);
          return route.fulfill(jsonFulfill(201, dup));
        }
      }

      // Handle add device: POST /api/device-groups/:id/devices
      const addDevMatch = path.match(
        /\/api\/device-groups\/([^/]+)\/devices$/,
      );
      if (addDevMatch) {
        const gid = addDevMatch[1];
        const body = request.postDataJSON();
        const group = mockGroups.find((g) => g.id === gid);
        if (!group)
          return route.fulfill(jsonFulfill(404, { message: "Group not found" }));
        if (!group.deviceIds.includes(body.deviceId)) {
          group.deviceIds.push(body.deviceId);
          group.deviceCount = group.deviceIds.length;
        }
        return route.fulfill(
          jsonFulfill(200, {
            success: true,
            deviceName: "Mock Device",
            groupName: group.name,
          }),
        );
      }

      // Plain POST /api/device-groups — create group
      const body = request.postDataJSON();
      const newGroup = {
        id: `group-new-${Date.now()}`,
        name: body.name,
        description: body.description ?? null,
        deviceIds: [],
        deviceCount: 0,
        archivedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockGroups.push(newGroup);
      return route.fulfill(jsonFulfill(201, newGroup));
    }

    // ── PATCH /api/device-groups/:id — update ─────────────────────────
    if (request.method() === "PATCH") {
      const id = path.match(/\/api\/device-groups\/([^/]+)$/)?.[1];
      const group = mockGroups.find((g) => g.id === id);
      if (!group)
        return route.fulfill(jsonFulfill(404, { message: "Group not found" }));
      const patchBody = request.postDataJSON();
      Object.assign(group, patchBody);
      group.updatedAt = new Date().toISOString();
      return route.fulfill(jsonFulfill(200, cloneGroup(group)));
    }

    // ── DELETE /api/device-groups/:id — delete ────────────────────────
    if (request.method() === "DELETE") {
      // Check for remove device: DELETE /api/device-groups/:id/devices/:deviceId
      const removeDevMatch = path.match(
        /\/api\/device-groups\/([^/]+)\/devices\/([^/]+)$/,
      );
      if (removeDevMatch) {
        const gid = removeDevMatch[1];
        const did = removeDevMatch[2];
        const group = mockGroups.find((g) => g.id === gid);
        if (!group)
          return route.fulfill(jsonFulfill(404, { message: "Group not found" }));
        group.deviceIds = group.deviceIds.filter((id) => id !== did);
        group.deviceCount = group.deviceIds.length;
        return route.fulfill(jsonFulfill(200, { success: true }));
      }

      // Check for bulk remove tags: DELETE /api/device-groups/:id/tags
      const bulkRemoveMatch = path.match(
        /\/api\/device-groups\/([^/]+)\/tags$/,
      );
      if (bulkRemoveMatch) {
        const gid = bulkRemoveMatch[1];
        const body = request.postDataJSON();
        const removedTags: string[] = body?.tags ?? [];
        return route.fulfill(
          jsonFulfill(200, {
            success: true,
            affectedCount: 2,
            removedTags,
          }),
        );
      }

      // Plain DELETE /api/device-groups/:id — delete group
      const id = path.match(/\/api\/device-groups\/([^/]+)$/)?.[1];
      const idx = mockGroups.findIndex((g) => g.id === id);
      if (idx === -1)
        return route.fulfill(jsonFulfill(404, { message: "Group not found" }));
      mockGroups.splice(idx, 1);
      return route.fulfill(jsonFulfill(200, { success: true }));
    }

    // ── GET handlers below ─────────────────────────────────────────────

    // GET /api/device-groups/:id/tag-preview
    const previewMatch = path.match(
      /\/api\/device-groups\/([^/]+)\/tag-preview$/,
    );
    if (previewMatch) {
      const gid = previewMatch[1];
      const group = mockGroups.find((g) => g.id === gid);
      const devices = group ? GROUP_DEVICES_MAP[group.id] ?? [] : [];
      return route.fulfill(
        jsonFulfill(200, {
          deviceCount: devices.length,
          sampleDevices: devices.slice(0, 3).map((d) => ({
            id: d.id,
            name: d.name,
          })),
        }),
      );
    }

    // GET /api/device-groups/:id/devices — paginated group devices
    const devicesMatch = path.match(
      /\/api\/device-groups\/([^/]+)\/devices$/,
    );
    if (devicesMatch) {
      const gid = devicesMatch[1];
      const search = url.searchParams.get("search")?.toLowerCase() ?? "";
      const page = parseInt(url.searchParams.get("page") ?? "1");
      const limit = parseInt(url.searchParams.get("limit") ?? "20");
      let devices = GROUP_DEVICES_MAP[gid] ?? [];
      if (search) {
        devices = devices.filter(
          (d) =>
            d.name.toLowerCase().includes(search) ||
            d.serialNumber.toLowerCase().includes(search),
        );
      }
      return route.fulfill(jsonFulfill(200, paginated(devices, page, limit)));
    }

    // GET /api/device-groups/:id — single group
    const id = path.match(/\/api\/device-groups\/([^/]+)$/)?.[1];
    if (id) {
      const group = mockGroups.find((g) => g.id === id);
      return group
        ? route.fulfill(jsonFulfill(200, cloneGroup(group)))
        : route.fulfill(jsonFulfill(404, { message: "Group not found" }));
    }

    // GET /api/device-groups — paginated list
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const archived = url.searchParams.get("archived") ?? "false";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    let filtered = filterGroupsByArchive(mockGroups, archived);
    if (search) {
      filtered = filtered.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          (g.description ?? "").toLowerCase().includes(search),
      );
    }
    return route.fulfill(jsonFulfill(200, paginated(filtered, page, limit)));
  });
}

// ─── Firmware Package mock data ───────────────────────────────────────────

interface MockFirmwarePackage {
  id: string;
  name: string;
  version: string;
  deviceType: string[];
  releaseNotes: string | null;
  fileHash: string | null;
  fileSize: number | null;
  status: "active" | "deprecated";
  createdBy: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

const MOCK_FIRMWARE_PACKAGES: MockFirmwarePackage[] = [
  {
    id: "pkg-1",
    name: "Sensor OS",
    version: "2.1.0",
    deviceType: ["temperature", "humidity"],
    releaseNotes: "Improved battery life and signal stability",
    fileHash: "sha256-a1b2c3d4e5f6...",
    fileSize: 4194304,
    status: "active",
    createdBy: "Alice Johnson",
    metadata: { buildNumber: "421", minProtocol: "1.0" },
    createdAt: "2026-05-01T08:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
  },
  {
    id: "pkg-2",
    name: "Gateway Firmware",
    version: "3.0.1",
    deviceType: ["power", "vibration"],
    releaseNotes: "Critical security patch for Modbus interface",
    fileHash: "sha256-f6e5d4c3b2a1...",
    fileSize: 8388608,
    status: "active",
    createdBy: "Alice Johnson",
    metadata: null,
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "pkg-3",
    name: "Sensor OS",
    version: "1.8.3",
    deviceType: ["temperature", "humidity"],
    releaseNotes: "Legacy version",
    fileHash: null,
    fileSize: null,
    status: "deprecated",
    createdBy: "Bob Smith",
    metadata: null,
    createdAt: "2026-03-01T08:00:00Z",
    updatedAt: "2026-05-01T12:00:00Z",
  },
];

let mockFirmwarePackages: MockFirmwarePackage[];

export function resetMockFirmware() {
  mockFirmwarePackages = MOCK_FIRMWARE_PACKAGES.map((p) => JSON.parse(JSON.stringify(p)));
}

// ─── Rollout mock data ──────────────────────────────────────────────────

interface MockRolloutDevice {
  id: string;
  rolloutId: string;
  deviceId: string;
  status: "pending" | "running" | "succeeded" | "failed" | "skipped" | "cancelled";
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

interface MockRollout {
  id: string;
  jobType: string;
  name: string;
  firmwarePackageId: string | null;
  jobConfig: Record<string, unknown> | null;
  targetGroupId: string;
  status: "draft" | "running" | "completed" | "failed" | "cancelled";
  deviceCount: number;
  completedCount: number;
  failedCount: number;
  createdBy: string;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  firmwareName?: string | null;
  targetGroupName?: string | null;
}

const BASE_TIME = "2026-06-15T08:00:00Z";

const MOCK_ROLLOUTS: MockRollout[] = [
  {
    id: "rollout-1",
    jobType: "firmware",
    name: "Sensor OS v2.1.0 → Building A Sensors",
    firmwarePackageId: "pkg-1",
    jobConfig: null,
    targetGroupId: "group-1",
    status: "draft",
    deviceCount: 2,
    completedCount: 0,
    failedCount: 0,
    createdBy: "user-1",
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: "2026-06-15T08:00:00Z",
    updatedAt: "2026-06-15T08:00:00Z",
    firmwareName: "Sensor OS v2.1.0",
    targetGroupName: "Building A Sensors",
  },
  {
    id: "rollout-2",
    jobType: "firmware",
    name: "Gateway Firmware v3.0.1 → Riverside Fleet",
    firmwarePackageId: "pkg-2",
    jobConfig: null,
    targetGroupId: "group-3",
    status: "running",
    deviceCount: 2,
    completedCount: 1,
    failedCount: 0,
    createdBy: "user-1",
    startedAt: "2026-06-16T10:00:00Z",
    completedAt: null,
    cancelledAt: null,
    createdAt: "2026-06-15T09:00:00Z",
    updatedAt: "2026-06-16T10:30:00Z",
    firmwareName: "Gateway Firmware v3.0.1",
    targetGroupName: "Riverside Fleet",
  },
  {
    id: "rollout-3",
    jobType: "firmware",
    name: "Sensor OS v2.1.0 → Riverside Fleet",
    firmwarePackageId: "pkg-1",
    jobConfig: null,
    targetGroupId: "group-3",
    status: "completed",
    deviceCount: 2,
    completedCount: 2,
    failedCount: 0,
    createdBy: "user-1",
    startedAt: "2026-06-10T08:00:00Z",
    completedAt: "2026-06-12T16:00:00Z",
    cancelledAt: null,
    createdAt: "2026-06-09T08:00:00Z",
    updatedAt: "2026-06-12T16:00:00Z",
    firmwareName: "Sensor OS v2.1.0",
    targetGroupName: "Riverside Fleet",
  },
  {
    id: "rollout-4",
    jobType: "firmware",
    name: "Gateway Firmware v3.0.1 → Critical Infrastructure",
    firmwarePackageId: "pkg-2",
    jobConfig: null,
    targetGroupId: "group-2",
    status: "failed",
    deviceCount: 1,
    completedCount: 0,
    failedCount: 1,
    createdBy: "user-1",
    startedAt: "2026-06-14T08:00:00Z",
    completedAt: "2026-06-14T08:05:00Z",
    cancelledAt: null,
    createdAt: "2026-06-13T08:00:00Z",
    updatedAt: "2026-06-14T08:05:00Z",
    firmwareName: "Gateway Firmware v3.0.1",
    targetGroupName: "Critical Infrastructure",
  },
];

const MOCK_ROLLOUT_DEVICES: Record<string, MockRolloutDevice[]> = {
  "rollout-1": [
    { id: "rdev-1", rolloutId: "rollout-1", deviceId: "dev-1", status: "pending", errorMessage: null, startedAt: null, completedAt: null },
    { id: "rdev-2", rolloutId: "rollout-1", deviceId: "dev-2", status: "pending", errorMessage: null, startedAt: null, completedAt: null },
  ],
  "rollout-2": [
    { id: "rdev-3", rolloutId: "rollout-2", deviceId: "dev-4", status: "succeeded", errorMessage: null, startedAt: "2026-06-16T10:00:00Z", completedAt: "2026-06-16T10:15:00Z" },
    { id: "rdev-4", rolloutId: "rollout-2", deviceId: "dev-5", status: "running", errorMessage: null, startedAt: "2026-06-16T10:00:00Z", completedAt: null },
  ],
  "rollout-3": [
    { id: "rdev-5", rolloutId: "rollout-3", deviceId: "dev-4", status: "succeeded", errorMessage: null, startedAt: "2026-06-10T08:00:00Z", completedAt: "2026-06-10T08:10:00Z" },
    { id: "rdev-6", rolloutId: "rollout-3", deviceId: "dev-5", status: "succeeded", errorMessage: null, startedAt: "2026-06-10T08:00:00Z", completedAt: "2026-06-10T08:12:00Z" },
  ],
  "rollout-4": [
    { id: "rdev-7", rolloutId: "rollout-4", deviceId: "dev-4", status: "failed", errorMessage: "Device Power Meter D1 did not acknowledge update", startedAt: "2026-06-14T08:00:00Z", completedAt: "2026-06-14T08:05:00Z" },
  ],
};

let mockRollouts: MockRollout[];
let mockRolloutDevices: Record<string, MockRolloutDevice[]>;

export function resetMockRollouts() {
  mockRollouts = MOCK_ROLLOUTS.map((r) => JSON.parse(JSON.stringify(r)));
  mockRolloutDevices = JSON.parse(JSON.stringify(MOCK_ROLLOUT_DEVICES));
}

function cloneRollout(r: MockRollout): MockRollout {
  return JSON.parse(JSON.stringify(r));
}

// ─── Firmware API route mocks ───────────────────────────────────────────

export async function mockFirmwareRoutes(page: Page) {
  await page.route("**/api/firmware**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    // POST /api/firmware/:id/deprecate
    const deprecateMatch = path.match(/\/api\/firmware\/([^/]+)\/deprecate$/);
    if (request.method() === "POST" && deprecateMatch) {
      const pid = deprecateMatch[1];
      const pkg = mockFirmwarePackages.find((p) => p.id === pid);
      if (!pkg) return route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));
      if (pkg.status !== "active") return route.fulfill(jsonFulfill(409, { message: `Firmware package is already "${pkg.status}"`, code: "INVALID_TRANSITION" }));
      pkg.status = "deprecated";
      pkg.updatedAt = new Date().toISOString();
      return route.fulfill(jsonFulfill(200, cloneFirmwarePackage(pkg)));
    }

    // POST /api/firmware/:id/activate
    const activateMatch = path.match(/\/api\/firmware\/([^/]+)\/activate$/);
    if (request.method() === "POST" && activateMatch) {
      const pid = activateMatch[1];
      const pkg = mockFirmwarePackages.find((p) => p.id === pid);
      if (!pkg) return route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));
      if (pkg.status !== "deprecated") return route.fulfill(jsonFulfill(409, { message: `Firmware package is already "${pkg.status}"`, code: "INVALID_TRANSITION" }));
      pkg.status = "active";
      pkg.updatedAt = new Date().toISOString();
      return route.fulfill(jsonFulfill(200, cloneFirmwarePackage(pkg)));
    }

    // POST /api/firmware — create
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const created: MockFirmwarePackage = {
        id: `pkg-new-${Date.now()}`,
        name: body.name,
        version: body.version,
        deviceType: body.deviceType ?? [],
        releaseNotes: body.releaseNotes ?? null,
        fileHash: body.fileHash ?? null,
        fileSize: body.fileSize ?? null,
        status: "active",
        createdBy: "Alice Johnson",
        metadata: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockFirmwarePackages.push(created);
      return route.fulfill(jsonFulfill(201, created));
    }

    // PATCH /api/firmware/:id — update
    if (request.method() === "PATCH") {
      const id = path.match(/\/api\/firmware\/([^/]+)$/)?.[1];
      const pkg = mockFirmwarePackages.find((p) => p.id === id);
      if (!pkg) return route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));
      const body = request.postDataJSON();
      Object.assign(pkg, { ...body, updatedAt: new Date().toISOString() });
      return route.fulfill(jsonFulfill(200, cloneFirmwarePackage(pkg)));
    }

    // DELETE /api/firmware/:id — delete
    if (request.method() === "DELETE") {
      const id = path.match(/\/api\/firmware\/([^/]+)$/)?.[1];
      const idx = mockFirmwarePackages.findIndex((p) => p.id === id);
      if (idx === -1) return route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));
      // Guard: check if referenced by rollouts
      const referenced = mockRollouts.filter((r) => r.firmwarePackageId === id).length;
      if (referenced > 0) {
        return route.fulfill(jsonFulfill(409, { message: `Cannot delete firmware package: ${referenced} rollout(s) reference it`, code: "HAS_ACTIVE_ROLLOUTS" }));
      }
      mockFirmwarePackages.splice(idx, 1);
      return route.fulfill(jsonFulfill(200, { success: true }));
    }

    // GET /api/firmware/:id — single
    const id = path.match(/\/api\/firmware\/([^/]+)$/)?.[1];
    if (id) {
      const pkg = mockFirmwarePackages.find((p) => p.id === id);
      return pkg
        ? route.fulfill(jsonFulfill(200, cloneFirmwarePackage(pkg)))
        : route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));
    }

    // GET /api/firmware — list
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const statusFilter = url.searchParams.get("status") ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    let filtered = [...mockFirmwarePackages];
    if (search) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(search) || p.version.toLowerCase().includes(search),
      );
    }
    if (statusFilter) {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }
    return route.fulfill(jsonFulfill(200, paginated(filtered, page, limit)));
  });
}

function cloneFirmwarePackage(p: MockFirmwarePackage): MockFirmwarePackage {
  return JSON.parse(JSON.stringify(p));
}

// ─── Rollout API route mocks ────────────────────────────────────────────

export async function mockRolloutRoutes(page: Page) {
  await page.route("**/api/rollouts**", async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;

    // ── Pre-creation eligibility: GET /api/rollouts/eligibility/group/:gid/package/:pid ──
    const preEligMatch = path.match(/\/api\/rollouts\/eligibility\/group\/([^/]+)\/package\/([^/]+)$/);
    if (request.method() === "GET" && preEligMatch) {
      const [, gid, pid] = preEligMatch;
      return handleEligibility(route, gid, pid);
    }

    // ── Per-rollout sub-routes ──
    const rolloutId = path.match(/\/api\/rollouts\/([^/]+)\/(.*)$/);
    if (rolloutId) {
      const rid = rolloutId[1];
      const sub = rolloutId[2];

      // GET /api/rollouts/:id/devices
      if (sub === "devices") {
        const devices = mockRolloutDevices[rid] ?? [];
        const statusQuery = url.searchParams.get("status");
        const page = parseInt(url.searchParams.get("page") ?? "1");
        const limit = parseInt(url.searchParams.get("limit") ?? "20");
        let filtered = [...devices];
        if (statusQuery) {
          filtered = filtered.filter((d) => d.status === statusQuery);
        }
        // Enrich with device names
        const enriched = filtered.map((d) => {
          const device = MOCK_DEVICES.find((m) => m.id === d.deviceId);
          return { ...d, deviceName: device?.name ?? null, deviceSerial: device?.serialNumber ?? null };
        });
        return route.fulfill(jsonFulfill(200, paginated(enriched, page, limit)));
      }

      // GET /api/rollouts/:id/eligibility
      if (sub === "eligibility") {
        const rollout = mockRollouts.find((r) => r.id === rid);
        if (!rollout) return route.fulfill(jsonFulfill(404, { message: "Rollout not found", code: "NOT_FOUND" }));
        return handleEligibility(route, rollout.targetGroupId, rollout.firmwarePackageId ?? "");
      }

      // GET /api/rollouts/:id/summary
      if (sub === "summary") {
        const devices = mockRolloutDevices[rid] ?? [];
        const statusMap: Record<string, number> = { pending: 0, running: 0, succeeded: 0, failed: 0, skipped: 0, cancelled: 0 };
        for (const d of devices) {
          statusMap[d.status] = (statusMap[d.status] ?? 0) + 1;
        }
        return route.fulfill(jsonFulfill(200, statusMap));
      }

      // POST /api/rollouts/:id/start
      if (sub === "start") {
        const rollout = mockRollouts.find((r) => r.id === rid);
        if (!rollout) return route.fulfill(jsonFulfill(404, { message: "Rollout not found", code: "NOT_FOUND" }));
        if (rollout.status !== "draft") {
          return route.fulfill(jsonFulfill(409, { message: `Cannot start rollout in "${rollout.status}" status`, code: "INVALID_TRANSITION" }));
        }
        rollout.status = "running";
        rollout.startedAt = new Date().toISOString();
        rollout.updatedAt = new Date().toISOString();
        return route.fulfill(jsonFulfill(200, cloneRollout(rollout)));
      }

      // POST /api/rollouts/:id/cancel
      if (sub === "cancel") {
        const rollout = mockRollouts.find((r) => r.id === rid);
        if (!rollout) return route.fulfill(jsonFulfill(404, { message: "Rollout not found", code: "NOT_FOUND" }));
        if (rollout.status !== "draft" && rollout.status !== "running") {
          return route.fulfill(jsonFulfill(409, { message: `Cannot cancel rollout in "${rollout.status}" status`, code: "INVALID_TRANSITION" }));
        }
        rollout.status = "cancelled";
        rollout.cancelledAt = new Date().toISOString();
        rollout.updatedAt = new Date().toISOString();
        // Mark pending devices as cancelled
        if (mockRolloutDevices[rid]) {
          mockRolloutDevices[rid] = mockRolloutDevices[rid].map((d) =>
            d.status === "pending" ? { ...d, status: "cancelled" as const } : d,
          );
        }
        return route.fulfill(jsonFulfill(200, cloneRollout(rollout)));
      }

      // POST /api/rollouts/:id/retry
      if (sub === "retry") {
        const rollout = mockRollouts.find((r) => r.id === rid);
        if (!rollout) return route.fulfill(jsonFulfill(404, { message: "Rollout not found", code: "NOT_FOUND" }));
        if (!["running", "completed", "failed"].includes(rollout.status)) {
          return route.fulfill(jsonFulfill(409, { message: `Cannot retry rollout in "${rollout.status}" status`, code: "INVALID_TRANSITION" }));
        }
        // Reset failed devices
        let retriedCount = 0;
        if (mockRolloutDevices[rid]) {
          const before = mockRolloutDevices[rid].length;
          mockRolloutDevices[rid] = mockRolloutDevices[rid].map((d) => {
            if (d.status === "failed") {
              retriedCount++;
              return { ...d, status: "pending" as const, errorMessage: null, startedAt: null, completedAt: null };
            }
            return d;
          });
        }
        // If terminal, move back to running
        if (["completed", "failed"].includes(rollout.status) && retriedCount > 0) {
          rollout.status = "running";
          rollout.failedCount = 0;
          rollout.updatedAt = new Date().toISOString();
        }
        return route.fulfill(jsonFulfill(200, { success: true, retriedCount }));
      }

      return route.fulfill(jsonFulfill(404, { message: "Not found" }));
    }

    // ── POST /api/rollouts — create ──
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const fw = mockFirmwarePackages.find((p) => p.id === body.firmwarePackageId);
      if (!fw) return route.fulfill(jsonFulfill(404, { message: "Firmware package not found", code: "NOT_FOUND" }));

      // Look up group devices from group device map
      const groupDevices = GROUP_DEVICES_MAP[body.targetGroupId] ?? [];
      const deviceIds = groupDevices.map((d) => d.id);

      const created: MockRollout = {
        id: `rollout-new-${Date.now()}`,
        jobType: "firmware",
        name: body.name,
        firmwarePackageId: body.firmwarePackageId,
        jobConfig: null,
        targetGroupId: body.targetGroupId,
        status: "draft",
        deviceCount: deviceIds.length,
        completedCount: 0,
        failedCount: 0,
        createdBy: "user-1",
        startedAt: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        firmwareName: fw ? `${fw.name} v${fw.version}` : null,
        targetGroupName: "Mock Group",
      };
      mockRollouts.push(created);

      // Create device entries
      mockRolloutDevices[created.id] = deviceIds.map((did, i) => ({
        id: `rdev-new-${i}`,
        rolloutId: created.id,
        deviceId: did,
        status: "pending" as const,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      }));

      return route.fulfill(jsonFulfill(201, cloneRollout(created)));
    }

    // ── GET /api/rollouts/:id — single ──
    const singleId = path.match(/\/api\/rollouts\/([^/]+)$/)?.[1];
    if (singleId) {
      const rollout = mockRollouts.find((r) => r.id === singleId);
      return rollout
        ? route.fulfill(jsonFulfill(200, cloneRollout(rollout)))
        : route.fulfill(jsonFulfill(404, { message: "Rollout not found", code: "NOT_FOUND" }));
    }

    // ── GET /api/rollouts — list ──
    const search = url.searchParams.get("search")?.toLowerCase() ?? "";
    const statusFilter = url.searchParams.get("status") ?? "";
    const fwIdFilter = url.searchParams.get("firmwarePackageId") ?? "";
    const page = parseInt(url.searchParams.get("page") ?? "1");
    const limit = parseInt(url.searchParams.get("limit") ?? "20");
    let filtered = mockRollouts.filter((r) => r.jobType === "firmware");
    if (search) {
      filtered = filtered.filter((r) => r.name.toLowerCase().includes(search));
    }
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (fwIdFilter) {
      filtered = filtered.filter((r) => r.firmwarePackageId === fwIdFilter);
    }
    return route.fulfill(jsonFulfill(200, paginated(filtered, page, limit)));
  });
}

/** Shared eligibility check for both rollout-specific and pre-creation endpoints. */
async function handleEligibility(
  route: import("@playwright/test").Route,
  groupId: string,
  firmwarePackageId: string,
) {
  const groupDevices = GROUP_DEVICES_MAP[groupId] ?? [];
  const fw = mockFirmwarePackages.find((p) => p.id === firmwarePackageId);
  const fwDeviceTypes = fw?.deviceType ?? [];

  const eligible: Array<{ id: string; name: string; type: string; status: string }> = [];
  const ineligible: Array<{ id: string; name: string; type: string; status: string; reason: string }> = [];

  for (const device of groupDevices) {
    if (fwDeviceTypes.length > 0 && !fwDeviceTypes.includes(device.type)) {
      ineligible.push({ id: device.id, name: device.name, type: device.type, status: device.status, reason: `Device type "${device.type}" not compatible` });
    } else if (device.status !== "online") {
      ineligible.push({ id: device.id, name: device.name, type: device.type, status: device.status, reason: `Device is "${device.status}" (must be online)` });
    } else {
      eligible.push({ id: device.id, name: device.name, type: device.type, status: device.status });
    }
  }

  return route.fulfill(jsonFulfill(200, {
    eligibleCount: eligible.length,
    ineligibleCount: ineligible.length,
    eligibleDevices: eligible,
    ineligibleDevices: ineligible,
  }));
}

export async function mockSettingRoutes(page: Page) {
  await page.route("**/api/settings**", async (route, request) => {
    if (request.method() === "PATCH") {
      return route.fulfill(jsonFulfill(200, { key: "platform_name", value: "Sentience IoT", updatedAt: new Date().toISOString() }));
    }
    return route.fulfill(jsonFulfill(200, {
      data: [
        { key: "platform_name", value: "Sentience IoT", type: "string", category: "general", description: "Platform display name", updatedAt: "2026-01-01T00:00:00Z" },
        { key: "timezone", value: "UTC", type: "string", category: "general", description: "Default timezone", updatedAt: "2026-01-01T00:00:00Z" },
        { key: "maintenance_mode", value: "false", type: "boolean", category: "general", description: "Enable maintenance mode", updatedAt: "2026-01-01T00:00:00Z" },
        { key: "feature_csv_export", value: "true", type: "boolean", category: "feature", description: "Enable CSV export", updatedAt: "2026-01-01T00:00:00Z" },
      ],
    }));
  });
}

/**
 * Mock ALL API routes used by the application.
 * Call this in beforeEach or test setup to intercept every API request.
 */
export async function mockAllRoutes(page: Page) {
  await mockAuthRoutes(page);
  await mockDeviceRoutes(page);
  await mockAlertRoutes(page);
  await mockEventRoutes(page);
  await mockNotificationRoutes(page);
  await mockApiKeyRoutes(page);
  await mockNotificationRuleRoutes(page);
  await mockReportRoutes(page);
  await mockAuditLogRoutes(page);
  await mockUserRoutes(page);
  await mockRoleRoutes(page);
  await mockDeviceGroupRoutes(page);
  await mockFirmwareRoutes(page);
  await mockRolloutRoutes(page);
  await mockSettingRoutes(page);
  resetMockGroups();
  resetMockFirmware();
  resetMockRollouts();
}
