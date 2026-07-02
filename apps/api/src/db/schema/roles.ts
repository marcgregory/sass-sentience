import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  description: text("description").notNull(),
});
