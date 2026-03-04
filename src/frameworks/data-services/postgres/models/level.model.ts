import { pgTable, uuid, varchar, integer } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { areas } from "./area.model";

export const levels = pgTable("levels", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaId: uuid("area_id")
    .notNull()
    .references(() => areas.id, { onDelete: "cascade" }),
  levelName: varchar("level_name", { length: 100 }).notNull(),
  minScore: integer("min_score").notNull(),
  maxScore: integer("max_score").notNull(),
  ...timestamps,
});
