import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { organizations } from "./organization.model";

export const universities = pgTable("universities", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
});
