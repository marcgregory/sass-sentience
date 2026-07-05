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

function paginated(data: unknown[], page = 1, limit = 20) {
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
  await mockSettingRoutes(page);
}
