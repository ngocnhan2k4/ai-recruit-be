import { pgTable, serial, varchar, jsonb } from "drizzle-orm/pg-core";

export const casbin = pgTable("casbin", {
  id: serial("id").primaryKey(),
  ptype: varchar("ptype", { length: 100 }),
  rule: jsonb("rule"),
});
