import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

export const notificationRules = pgTable("notification_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  alertType: text("alert_type", {
    enum: [
      "device_offline",
      "device_fault",
      "battery_low",
      "signal_weak",
      "temperature_high",
      "firmware_update",
      "diagnostic_failure",
    ],
  })
    .notNull()
    .unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
  severityThreshold: text("severity_threshold", {
    enum: ["critical", "warning", "info"],
  })
    .notNull()
    .default("warning"),
  channels: text("channels", { enum: ["email", "web", "push", "sms"] })
    .array()
    .notNull()
    .default(["web"]),
  enabled: boolean("enabled").notNull().default(true),
  cooldownMinutes: integer("cooldown_minutes").notNull().default(5),
  rolePreferences: jsonb("role_preferences").notNull().default({
    admin: true,
    support: true,
    installer: false,
    customer: false,
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
