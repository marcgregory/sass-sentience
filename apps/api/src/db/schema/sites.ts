import { pgTable, uuid, text, integer, doublePrecision, timestamp, index } from "drizzle-orm/pg-core";
import { estates } from "./estates";

export const sites = pgTable(
  "sites",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull().unique(),
    estateId: uuid("estate_id")
      .notNull()
      .references(() => estates.id),
    address: text("address").notNull(),
    buildingCount: integer("building_count").notNull().default(1),
    floorCount: integer("floor_count").notNull().default(1),
    roomCount: integer("room_count").notNull().default(1),
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
    estateIdx: index("sites_estate_idx").on(table.estateId),
    nameIdx: index("sites_name_idx").on(table.name),
  }),
);
