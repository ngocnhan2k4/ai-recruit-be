import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  age: integer("age"),
  firebaseUid: varchar("firebase_uid", { length: 255 }).notNull().unique(),
  roles: varchar("roles", { length: 255 }).array().notNull(),
  createdAt: varchar("created_at", { length: 255 }).notNull(),
  updatedAt: varchar("updated_at", { length: 255 }).notNull(),
  avatar: varchar("avatar", { length: 255 }),
});
