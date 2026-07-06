import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { devices } from "./devices";

/**
 * Diagnostic test definitions.
 *
 * Each row declares a test that can be run against compatible device types.
 * The UI reads this table to dynamically render test cards — no frontend
 * changes needed when adding new tests.
 */
export const diagnosticTests = pgTable(
  "diagnostic_tests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    type: text("type", {
      enum: [
        "ping",
        "connection",
        "mqtt",
        "signal",
        "battery",
        "firmware",
        "cellular",
        "gps",
        "stream",
        "lens",
        "sd_card",
        "relay_coil",
      ],
    }).notNull(),
    description: text("description").notNull(),
    /** JSON array of device type strings this test supports. */
    supportedDeviceTypes: jsonb("supported_device_types").notNull().default([]),
    /** Max execution time in seconds. */
    timeout: integer("timeout").notNull().default(30),
    /**
     * JSON Schema describing the shape of the result details object.
     * Used for future validation; stored as a JSON object.
     */
    resultSchema: jsonb("result_schema").notNull().default({}),
    enabled: boolean("enabled").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    typeIdx: index("diag_tests_type_idx").on(table.type),
    enabledIdx: index("diag_tests_enabled_idx").on(table.enabled),
    nameIdx: uniqueIndex("diag_tests_name_idx").on(table.name),
  }),
);

/**
 * Results of diagnostic test runs.
 *
 * Each row represents one invocation of a test against a device.
 * The history is queryable by device, test, or status.
 */
export const diagnosticResults = pgTable(
  "diagnostic_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    testId: uuid("test_id")
      .notNull()
      .references(() => diagnosticTests.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id),
    status: text("status", {
      enum: ["passed", "failed", "warning"],
    }).notNull(),
    /** Human-readable summary message. */
    message: text("message").notNull(),
    /** Structured result payload matching the test's resultSchema. */
    details: jsonb("details"),
    /** User UUID who triggered the run. */
    ranBy: uuid("ran_by").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull(),
    /** Wall-clock execution time in milliseconds. */
    durationMs: integer("duration_ms").notNull(),
  },
  (table) => ({
    deviceIdx: index("diag_results_device_idx").on(table.deviceId),
    testIdx: index("diag_results_test_idx").on(table.testId),
    statusIdx: index("diag_results_status_idx").on(table.status),
    startedAtIdx: index("diag_results_started_at_idx").on(table.startedAt),
  }),
);
