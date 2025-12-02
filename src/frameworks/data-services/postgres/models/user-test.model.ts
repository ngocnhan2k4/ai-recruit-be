import {
  pgTable,
  uuid,
  jsonb,
  integer,
  varchar,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { areas } from "./area.model";

export const userTests = pgTable("user_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  selectedSkillIds: jsonb("selected_skill_ids").$type<string[]>().notNull(),
  areaId: uuid("area_id")
    .notNull()
    .references(() => areas.id, { onDelete: "cascade" }),
  totalScore: integer("total_score"),
  levelAssessed: varchar("level_assessed", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
