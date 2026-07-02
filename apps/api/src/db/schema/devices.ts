import { pgTable, uuid, text, boolean, integer, doublePrecision, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { sites } from "./sites";

export const devices = pgTable(
  "devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    serialNumber: text("serial_number").notNull().unique(),
    macAddress: text("mac_address").notNull(),
    name: text("name").notNull(),
    type: text("type", { enum: ["controller", "sensor", "gateway", "relay", "camera"] }).notNull(),
    status: text("status", { enum: ["online", "offline", "fault", "warning"] }).notNull().default("online"),
    // Firmware
    firmwareVersion: text("firmware_version"),
    firmwareBuild: text("firmware_build"),
    firmwareReleasedAt: timestamp("firmware_released_at", { withTimezone: true }),
    firmwareInstalledAt: timestamp("firmware_installed_at", { withTimezone: true }),
    // Telemetry
    battery: doublePrecision("battery"),
    voltage: doublePrecision("voltage"),
    temperature: doublePrecision("temperature"),
    signalStrength: doublePrecision("signal_strength"),
    uptime: integer("uptime"),
    lastHeartbeat: timestamp("last_heartbeat", { withTimezone: true }),
    // Relations
    siteId: uuid("site_id")
      .notNull()
      .references(() => sites.id),
    roomId: text("room_id"),
    // Metadata
    installedAt: timestamp("installed_at", { withTimezone: true }).notNull().defaultNow(),
    lastMaintenance: timestamp("last_maintenance", { withTimezone: true }),
    notes: text("notes"),
    tags: jsonb("tags").notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    serialIdx: index("devices_serial_idx").on(table.serialNumber),
    siteIdx: index("devices_site_idx").on(table.siteId),
    statusIdx: index("devices_status_idx").on(table.status),
    typeIdx: index("devices_type_idx").on(table.type),
  }),
);
