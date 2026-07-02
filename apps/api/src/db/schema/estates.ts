import { pgTable, uuid, text, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { customers } from "./customers";

export const estates = pgTable(
  "estates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    region: text("region").notNull(),
    country: text("country").notNull(),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    managerId: uuid("manager_id").references(() => users.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),
    siteCount: integer("site_count").notNull().default(0),
    deviceCount: integer("device_count").notNull().default(0),
    onlineCount: integer("online_count").notNull().default(0),
    offlineCount: integer("offline_count").notNull().default(0),
    faultCount: integer("fault_count").notNull().default(0),
    warningCount: integer("warning_count").notNull().default(0),
    healthScore: doublePrecision("health_score").notNull().default(100),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("estates_name_idx").on(table.name),
    customerIdx: index("estates_customer_idx").on(table.customerId),
  }),
);
