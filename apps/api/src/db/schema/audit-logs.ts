import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    userName: text("user_name").notNull(),
    userRole: text("user_role").notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: text("resource_id"),
    description: text("description").notNull(),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("audit_user_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    resourceIdx: index("audit_resource_idx").on(table.resource),
    createdIdx: index("audit_created_idx").on(table.createdAt),
  }),
);
