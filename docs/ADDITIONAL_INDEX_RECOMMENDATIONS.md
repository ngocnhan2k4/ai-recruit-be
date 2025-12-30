# Additional Index Recommendations — Add / Remove

Date: 2025-12-30
Repository: ai-recruit-be
Branch: phat/fix

This document lists additional index suggestions (what to add) and index candidates to remove (what to drop) discovered during codebase review. Each suggestion includes: reason, expected priority/impact, and suggested Drizzle or raw SQL syntax.

---

## Summary (short)

Add (recommended now):

- `user_answers`: index on `user_test_id` (+ optional on `question_id`) — CRITICAL
- `user_tests`: composite index `(user_id, created_at DESC)` — HIGH
- `questions`: composite `(skill_id, is_active)` — HIGH; optional trigram index on `question_text` — MEDIUM
- `refresh_tokens`: unique index on `token` (and index on `user_id`) — CRITICAL
- `user_notifications`: several indexes (receiver/deleted/org/notification) — CRITICAL/HIGH
- `notifications`: expression index on `(payload->>'orgId')::uuid` (if payload lookups frequent) — MEDIUM
- `skills`: optional trigram index on `lower(name)` if ILIKE searches are heavy — MEDIUM

Remove (drop) candidates:

- No immediate unsafe drops detected in current models except duplicates you may still have from previous commits. The only well-justified drop is `idx_roadmap_phases_roadmap_id` when the composite `idx_roadmap_phases_roadmap_deleted_order` exists (composite covers single-column usage). Drop only after verifying it's present in your DB.

---

## Detailed recommendations — Add

Note: for Drizzle-level indexes use `index()` and `uniqueIndex()` in model files. For expression or trigram indexes create raw SQL migration since Drizzle's pg-core does not have direct helpers for expression / gin_trgm ops.

1. Table: `user_answers` (file: `src/frameworks/data-services/postgres/models/user-answer.model.ts`)

Why

- `UserAnswerRepository.getTestAnswers` and `upsertAnswers` both query WHERE `user_test_id = ?` frequently. Add index to avoid sequential scans on many answers.

What to add (Drizzle)

```typescript
// in user-answer.model.ts imports add: index
import { index } from "drizzle-orm/pg-core";

// in pgTable definition callback
index("idx_user_answers_user_test").on(table.userTestId),
index("idx_user_answers_question").on(table.questionId), // optional
```

Priority: CRITICAL — directly affects exam flows.

Estimated size: small (per-row small index)

2. Table: `user_tests` (file: `src/frameworks/data-services/postgres/models/user-test.model.ts`)

Why

- `UserTestRepository.getUserTests(userId)` uses WHERE user_id = ? ORDER BY created_at DESC. Composite index speeds that common pattern.

What to add (Drizzle)

```typescript
// in user-test.model.ts imports add: index, sql
import { index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// in pgTable callback (or after table def if pattern used in your repo files)
index("idx_user_tests_user_created").on(userTests.userId, sql`${userTests.createdAt} DESC`),
```

Priority: HIGH

3. Table: `questions` (file: `src/frameworks/data-services/postgres/models/question.model.ts`)

Why

- Queries filter by `skill_id` and `is_active` simultaneously in `getActiveQuestionsBySkills`. A composite (skill_id, is_active) supports that WHERE quickly.
- Repeated ILIKE keyword searches on `question_text` may benefit from pg_trgm trigram index if slow.

What to add (Drizzle + optional raw SQL)

Drizzle composite:

```typescript
import { index } from "drizzle-orm/pg-core";

index("idx_questions_skill_active").on(questions.skillId, questions.isActive),
```

Optional trigram (raw SQL migration, requires `pg_trgm` extension enabled):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_questions_question_text_trgm
  ON questions USING gin (lower(question_text) gin_trgm_ops);
