import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { organizations } from "./organization.model";
import { users } from "./user.model";
import { timestamps } from "./helpers";

export const jobCopilotConversations = pgTable(
  "job_copilot_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    status: varchar("status", { length: 30 }).notNull().default("collecting"),
    briefData: jsonb("brief_data").notNull().default({}),
    workspaceState: jsonb("workspace_state").notNull().default({}),
    version: integer("version").notNull().default(1),
    processingRequestId: uuid("processing_request_id"),
    ...timestamps,
  },
  (table) => [
    index("idx_job_copilot_conversations_owner").on(
      table.organizationId,
      table.createdBy,
      table.updatedAt,
    ),
  ],
);

export const jobCopilotMessages = pgTable(
  "job_copilot_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => jobCopilotConversations.id),
    role: varchar("role", { length: 20 }).notNull(),
    messageType: varchar("message_type", { length: 30 })
      .notNull()
      .default("text"),
    content: text("content").notNull(),
    metadata: jsonb("metadata").notNull().default({}),
    clientMessageId: uuid("client_message_id"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uniq_job_copilot_message_client").on(
      table.conversationId,
      table.clientMessageId,
    ),
    index("idx_job_copilot_messages_conversation").on(
      table.conversationId,
      table.createdAt,
    ),
  ],
);
