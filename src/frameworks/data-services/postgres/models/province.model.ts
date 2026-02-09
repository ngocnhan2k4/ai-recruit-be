import { uuid, pgTable, varchar, boolean } from "drizzle-orm/pg-core";

export const provinces = pgTable("provinces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isNew: boolean("is_new").notNull().default(false),
});
