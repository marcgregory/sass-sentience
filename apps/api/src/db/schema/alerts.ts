import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { devices } from "./devices";
import { sites } from "./sites";
import { estates } from "./estates";
import { customers } from "./customers";
import { users } from "./users";

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity", { enum: ["critical", "warning", "info"] }).notNull(),
    status: text("status", { enum: ["open", "acknowledged", "resolved"] }).notNull().default("open"),
    category: text("category").notNull(),
    deviceId: uuid("device_id").references(() => devices.id),
    siteId: uuid("site_id").references(() => sites.id),
    estateId: uuid("estate_id").references(() => estates.id),
    customerId: uuid("customer_id").references(() => customers.id),
    assignedTo: uuid("assigned_to").references(() => users.id),
    acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    resolvedBy: uuid("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolution: text("resolution"),
    source: text("source", { enum: ["system", "rule", "manual"] }).notNull().default("system"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    severityIdx: index("alerts_severity_idx").on(table.severity),
    statusIdx: index("alerts_status_idx").on(table.status),
    deviceIdx: index("alerts_device_idx").on(table.deviceId),
    estateIdx: index("alerts_estate_idx").on(table.estateId),
    occurredIdx: index("alerts_occurred_idx").on(table.occurredAt),
  }),
);
