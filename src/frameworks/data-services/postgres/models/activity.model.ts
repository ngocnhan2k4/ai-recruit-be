import { pgTable, uuid, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { ObjectTypeEnum } from "./enums";
import { organizations } from "./organization.model";

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "cascade",
    }),

    // Activity Details
    action: varchar("action", { length: 255 }).notNull(),
    metadata: jsonb("metadata"),

    targetId: varchar("target_id", { length: 32 }),
    targetType: ObjectTypeEnum("target_type"),

    ...timestamps,
  },
  (table) => [
    index("idx_activity_entity").on(table.targetType, table.targetId),
    index("idx_activity_actor").on(table.createdBy),
    index("idx_activity_created_at").on(table.createdAt),
  ],
);
