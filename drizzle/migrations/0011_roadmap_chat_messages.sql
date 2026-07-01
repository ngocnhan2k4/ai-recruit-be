CREATE TABLE "roadmap_chat_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "roadmap_id" uuid NOT NULL REFERENCES "learning_roadmaps"("id") ON DELETE CASCADE,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "role" varchar(16) NOT NULL,
  "text" text NOT NULL,
  "intent" varchar(64),
  "proposal" jsonb,
  "proposal_status" varchar(16),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "deleted_at" timestamp
);

CREATE INDEX "idx_chat_messages_roadmap_user" ON "roadmap_chat_messages" ("roadmap_id", "user_id", "created_at");
