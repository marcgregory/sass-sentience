import { pgTable, uuid, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    keyHash: text("key_hash").notNull(),
    maskedKey: text("masked_key").notNull(),
    status: text("status", { enum: ["active", "expired", "revoked"] }).notNull().default("active"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    requestCount: integer("request_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("apikeys_status_idx").on(table.status),
    createdByIdx: index("apikeys_created_idx").on(table.createdBy),
  }),
);
