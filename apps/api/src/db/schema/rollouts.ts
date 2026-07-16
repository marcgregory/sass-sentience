import { pgTable, uuid, text, integer, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { deviceGroups } from "./device-groups";
import { users } from "./users";
import { devices } from "./devices";

// ─── Firmware Packages ───────────────────────────────────────────────────────

export const firmwarePackages = pgTable(
  "firmware_packages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    version: text("version").notNull(),
    deviceType: text("device_type").array().notNull().default([]),
    releaseNotes: text("release_notes"),
    fileHash: text("file_hash"),
    fileSize: integer("file_size"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("firmware_packages_name_idx").on(table.name),
    versionIdx: index("firmware_packages_version_idx").on(table.version),
  }),
);

// ─── Rollouts (generic job orchestration) ────────────────────────────────────
//
// Designed with a polymorphic job_type discriminator so Diagnostics (Sprint 12)
// and Automation (Sprint 14) can reuse this infrastructure with different
// execution payloads. Today: job_type = 'firmware'. Tomorrow: 'diagnostics',
// 'automation'.

export const rollouts = pgTable(
  "rollouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobType: text("job_type").notNull().default("firmware"),
    name: text("name").notNull(),
    firmwarePackageId: uuid("firmware_package_id").references(() => firmwarePackages.id),
    jobConfig: jsonb("job_config"),
    targetGroupId: uuid("target_group_id")
      .notNull()
      .references(() => deviceGroups.id),
    status: text("status", { enum: ["draft", "running", "completed", "failed", "cancelled"] })
      .notNull()
      .default("draft"),
    deviceCount: integer("device_count").notNull().default(0),
    completedCount: integer("completed_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    statusIdx: index("rollouts_status_idx").on(table.status),
    jobTypeIdx: index("rollouts_job_type_idx").on(table.jobType),
    targetGroupIdx: index("rollouts_target_group_idx").on(table.targetGroupId),
    createdIdx: index("rollouts_created_idx").on(table.createdAt),
  }),
);

// ─── Rollout Devices (generic execution step tracking) ───────────────────────

export const rolloutDevices = pgTable(
  "rollout_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    rolloutId: uuid("rollout_id")
      .notNull()
      .references(() => rollouts.id),
    deviceId: uuid("device_id")
      .notNull()
      .references(() => devices.id),
    status: text("status", { enum: ["pending", "running", "succeeded", "failed", "skipped", "cancelled"] })
      .notNull()
      .default("pending"),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    rolloutIdx: index("rollout_devices_rollout_idx").on(table.rolloutId),
    deviceIdx: index("rollout_devices_device_idx").on(table.deviceId),
    statusIdx: index("rollout_devices_status_idx").on(table.status),
  }),
);
