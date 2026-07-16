import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const deviceGroups = pgTable(
  "device_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    deviceIds: uuid("device_ids").array().notNull().default([]),
    deviceCount: integer("device_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("device_groups_name_idx").on(table.name),
  }),
);
