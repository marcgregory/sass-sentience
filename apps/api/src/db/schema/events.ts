import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { devices } from "./devices";
import { sites } from "./sites";
import { estates } from "./estates";
import { customers } from "./customers";
import { users } from "./users";

export const events = pgTable(
  "events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    severity: text("severity", { enum: ["info", "warning", "error", "critical"] }).notNull(),
    category: text("category").notNull(),
    deviceId: uuid("device_id").references(() => devices.id),
    siteId: uuid("site_id").references(() => sites.id),
    estateId: uuid("estate_id").references(() => estates.id),
    customerId: uuid("customer_id").references(() => customers.id),
    userId: uuid("user_id").references(() => users.id),
    metadata: jsonb("metadata"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    severityIdx: index("events_severity_idx").on(table.severity),
    categoryIdx: index("events_category_idx").on(table.category),
    deviceIdx: index("events_device_idx").on(table.deviceId),
    occurredIdx: index("events_occurred_idx").on(table.occurredAt),
    estateIdx: index("events_estate_idx").on(table.estateId),
    estateOccurredIdx: index("events_estate_occurred_idx").on(table.estateId, table.occurredAt),
  }),
);
