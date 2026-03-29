import { pgTable, uuid, varchar, unique } from "drizzle-orm/pg-core";

export const skillsSynonyms = pgTable(
  "skills_synonyms",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    source: varchar("source", { length: 50 })
      .notNull()
      .default("stackoverflow"),
    aliasName: varchar("alias_name", { length: 255 }).notNull(),
    masterName: varchar("master_name", { length: 255 }).notNull(),
  },
  (table) => {
    return {
      // Ensure that the same alias name cannot be duplicated for the same source
      uniqueAliasSource: unique("unique_alias_source_idx").on(
        table.aliasName,
        table.source,
      ),
    };
  },
);
