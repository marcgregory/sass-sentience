import { pgTable, uuid, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type", { enum: ["daily", "weekly", "monthly", "custom", "adhoc"] }).notNull(),
    status: text("status", { enum: ["generating", "ready", "failed"] }).notNull().default("generating"),
    format: text("format", { enum: ["csv", "pdf"] }).notNull().default("csv"),
    dateRangeStart: timestamp("date_range_start", { withTimezone: true }).notNull(),
    dateRangeEnd: timestamp("date_range_end", { withTimezone: true }).notNull(),
    filters: jsonb("filters"),
    metrics: jsonb("metrics"),
    generatedBy: uuid("generated_by")
      .notNull()
      .references(() => users.id),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
    fileUrl: text("file_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    generatedByIdx: index("reports_generated_idx").on(table.generatedBy),
    createdIdx: index("reports_created_idx").on(table.createdAt),
  }),
);
