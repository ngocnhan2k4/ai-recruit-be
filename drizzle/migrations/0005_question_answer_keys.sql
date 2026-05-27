ALTER TABLE "questions"
ADD COLUMN IF NOT EXISTS "option_keys" jsonb,
ADD COLUMN IF NOT EXISTS "correct_answer_key" varchar(255);

UPDATE "questions" q
SET "option_keys" = COALESCE(
  (
    SELECT jsonb_agg((ord - 1)::text ORDER BY ord)
    FROM jsonb_array_elements_text(q."options") WITH ORDINALITY AS opts(option_text, ord)
  ),
  '[]'::jsonb
);

UPDATE "questions" q
SET "correct_answer_key" = COALESCE(
  (
    SELECT (ord - 1)::text
    FROM jsonb_array_elements_text(q."options") WITH ORDINALITY AS opts(option_text, ord)
    WHERE lower(btrim(opts.option_text)) = lower(btrim(q."correct_answer"))
    LIMIT 1
  ),
  '0'
);

ALTER TABLE "questions"
ALTER COLUMN "option_keys" SET NOT NULL,
ALTER COLUMN "correct_answer_key" SET NOT NULL;

UPDATE "user_answers" ua
SET "chosen_answer" = COALESCE(
  (
    SELECT (ord - 1)::text
    FROM jsonb_array_elements_text(q."options") WITH ORDINALITY AS opts(option_text, ord)
    WHERE lower(btrim(opts.option_text)) = lower(btrim(ua."chosen_answer"))
    LIMIT 1
  ),
  ua."chosen_answer"
)
FROM "questions" q
WHERE ua."question_id" = q."id";
