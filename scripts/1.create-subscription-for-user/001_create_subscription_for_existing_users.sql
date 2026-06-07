-- Backfill FREE subscription for existing users.
-- This migration is idempotent:
-- 1) only creates active FREE subscription for users who do not have one
-- 2) only creates missing user_feature_usages via ON CONFLICT DO NOTHING

WITH free_subscription AS (
  SELECT s.id
  FROM subscriptions s
  WHERE s.code = 'FREE'
    AND s.deleted_at IS NULL
  ORDER BY s.created_at ASC
  LIMIT 1
),
inserted_user_subscriptions AS (
  INSERT INTO user_subscriptions (
    user_id,
    subscription_id,
    status,
    started_at,
    created_at,
    updated_at
  )
  SELECT
    u.id,
    fs.id,
    'active'::user_subscription_status,
    NOW(),
    NOW(),
    NOW()
  FROM users u
  JOIN free_subscription fs ON TRUE
  LEFT JOIN user_subscriptions us
    ON us.user_id = u.id
   AND us.status = 'active'::user_subscription_status
   AND us.deleted_at IS NULL
  WHERE u.deleted_at IS NULL
    AND us.user_id IS NULL
  RETURNING user_id, subscription_id
)
INSERT INTO user_feature_usages (
  user_id,
  feature_id,
  usage,
  last_refill_at,
  created_at,
  updated_at
)
SELECT
  ius.user_id,
  sf.feature_id,
  0,
  NOW(),
  NOW(),
  NOW()
FROM inserted_user_subscriptions ius
JOIN subscription_features sf
  ON sf.subscription_id = ius.subscription_id
ON CONFLICT (user_id, feature_id) DO NOTHING;
