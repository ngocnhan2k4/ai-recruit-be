import { pgTable, uuid, varchar, unique } from "drizzle-orm/pg-core";
import { skills } from "./skill.model";

export const skillsSynonyms = pgTable(
  "skills_synonyms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    masterSkillId: uuid("master_skill_id")
      .notNull()
      .references(() => skills.id, { onDelete: "cascade" }),
    aliasName: varchar("alias_name", { length: 255 }).notNull(),
  },
  (table) => [
    unique("unique_alias_source_idx").on(table.masterSkillId, table.aliasName),
  ],
);
