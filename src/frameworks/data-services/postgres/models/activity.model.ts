import { pgTable, uuid, varchar, jsonb, index } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { organizations } from "./organization.model";
import { ObjectTypeEnum } from "./enums";

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
    action: varchar("action", { length: 255 }).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    targetId: varchar("target_id", { length: 64 }),
    targetType: ObjectTypeEnum("target_type").notNull(),
    visibility: varchar("visibility", { length: 32 })
      .notNull()
      .default("admin_only"),
    ...timestamps,
  },
  (table) => [
    index("idx_activity_entity").on(table.targetType, table.targetId),
    index("idx_activity_actor").on(table.createdBy),
    index("idx_activity_org").on(table.organizationId),
    index("idx_activity_visibility").on(table.visibility),
    index("idx_activity_created_at").on(table.createdAt),
  ],
);
