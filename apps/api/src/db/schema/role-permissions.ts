import { pgTable, uuid, text, jsonb, index } from "drizzle-orm/pg-core";
import { roles } from "./roles";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roleId: uuid("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    resource: text("resource").notNull(),
    action: text("action").notNull(),
    conditions: jsonb("conditions"),
  },
  (table) => ({
    roleResourceIdx: index("rp_role_resource_idx").on(table.roleId, table.resource),
  }),
);
