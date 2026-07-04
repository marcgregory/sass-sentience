import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    message: text("message").notNull(),
    priority: text("priority", {
      enum: ["low", "normal", "high", "critical"],
    })
      .notNull()
      .default("normal"),
    category: text("category", {
      enum: ["alert", "device", "system", "report", "user", "maintenance"],
    })
      .notNull()
      .default("system"),
    isRead: boolean("is_read").notNull().default(false),
    link: text("link"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
    userReadIdx: index("notifications_user_read_idx").on(
      table.userId,
      table.isRead,
    ),
  }),
);
