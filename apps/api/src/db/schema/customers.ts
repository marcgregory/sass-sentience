import { pgTable, uuid, text, boolean, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    logo: text("logo"),
    domain: text("domain"),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone").notNull(),
    address: text("address").notNull(),
    city: text("city").notNull(),
    country: text("country").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    licenseType: text("license_type", { enum: ["basic", "professional", "enterprise"] }).notNull().default("professional"),
    maxDevices: integer("max_devices").notNull().default(100),
    maxUsers: integer("max_users").notNull().default(10),
    deviceCount: integer("device_count").notNull().default(0),
    userCount: integer("user_count").notNull().default(0),
    estateCount: integer("estate_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("customers_name_idx").on(table.name),
  }),
);
