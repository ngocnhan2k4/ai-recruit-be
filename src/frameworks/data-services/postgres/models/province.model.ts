import { uuid, pgTable, varchar } from "drizzle-orm/pg-core";

export const provinces = pgTable("provinces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).unique().notNull(),
});