```

Priority: HIGH (composite), MEDIUM (trigram). Add trigram only after profiling ILIKE slowness.

4. Table: `refresh_tokens` (file: `src/frameworks/data-services/postgres/models/refresh-token.model.ts`)

Why

- `AuthRepository.findValidToken` queries by token and checks `revoked=false` and `expires_at > now()`. A fast lookup by token is required to validate and revoke tokens.

What to add (Drizzle)

```typescript
import { uniqueIndex, index } from "drizzle-orm/pg-core";

uniqueIndex("idx_refresh_tokens_token").on(refreshTokens.token),
index("idx_refresh_tokens_user").on(refreshTokens.userId),
```

Priority: CRITICAL

Note: `unique` enforces token uniqueness — verify if token is expected unique (seems so).

5. Table: `user_notifications` / `notifications` (file: `src/frameworks/data-services/postgres/models/notification.model.ts`)

Why

- `NotificationRepository.getNotificationsByUser` filters by `receiver_id` and `deleted_at IS NULL`, optionally `organization_id`, and joins on `notification_id` to `notifications`. Unread counts filter `read_at IS NULL` + `deleted_at IS NULL`.
- `NotificationRepository.deleteInvitationNotifications` does subquery where payload->>'orgId' and payload->>'userId'. Those payload JSONB expressions are slow without an expression index.

What to add (Drizzle + raw SQL)

In `userNotifications` Drizzle additions:

```typescript
import { index } from "drizzle-orm/pg-core";

index("idx_user_notifications_receiver_deleted").on(userNotifications.receiverId, userNotifications.deletedAt),
index("idx_user_notifications_receiver_org_deleted").on(userNotifications.receiverId, userNotifications.organizationId, userNotifications.deletedAt),
index("idx_user_notifications_notification").on(userNotifications.notificationId),
```

For `notifications.payload` expression index (raw SQL migration):

```sql
-- if you query payload->>'orgId' frequently
CREATE INDEX idx_notifications_payload_org_id
  ON notifications (((payload ->> 'orgId')::uuid));

-- if you query payload->>'userId' frequently
CREATE INDEX idx_notifications_payload_user_id
  ON notifications (((payload ->> 'userId')::uuid));
```

Priority: CRITICAL (userNotifications), MEDIUM (payload expression indexes)

Notes: `idx_user_notifications_receiver_deleted` lets queries like
`WHERE receiver_id = $1 AND deleted_at IS NULL` use index-only or index scans.

6. Table: `skills` (file: `src/frameworks/data-services/postgres/models/skill.model.ts`)

Why

- Skill searches (SkillRepository) use `ilike(skills.name, '%keyword%')`. For heavy search load, trigram GIN index helps.

Optional (raw SQL):

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_skills_name_trgm ON skills USING gin (lower(name) gin_trgm_ops);
```

Priority: MEDIUM — create only if profiled slow.

## Detailed recommendations — Remove (drop)

Important: Dropping an index should be done conservatively. Only drop if you confirm the index is redundant (covered by a composite index with the same leading column) or unused.

Safe-to-drop candidate(s):

1. `idx_roadmap_phases_roadmap_id` (if present in DB)

- Why to drop: The composite index `idx_roadmap_phases_roadmap_deleted_order` covers queries that filter by `roadmap_id` (because `roadmap_id` is the leading column there). A single-column index on `roadmap_id` is redundant and wastes space.
- How to drop (SQL):

```sql
DROP INDEX IF EXISTS idx_roadmap_phases_roadmap_id;
```

- Pre-check: run `SELECT * FROM pg_indexes WHERE indexname = 'idx_roadmap_phases_roadmap_id';` and `EXPLAIN ANALYZE` on representative queries.

Other candidates: none strongly recommended for removal automatically. For every index you consider dropping, follow this checklist:

- Confirm a composite index exists whose leading column is the same and can serve the queries.
- Run EXPLAIN (ANALYZE, BUFFERS) on production-like data to ensure query plan uses remaining index.
- Check `pg_stat_user_indexes` to see usage stats. If an index has near-zero usage and non-trivial size, consider dropping after review.

