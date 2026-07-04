/**
 * Seed script for the Sentience database.
 *
 * Creates:
 * - 4 roles with full permission matrix
 * - 4 customers matching the mock estates
 * - 4 estates + 8 sites matching device-generator.ts
 * - 5 demo user accounts
 * - 24 devices with realistic telemetry
 * - Recent events
 * - Mix of alerts (open/acknowledged/resolved)
 * - Sample audit log entries
 * - Platform settings
 * - 1 pre-seeded API key
 * - 7 notification rules
 * - 11 demo notifications
 *
 * Usage: pnpm db:seed
 */

import { db, pool } from "./index";
import * as schema from "./schema";
import * as crypto from "crypto";
import bcrypt from "bcrypt";

// Helper: deterministic UUID v4 from a namespace string
function uuidFrom(name: string): string {
  // Create a simple but valid UUID v4 from a hash
  const hash = crypto.createHash("md5").update(name).digest("hex");
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 3600_000);
}

async function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── 1. Roles ──────────────────────────────────────────────────────

  console.log("  Creating roles...");

  const roleDefs = [
    { id: uuidFrom("role-admin"), name: "admin", label: "Administrator", description: "Full system access. Can manage users, roles, settings, and all platform resources." },
    { id: uuidFrom("role-support"), name: "support", label: "Support Engineer", description: "Can view and manage devices, alerts, events, and reports. Cannot manage users, roles, or system settings." },
    { id: uuidFrom("role-installer"), name: "installer", label: "Installer", description: "Can view and update devices they have been assigned to. Cannot manage other platform resources." },
    { id: uuidFrom("role-customer"), name: "customer", label: "Customer", description: "Read-only access to assigned estates, devices, alerts, and reports." },
  ];

  for (const r of roleDefs) {
    await db.insert(schema.roles).values(r).onConflictDoNothing({ target: schema.roles.name });
  }

  const allRoles = await db.select().from(schema.roles);
  const rolesMap: Record<string, string> = {};
  for (const r of allRoles) {
    rolesMap[r.name] = r.id;
  }
  console.log(`    → ${allRoles.length} roles`);

  // ─── 2. Role Permissions ───────────────────────────────────────────

  console.log("  Creating role permissions...");

  const resources = [
    "dashboard", "devices", "alerts", "events", "reports",
    "users", "roles", "settings", "audit", "admin",
    "estates", "sites", "api_keys", "notifications",
  ];

  const allActions = ["create", "read", "update", "delete", "manage"];
  const perms: { roleId: string; resource: string; action: string }[] = [];

  for (const [roleName, roleId] of Object.entries(rolesMap)) {
    for (const resource of resources) {
      if (roleName === "admin") {
        for (const action of allActions) {
          perms.push({ roleId, resource, action });
        }
      } else if (roleName === "support") {
        if (["users", "roles", "api_keys", "admin", "settings", "audit"].includes(resource)) {
          perms.push({ roleId, resource, action: "read" });
        } else {
          for (const action of allActions) {
            perms.push({ roleId, resource, action });
          }
        }
      } else if (roleName === "installer") {
        if (["devices", "estates", "sites"].includes(resource)) {
          perms.push({ roleId, resource, action: "read" }, { roleId, resource, action: "update" });
        } else if (["dashboard", "alerts", "events"].includes(resource)) {
          perms.push({ roleId, resource, action: "read" });
        }
      } else if (roleName === "customer") {
        if (["dashboard", "devices", "alerts", "events", "reports", "estates", "sites"].includes(resource)) {
          perms.push({ roleId, resource, action: "read" });
        }
      }
    }
  }

  // Batch insert in chunks
  for (let i = 0; i < perms.length; i += 50) {
    const chunk = perms.slice(i, i + 50);
    for (const p of chunk) {
      await db.insert(schema.rolePermissions).values(p).onConflictDoNothing();
    }
  }

  console.log(`    → ${perms.length} permissions created`);

  // ─── 3. Customers ──────────────────────────────────────────────────

  console.log("  Creating customers...");

  const customerDefs = [
    {
      id: uuidFrom("customer-riverside"), name: "Riverside Properties Ltd", domain: "riverside-properties.com",
      contactName: "Sarah Chen", contactEmail: "s.chen@riverside-properties.com", contactPhone: "+1-555-0101",
      address: "1 Riverside Drive", city: "Manchester", country: "UK", licenseType: "professional" as const,
      maxDevices: 200, maxUsers: 25,
    },
    {
      id: uuidFrom("customer-techvalley"), name: "Tech Valley Corp", domain: "techvalley.io",
      contactName: "James Wilson", contactEmail: "j.wilson@techvalley.io", contactPhone: "+1-555-0102",
      address: "42 Innovation Way", city: "Cambridge", country: "UK", licenseType: "enterprise" as const,
      maxDevices: 500, maxUsers: 50,
    },
    {
      id: uuidFrom("customer-harbour"), name: "Harbour Terminal Operations", domain: "harbour-terminal.co.uk",
      contactName: "Mike O'Brien", contactEmail: "m.obrien@harbour-terminal.co.uk", contactPhone: "+1-555-0103",
      address: "Dock Road Industrial Estate", city: "Liverpool", country: "UK", licenseType: "professional" as const,
      maxDevices: 150, maxUsers: 20,
    },
    {
      id: uuidFrom("customer-greenfield"), name: "Greenfield Data Centres Ltd", domain: "greenfield-dc.com",
      contactName: "Dr. Aisha Patel", contactEmail: "a.patel@greenfield-dc.com", contactPhone: "+1-555-0104",
      address: "Greenfield Business Park", city: "Swindon", country: "UK", licenseType: "enterprise" as const,
      maxDevices: 1000, maxUsers: 30,
    },
  ];

  for (const c of customerDefs) {
    await db.insert(schema.customers).values(c).onConflictDoNothing({ target: schema.customers.name });
  }

  const allCustomers = await db.select().from(schema.customers);
  const findCustomer = (namePrefix: string) => allCustomers.find((c) => c.name.startsWith(namePrefix))!;
  console.log(`    → ${allCustomers.length} customers`);

  // ─── 4. Users ──────────────────────────────────────────────────────

  console.log("  Creating users...");

  const userDefs = [
    { id: uuidFrom("user-admin"), email: "admin@sentience.io", password: "admin123", name: "Alex Turner", roleName: "admin" as const, customerId: null as string | null },
    { id: uuidFrom("user-support"), email: "support@sentience.io", password: "support123", name: "Jordan Lee", roleName: "support" as const, customerId: null },
    { id: uuidFrom("user-installer"), email: "installer@sentience.io", password: "installer123", name: "Sam Rivera", roleName: "installer" as const, customerId: null },
    { id: uuidFrom("user-customer"), email: "customer@sentience.io", password: "customer123", name: "Morgan Chen", roleName: "customer" as const, customerId: findCustomer("Riverside")?.id ?? null },
    { id: uuidFrom("user-viewer"), email: "viewer@sentience.io", password: "viewer123", name: "Taylor Smith", roleName: "customer" as const, customerId: findCustomer("Tech Valley")?.id ?? null },
  ];

  for (const u of userDefs) {
    await db.insert(schema.users).values({
      id: u.id as any,
      email: u.email,
      passwordHash: await hashPassword(u.password),
      name: u.name,
      roleId: rolesMap[u.roleName],
      customerId: u.customerId,
      isActive: true,
    }).onConflictDoNothing({ target: schema.users.email });
  }

  const allUsers = await db.select().from(schema.users);
  const findUserByEmail = (emailPrefix: string) =>
    allUsers.find((u) => u.email.startsWith(emailPrefix))!;
  console.log(`    → ${allUsers.length} users`);

  // ─── 5. Estates ────────────────────────────────────────────────────

  console.log("  Creating estates...");

  const estateDefs = [
    { id: uuidFrom("estate-riverside"), name: "Riverside Complex", address: "1 Riverside Drive", city: "Manchester", region: "North West", country: "UK",
      contactName: "Sarah Chen", contactEmail: "s.chen@riverside-properties.com", contactPhone: "+1-555-0101",
      customerId: findCustomer("Riverside")!.id, managerId: findUserByEmail("admin")!.id, siteCount: 2 },
    { id: uuidFrom("estate-techvalley"), name: "Tech Valley Park", address: "42 Innovation Way", city: "Cambridge", region: "East of England", country: "UK",
      contactName: "James Wilson", contactEmail: "j.wilson@techvalley.io", contactPhone: "+1-555-0102",
      customerId: findCustomer("Tech Valley")!.id, managerId: findUserByEmail("support")!.id, siteCount: 2 },
    { id: uuidFrom("estate-harbour"), name: "Harbour Terminal", address: "Dock Road Industrial Estate", city: "Liverpool", region: "North West", country: "UK",
      contactName: "Mike O'Brien", contactEmail: "m.obrien@harbour-terminal.co.uk", contactPhone: "+1-555-0103",
      customerId: findCustomer("Harbour")!.id, managerId: findUserByEmail("support")!.id, siteCount: 2 },
    { id: uuidFrom("estate-greenfield"), name: "Greenfield Data Centre", address: "Greenfield Business Park", city: "Swindon", region: "South West", country: "UK",
      contactName: "Dr. Aisha Patel", contactEmail: "a.patel@greenfield-dc.com", contactPhone: "+1-555-0104",
      customerId: findCustomer("Greenfield")!.id, managerId: findUserByEmail("admin")!.id, siteCount: 2 },
  ];

  for (const e of estateDefs) {
    await db.insert(schema.estates).values(e).onConflictDoNothing({ target: schema.estates.name });
  }

  const allEstates = await db.select().from(schema.estates);
  const findEstate = (namePrefix: string) => allEstates.find((e) => e.name.startsWith(namePrefix))!;
  console.log(`    → ${allEstates.length} estates`);

  // ─── 6. Sites ──────────────────────────────────────────────────────

  console.log("  Creating sites...");

  const siteDefs = [
    { id: uuidFrom("site-riverside-a"), name: "Building A", estateId: findEstate("Riverside").id, address: "1 Riverside Drive, Block A", buildingCount: 2, floorCount: 4, roomCount: 20 },
    { id: uuidFrom("site-riverside-b"), name: "Building B", estateId: findEstate("Riverside").id, address: "1 Riverside Drive, Block B", buildingCount: 1, floorCount: 3, roomCount: 15 },
    { id: uuidFrom("site-techvalley-1"), name: "Warehouse 1", estateId: findEstate("Tech Valley").id, address: "42 Innovation Way, Warehouse 1", buildingCount: 1, floorCount: 2, roomCount: 10 },
    { id: uuidFrom("site-techvalley-admin"), name: "Admin Block", estateId: findEstate("Tech Valley").id, address: "42 Innovation Way, Admin", buildingCount: 1, floorCount: 5, roomCount: 30 },
    { id: uuidFrom("site-harbour-main"), name: "Main Terminal", estateId: findEstate("Harbour").id, address: "Dock Road, Main Terminal", buildingCount: 3, floorCount: 2, roomCount: 15 },
    { id: uuidFrom("site-harbour-north"), name: "North Gate", estateId: findEstate("Harbour").id, address: "Dock Road, North Gate", buildingCount: 1, floorCount: 1, roomCount: 5 },
    { id: uuidFrom("site-greenfield-a"), name: "Server Hall A", estateId: findEstate("Greenfield").id, address: "Greenfield Park, Hall A", buildingCount: 1, floorCount: 3, roomCount: 25 },
    { id: uuidFrom("site-greenfield-b"), name: "Server Hall B", estateId: findEstate("Greenfield").id, address: "Greenfield Park, Hall B", buildingCount: 1, floorCount: 3, roomCount: 25 },
  ];

  for (const s of siteDefs) {
    await db.insert(schema.sites).values(s).onConflictDoNothing({ target: schema.sites.name });
  }

  const allSites = await db.select().from(schema.sites);
  console.log(`    → ${allSites.length} sites`);

  // ─── 7. Devices ────────────────────────────────────────────────────

  console.log("  Creating devices...");

  const deviceNames = [
    "Main Controller", "Zone Sensor A", "Perimeter Gateway", "Relay Panel",
    "Thermal Camera", "Entry Sensor", "Environmental Monitor",
    "Auxiliary Controller", "Backup Gateway", "Alarm Panel",
    "HVAC Controller", "Smoke Detector", "Access Control", "Lighting Controller",
    "Water Leak Sensor", "Power Monitor", "Fire Alarm Panel", "Elevator Controller",
    "Generator Monitor", "UPS Monitor", "Vibration Sensor", "Pressure Gauge",
    "Flow Meter", "Temperature Array",
  ];

  const deviceTypes = ["controller", "sensor", "gateway", "relay", "camera"] as const;
  const statuses = ["online", "online", "online", "online", "warning", "offline", "fault"] as const;

  for (let i = 0; i < deviceNames.length; i++) {
    const site = allSites[i % allSites.length];
    const status = statuses[i % statuses.length];
    const type = deviceTypes[i % deviceTypes.length];
    const battery = status === "offline" ? 0 : status === "fault" ? randomBetween(5, 30) : randomBetween(50, 100);
    const signalStrength = randomBetween(-120, -40);
    const temperature = type === "camera" ? randomBetween(30, 55) : randomBetween(18, 38);

    await db.insert(schema.devices).values({
      id: uuidFrom(`device-${i}`),
      serialNumber: `SN-${crypto.randomBytes(5).toString("hex").toUpperCase()}`,
      macAddress: Array.from({ length: 6 }, () => crypto.randomBytes(1).readUInt8(0).toString(16).padStart(2, "0")).join(":"),
      name: deviceNames[i],
      type,
      status,
      firmwareVersion: `${randomBetween(1, 4)}.${randomBetween(0, 9)}.${randomBetween(0, 99)}`,
      firmwareBuild: crypto.randomBytes(4).toString("hex").toUpperCase(),
      firmwareReleasedAt: hoursAgo(randomBetween(30, 365 * 24)),
      firmwareInstalledAt: hoursAgo(randomBetween(1, 90 * 24)),
      battery,
      voltage: parseFloat((3.0 + Math.random() * 0.7).toFixed(2)),
      temperature,
      signalStrength,
      uptime: status === "online" ? randomBetween(3600, 30 * 86400) : 0,
      lastHeartbeat: status !== "offline" ? hoursAgo(randomBetween(0, 1)) : hoursAgo(randomBetween(2, 48)),
      siteId: site.id,
      installedAt: hoursAgo(randomBetween(30, 365 * 24)),
      lastMaintenance: Math.random() > 0.3 ? hoursAgo(randomBetween(1, 60 * 24)) : null,
      notes: Math.random() > 0.7 ? "Routine maintenance completed" : null,
      tags: [["critical", "monitored", "indoor", "outdoor", "battery-powered", "hardwired"][i % 6]],
      deviceConfig: {
        mqttTopic: `sites/${site.name.toLowerCase().replace(/\s+/g, "-")}/devices/${deviceNames[i].toLowerCase().replace(/\s+/g, "-")}`,
        publishInterval: randomBetween(10, 60),
        samplingRate: randomBetween(1, 30),
        logLevel: ["debug", "info", "warn"][i % 3],
        thresholds: {
          temperatureMin: -10,
          temperatureMax: type === "camera" ? 55 : 45,
          batteryMin: 15,
          signalMin: -95,
        },
      },
      deviceIo: {
        inputs: [
          { name: "Digital Input 1", type: "digital", value: i % 3 === 0 ? "HIGH" : "LOW", status: "normal" },
          { name: "Analog Input 1", type: "analog", value: `${randomBetween(0, 10)}V`, status: "normal" },
          { name: "Temperature Probe", type: "sensor", value: `${temperature}°C`, status: temperature > 40 ? "warning" : "normal" },
        ],
        outputs: [
          { name: "Relay 1", type: "relay", value: i % 2 === 0 ? "OPEN" : "CLOSED", status: "normal" },
          { name: "Digital Output 1", type: "digital", value: i % 3 === 0 ? "HIGH" : "LOW", status: "normal" },
        ],
      },
      lastDiagnostics: {
        lastRun: hoursAgo(randomBetween(0, 168)).toISOString(),
        status: ["pass", "pass", "pass", "warning", "fail"][i % 5],
        checks: [
          { name: "Ping Test", status: "pass", latency: `${randomBetween(1, 50)}ms` },
          { name: "MQTT Connectivity", status: i % 4 === 0 ? "warning" : "pass", message: i % 4 === 0 ? "Intermittent connection" : "Connected" },
          { name: "Sensor Calibration", status: i % 7 === 0 ? "fail" : "pass", message: i % 7 === 0 ? "Calibration drift detected" : "Within range" },
          { name: "Memory Check", status: "pass", usage: `${randomBetween(30, 85)}%` },
          { name: "Signal Test", status: signalStrength < -90 ? "warning" : "pass", message: signalStrength < -90 ? "Weak signal" : "Signal OK" },
        ],
      },
    }).onConflictDoNothing();
  }

  const allDevices = await db.select().from(schema.devices);
  console.log(`    → ${allDevices.length} devices`);

  // Update site/estate device counts after seeding
  for (const site of allSites) {
    const siteDevices = allDevices.filter((d) => d.siteId === site.id);
    const online = siteDevices.filter((d) => d.status === "online").length;
    const offline = siteDevices.filter((d) => d.status === "offline").length;
    const fault = siteDevices.filter((d) => d.status === "fault").length;
    const warning = siteDevices.filter((d) => d.status === "warning").length;
    const avgBattery = siteDevices.reduce((s, d) => s + (d.battery ?? 50), 0) / Math.max(1, siteDevices.length);
    const avgSignal = siteDevices.reduce((s, d) => s + Math.max(0, 100 + (d.signalStrength ?? -70)), 0) / Math.max(1, siteDevices.length);

    await db.update(schema.sites).set({
      deviceCount: siteDevices.length,
      onlineCount: online,
      offlineCount: offline,
      faultCount: fault,
      warningCount: warning,
      healthScore: Math.round(online / Math.max(1, siteDevices.length) * 40 + avgBattery * 0.3 + avgSignal * 0.3),
    }).where(eq(schema.sites.id, site.id));
  }

  for (const estate of allEstates) {
    const estateSites = allSites.filter((s) => s.estateId === estate.id);
    const estateDevices = estateSites.flatMap((s) => allDevices.filter((d) => d.siteId === s.id));
    await db.update(schema.estates).set({
      deviceCount: estateDevices.length,
      onlineCount: estateDevices.filter((d) => d.status === "online").length,
      offlineCount: estateDevices.filter((d) => d.status === "offline").length,
      faultCount: estateDevices.filter((d) => d.status === "fault").length,
      warningCount: estateDevices.filter((d) => d.status === "warning").length,
      healthScore: Math.round(estateDevices.filter((d) => d.status === "online").length / Math.max(1, estateDevices.length) * 100),
      siteCount: estateSites.length,
    }).where(eq(schema.estates.id, estate.id));
  }

  const adminUser = findUserByEmail("admin")!;
  const supportUser = findUserByEmail("support")!;

  // ─── 8. Events ─────────────────────────────────────────────────────

  console.log("  Creating events...");

  const eventSeverities = ["info", "info", "info", "warning", "warning", "error", "critical"] as const;
  const eventCategories = [
    "device_online", "device_offline", "device_fault", "heartbeat",
    "telemetry", "config_change", "firmware_update", "alert_triggered",
    "alert_resolved", "user_action", "system", "diagnostic",
  ] as const;

  for (let i = 0; i < 50; i++) {
    const device = allDevices[i % allDevices.length];
    const severity = eventSeverities[Math.floor(Math.random() * eventSeverities.length)];
    const category = eventCategories[Math.floor(Math.random() * eventCategories.length)];
    const site = allSites.find((s) => s.id === device.siteId);
    const estate = site ? allEstates.find((e) => e.id === site.estateId) : null;
    const user = allUsers[i % allUsers.length];

    const titles: Record<string, string> = {
      device_online: `${device.name} is online`, device_offline: `${device.name} went offline`,
      device_fault: `${device.name} reported a fault`, heartbeat: `Heartbeat received from ${device.name}`,
      telemetry: `Telemetry data from ${device.name}`, config_change: `Configuration changed on ${device.name}`,
      firmware_update: `Firmware updated on ${device.name}`, alert_triggered: `Alert triggered by ${device.name}`,
      alert_resolved: `Alert resolved for ${device.name}`, user_action: `User action on ${device.name}`,
      system: `System event for ${device.name}`, diagnostic: `Diagnostic run on ${device.name}`,
    };

    await db.insert(schema.events).values({
      id: uuidFrom(`event-${i}`),
      title: titles[category] ?? `${category} event`,
      description: `${severity} severity ${category} event for ${device.name}`,
      severity,
      category,
      deviceId: device.id,
      siteId: site?.id ?? null,
      estateId: estate?.id ?? null,
      userId: user.id,
      occurredAt: hoursAgo(i * 2),
    }).onConflictDoNothing();
  }

  const allEvents = await db.select().from(schema.events);
  console.log(`    → ${allEvents.length} events`);

  // ─── 9. Alerts ─────────────────────────────────────────────────────

  console.log("  Creating alerts...");

  const alertSeverities = ["critical", "warning", "info"] as const;
  const alertStatuses = ["open", "open", "open", "acknowledged", "resolved"] as const;
  const alertCategories = [
    "device_offline", "device_fault", "battery_low", "signal_weak",
    "temperature_high", "connection_lost", "firmware_outdated", "threshold_breach",
  ] as const;

  const alertDescriptions: Record<string, (d: typeof allDevices[0]) => string> = {
    device_offline: (d) => `${d.name} has been offline for over 10 minutes.`,
    device_fault: (d) => `${d.name} reported a hardware fault.`,
    battery_low: (d) => `${d.name} battery is critically low (${d.battery}%).`,
    signal_weak: (d) => `${d.name} signal strength is weak (${d.signalStrength} dBm).`,
    temperature_high: (d) => `${d.name} temperature is above threshold (${d.temperature}°C).`,
    connection_lost: (d) => `Connection lost to ${d.name}.`,
    firmware_outdated: (d) => `${d.name} firmware ${d.firmwareVersion} is outdated.`,
    threshold_breach: (d) => `${d.name} exceeded operational threshold.`,
  };

  for (let i = 0; i < 15; i++) {
    const device = allDevices[i % allDevices.length];
    const severity = alertSeverities[i % 3];
    const status = alertStatuses[i % 5];
    const category = alertCategories[i % alertCategories.length];
    const site = allSites.find((s) => s.id === device.siteId);
    const estate = site ? allEstates.find((e) => e.id === site.estateId) : null;

    const alertBase: Record<string, unknown> = {
      id: uuidFrom(`alert-${i}`),
      title: severity === "critical" ? `Critical: ${category}` : severity === "warning" ? `Warning: ${category}` : `Info: ${category}`,
      description: alertDescriptions[category]?.(device) ?? `${category} alert for ${device.name}`,
      severity,
      status,
      category,
      deviceId: device.id,
      siteId: site?.id ?? null,
      estateId: estate?.id ?? null,
      source: i % 3 === 0 ? "system" : "rule",
      occurredAt: hoursAgo(i * 3 + 1),
    };

    if (status === "acknowledged" || status === "resolved") {
      alertBase.acknowledgedBy = supportUser.id;
      alertBase.acknowledgedAt = hoursAgo(i * 3);
    }
    if (status === "resolved") {
      alertBase.resolvedBy = adminUser.id;
      alertBase.resolvedAt = hoursAgo(i * 3);
      alertBase.resolution = `Issue resolved: ${category} cleared after device reconnected.`;
    }

    await db.insert(schema.alerts).values(alertBase as any).onConflictDoNothing();
  }

  const allAlerts = await db.select().from(schema.alerts);
  console.log(`    → ${allAlerts.length} alerts`);

  // ─── 10. Audit Logs ────────────────────────────────────────────────

  console.log("  Creating audit logs...");

  const auditEntries = [
    { userId: adminUser.id, userName: adminUser.name, userRole: "admin", action: "login", resource: "session", description: "User logged in", ipAddress: "192.168.1.100" },
    { userId: adminUser.id, userName: adminUser.name, userRole: "admin", action: "update", resource: "settings", description: "Updated platform settings", ipAddress: "192.168.1.100" },
    { userId: supportUser.id, userName: supportUser.name, userRole: "support", action: "login", resource: "session", description: "User logged in", ipAddress: "192.168.1.101" },
    { userId: supportUser.id, userName: supportUser.name, userRole: "support", action: "update", resource: "alert", resourceId: allAlerts[0]?.id, description: `Acknowledged alert`, ipAddress: "192.168.1.101" },
    { userId: supportUser.id, userName: supportUser.name, userRole: "support", action: "update", resource: "device", resourceId: allDevices[0]?.id, description: `Updated device: ${allDevices[0]?.name}`, ipAddress: "192.168.1.101" },
    { userId: adminUser.id, userName: adminUser.name, userRole: "admin", action: "export", resource: "reports", description: "Exported fleet health report", ipAddress: "192.168.1.100" },
    { userId: adminUser.id, userName: adminUser.name, userRole: "admin", action: "create", resource: "user", resourceId: findUserByEmail("viewer")?.id, description: "Created user account", ipAddress: "192.168.1.100" },
    { userId: supportUser.id, userName: supportUser.name, userRole: "support", action: "diagnostic", resource: "device", resourceId: allDevices[3]?.id, description: `Ran diagnostics`, ipAddress: "192.168.1.101" },
  ];

  for (let i = 0; i < auditEntries.length; i++) {
    const entry = auditEntries[i];
    await db.insert(schema.auditLogs).values({
      id: uuidFrom(`audit-${i}`) as any,
      ...entry,
      createdAt: hoursAgo(Math.random() * 72),
    }).onConflictDoNothing();
  }

  const allLogs = await db.select().from(schema.auditLogs);
  console.log(`    → ${allLogs.length} audit log entries`);

  // ─── 11. Settings ──────────────────────────────────────────────────

  console.log("  Creating settings...");

  const settingDefs = [
    { key: "platform_name", value: "Sentience IoT Platform", category: "general", description: "Display name for the platform" },
    { key: "timezone", value: "UTC", category: "general", description: "Default timezone" },
    { key: "mfa_enabled", value: false, category: "security", description: "Require multi-factor authentication" },
    { key: "password_min_length", value: 8, category: "security", description: "Minimum password length" },
    { key: "session_timeout_minutes", value: 1440, category: "security", description: "Session timeout in minutes" },
    { key: "data_retention_days", value: 90, category: "maintenance", description: "Event and telemetry data retention period" },
    { key: "alert_cooldown_minutes", value: 5, category: "notifications", description: "Minimum time between repeated alerts" },
    { key: "maintenance_mode", value: false, category: "system", description: "Put platform in maintenance mode" },
    { key: "max_devices_per_site", value: 50, category: "limits", description: "Maximum devices per site" },
    { key: "csv_export_enabled", value: true, category: "features", description: "Enable CSV export functionality" },
  ];

  for (const s of settingDefs) {
    await db.insert(schema.settings).values(s).onConflictDoNothing({ target: schema.settings.key });
  }

  const allSettings = await db.select().from(schema.settings);
  console.log(`    → ${allSettings.length} settings`);

  // ─── 12. API Keys ──────────────────────────────────────────────────

  console.log("  Creating API keys...");

  const apiKeyValue = `sk-${crypto.randomBytes(24).toString("hex")}`;
  await db.insert(schema.apiKeys).values({
    id: uuidFrom("apikey-default"),
    name: "Default Development Key",
    keyHash: crypto.createHash("sha256").update(apiKeyValue).digest("hex"),
    maskedKey: `sk-${apiKeyValue.slice(3, 7)}...${apiKeyValue.slice(-4)}`,
    status: "active",
    createdBy: adminUser.id,
    expiresAt: new Date(Date.now() + 365 * 86400_000),
    requestCount: 0,
  }).onConflictDoNothing();

  const allKeys = await db.select().from(schema.apiKeys);
  console.log(`    → ${allKeys.length} API keys`);

  // ─── 13. Notification Rules ─────────────────────────────────────────

  console.log("  Creating notification rules...");

  const ruleDefs: (typeof schema.notificationRules.$inferInsert)[] = [
    {
      id: uuidFrom("rule-device_offline"),
      alertType: "device_offline",
      label: "Device Offline",
      description: "Alert when a device has been offline for more than 10 minutes.",
      severityThreshold: "critical",
      channels: ["email", "web", "push"],
      enabled: true,
      cooldownMinutes: 15,
      rolePreferences: { admin: true, support: true, installer: true, customer: true },
    },
    {
      id: uuidFrom("rule-device_fault"),
      alertType: "device_fault",
      label: "Device Fault",
      description: "Alert when a device reports a hardware or software fault.",
      severityThreshold: "critical",
      channels: ["email", "web", "push"],
      enabled: true,
      cooldownMinutes: 10,
      rolePreferences: { admin: true, support: true, installer: true, customer: false },
    },
    {
      id: uuidFrom("rule-battery_low"),
      alertType: "battery_low",
      label: "Low Battery",
      description: "Alert when a device battery level drops below 20%.",
      severityThreshold: "warning",
      channels: ["web", "email"],
      enabled: true,
      cooldownMinutes: 60,
      rolePreferences: { admin: true, support: true, installer: true, customer: true },
    },
    {
      id: uuidFrom("rule-signal_weak"),
      alertType: "signal_weak",
      label: "Weak Signal",
      description: "Alert when a device signal strength drops below -90 dBm.",
      severityThreshold: "warning",
      channels: ["web"],
      enabled: true,
      cooldownMinutes: 120,
      rolePreferences: { admin: true, support: true, installer: false, customer: false },
    },
    {
      id: uuidFrom("rule-temperature_high"),
      alertType: "temperature_high",
      label: "High Temperature",
      description: "Alert when a device temperature exceeds safe operating range.",
      severityThreshold: "warning",
      channels: ["web", "email"],
      enabled: true,
      cooldownMinutes: 30,
      rolePreferences: { admin: true, support: true, installer: false, customer: false },
    },
    {
      id: uuidFrom("rule-firmware_update"),
      alertType: "firmware_update",
      label: "Firmware Update Available",
      description: "Notify when a firmware update is available for a device.",
      severityThreshold: "info",
      channels: ["web"],
      enabled: true,
      cooldownMinutes: 1440,
      rolePreferences: { admin: true, support: true, installer: true, customer: false },
    },
    {
      id: uuidFrom("rule-diagnostic_failure"),
      alertType: "diagnostic_failure",
      label: "Diagnostic Failure",
      description: "Alert when a device diagnostic test fails.",
      severityThreshold: "warning" as const,
      channels: ["web", "email"] as any,
      enabled: true,
      cooldownMinutes: 30,
      rolePreferences: { admin: true, support: true, installer: true, customer: false },
    },
  ];

  for (const rule of ruleDefs) {
    await db.insert(schema.notificationRules).values(rule).onConflictDoNothing({ target: schema.notificationRules.alertType });
  }

  const allRules = await db.select().from(schema.notificationRules);
  console.log(`    → ${allRules.length} notification rules`);

  // ─── 14. Notifications ──────────────────────────────────────────────

  console.log("  Creating notifications...");

  const customerUser = allUsers.find((u) => u.email.startsWith("customer"))!;

  const notificationDefs: {
    userId: string;
    title: string;
    message: string;
    priority: "low" | "normal" | "high" | "critical";
    category: "alert" | "device" | "system" | "report" | "user" | "maintenance";
    link?: string;
  }[] = [
    { userId: adminUser.id, title: "Welcome to Sentience IoT", message: "Your platform is ready. Start by adding devices to your first site.", priority: "normal", category: "system" },
    { userId: adminUser.id, title: "Maintenance Reminder", message: "3 devices are due for scheduled maintenance this week.", priority: "normal", category: "maintenance", link: "/devices" },
    { userId: adminUser.id, title: "Firmware Update Available", message: "A new firmware version (4.2.0) is available for 5 devices.", priority: "high", category: "device", link: "/devices" },
    { userId: adminUser.id, title: "Report Ready", message: "Your weekly fleet health report has been generated.", priority: "low", category: "report", link: "/reports" },
    { userId: adminUser.id, title: "Alert: Device Offline", message: "Zone Sensor A at Riverside Complex has been offline for 15 minutes.", priority: "critical", category: "alert", link: "/alerts" },
    { userId: supportUser.id, title: "Welcome to Sentience IoT", message: "Your support account is ready. You can view and manage devices.", priority: "normal", category: "system" },
    { userId: supportUser.id, title: "Alert: Device Offline", message: "Zone Sensor A at Riverside Complex has been offline for 15 minutes.", priority: "critical", category: "alert", link: "/alerts" },
    { userId: supportUser.id, title: "Maintenance Reminder", message: "2 devices at Tech Valley Park are due for maintenance.", priority: "normal", category: "maintenance", link: "/devices" },
    { userId: supportUser.id, title: "Report Ready", message: "Your weekly fleet health report has been generated.", priority: "low", category: "report", link: "/reports" },
    { userId: customerUser.id, title: "Welcome to Sentience IoT", message: "Your account is ready. View your estate dashboard to monitor devices.", priority: "normal", category: "system" },
    { userId: customerUser.id, title: "Alert: Battery Low", message: "A device at Riverside Complex has critically low battery.", priority: "high", category: "alert", link: "/alerts" },
  ];

  for (let i = 0; i < notificationDefs.length; i++) {
    const n = notificationDefs[i];

    await db.insert(schema.notifications).values({
      id: uuidFrom(`notification-${i}`),
      userId: n.userId,
      title: n.title,
      message: n.message,
      priority: n.priority,
      category: n.category,
      isRead: i < 3, // First 3 are read
      link: n.link ?? null,
      createdAt: hoursAgo(i * 12 + 1),
    }).onConflictDoNothing();
  }

  const allNotifications = await db.select().from(schema.notifications);
  console.log(`    → ${allNotifications.length} notifications`);

  // ─── Summary ───────────────────────────────────────────────────────

  console.log("\n✅ Seed complete!");
  console.log(`    Roles:      ${allRoles.length}`);
  console.log(`    Customers:  ${allCustomers.length}`);
  console.log(`    Estates:    ${allEstates.length}`);
  console.log(`    Sites:      ${allSites.length}`);
  console.log(`    Devices:    ${allDevices.length}`);
  console.log(`    Events:     ${allEvents.length}`);
  console.log(`    Alerts:     ${allAlerts.length}`);
  console.log(`    Audit logs: ${allLogs.length}`);
  console.log(`    Settings:   ${allSettings.length}`);
  console.log(`    API keys:           ${allKeys.length}`);
  console.log(`    Notification rules: ${allRules.length}`);
  console.log(`    Notifications:      ${allNotifications.length}`);
  console.log(`\n  Demo accounts:`);
  console.log(`    admin@sentience.io / admin123`);
  console.log(`    support@sentience.io / support123`);
  console.log(`    installer@sentience.io / installer123`);
  console.log(`    customer@sentience.io / customer123`);
  console.log(`    viewer@sentience.io / viewer123`);
}

import { eq } from "drizzle-orm";

seed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(() => pool.end());
