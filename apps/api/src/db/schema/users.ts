import { pgTable, uuid, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { roles } from "./roles";
import { customers } from "./customers";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name").notNull(),
    avatar: text("avatar"),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id),
    isActive: boolean("is_active").notNull().default(true),
    mfaEnabled: boolean("mfa_enabled").notNull().default(false),
    mfaSecret: text("mfa_secret"),
    notificationPreferences: jsonb("notification_preferences").notNull().default({}),
    customerId: uuid("customer_id").references(() => customers.id),
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    roleIdx: index("users_role_idx").on(table.roleId),
  }),
);