## Migration notes / how to apply safely

1. Implement Drizzle model changes for non-expression indexes (use `index()` / `uniqueIndex()` in model files). Then run your Drizzle migration generation (`npm run db:generate` or project-specific command) to produce migration SQL.

2. For expression/trigram indexes, add raw SQL migrations. Example migration block (Drizzle raw SQL migration file):

```sql
-- up
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_questions_question_text_trgm
  ON questions USING gin (lower(question_text) gin_trgm_ops);

-- down
DROP INDEX CONCURRENTLY IF EXISTS idx_questions_question_text_trgm;
```

Use `CONCURRENTLY` for production deployments to avoid table locks. (Note: some migration frameworks require special handling for CONCURRENTLY in transactionless migrations.)

3. Order of operations for safe rollout

- Add new indexes first (CONCURRENTLY) in staging/production. Wait until index creation completes and verify query improvements.
- Then consider dropping redundant indexes (also CONCURRENTLY).

## Quick checklist to implement

- [ ] Add Drizzle `index()` entries for `user_answers`, `user_tests`, `questions` composite, `refresh_tokens` (unique), `user_notifications`.
- [ ] Create raw SQL migrations for `notifications.payload` expression indexes and optional pg_trgm trigram indexes (skills.name, questions.question_text).
- [ ] Generate and review migration SQL (`npm run db:generate`) and ensure CONCURRENTLY used for production.
- [ ] Apply to staging; run `EXPLAIN ANALYZE` on representative queries.
- [ ] If safe, drop redundant indexes (e.g., `idx_roadmap_phases_roadmap_id`) using `DROP INDEX CONCURRENTLY`.

## Examples (Drizzle snippets)

Add to `user-answer.model.ts`:

```typescript
import { index } from "drizzle-orm/pg-core";

// inside pgTable callback:
index("idx_user_answers_user_test").on(table.userTestId),
index("idx_user_answers_question").on(table.questionId),
```

Add to `user-test.model.ts`:

```typescript
import { index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

index("idx_user_tests_user_created").on(userTests.userId, sql`${userTests.createdAt} DESC`),
```

Add to `questions` table:

```typescript
import { index } from "drizzle-orm/pg-core";
index("idx_questions_skill_active").on(questions.skillId, questions.isActive),
```

Add to `refresh-token.model.ts`:

```typescript
import { uniqueIndex, index } from "drizzle-orm/pg-core";
uniqueIndex("idx_refresh_tokens_token").on(refreshTokens.token),
index("idx_refresh_tokens_user").on(refreshTokens.userId),
```

Add to `notification.model.ts` (`userNotifications`):

```typescript
import { index } from "drizzle-orm/pg-core";
index("idx_user_notifications_receiver_deleted").on(userNotifications.receiverId, userNotifications.deletedAt),
index("idx_user_notifications_receiver_org_deleted").on(userNotifications.receiverId, userNotifications.organizationId, userNotifications.deletedAt),
index("idx_user_notifications_notification").on(userNotifications.notificationId),
```

## Final notes / risks

- GIN and trigram indexes add storage and slower writes; add only where read performance justifies it.
- Expression indexes are powerful for JSONB payload queries but add complexity — prefer them if `payload->>'orgId'` or `payload->>'userId'` is used frequently in WHERE clauses (we saw such usage in notifications).
- Use `CONCURRENTLY` for all production index rollouts to avoid locking.

If you want, I can:

- Apply these Drizzle edits to model files and generate migrations (I will create model edits + run the migration generation command), or
- Only add the raw SQL migrations for the expression/trigram indexes, leaving Drizzle model changes for you.

Which do you want me to do next? (a) implement the model edits + generate migrations, (b) only create the docs (done), (c) create migrations only, (d) nothing.
