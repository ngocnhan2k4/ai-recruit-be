import {
  pgTable,
  serial,
  timestamp,
  varchar,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";

import { users } from "./user.model";

export const refreshTokens = pgTable("refresh_tokens", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  token: varchar("token").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revoked: boolean("revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
