import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  ...timestamps,
});
