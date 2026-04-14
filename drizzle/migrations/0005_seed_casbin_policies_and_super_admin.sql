-- Seed Casbin system and organization policies.
-- Idempotent: each insert is skipped if the semantic rule already exists.

DELETE FROM casbin_rule;

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3)
SELECT 898, 'p', 'ADMIN', '/admin/casbin', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'deny'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p'
    AND v0 = 'ADMIN'
    AND v1 = '/admin/casbin'
    AND v2 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v3 = 'deny'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3)
SELECT 899, 'p', 'ADMIN', '*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p'
    AND v0 = 'ADMIN'
    AND v1 = '*'
    AND v2 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v3 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3)
SELECT 900, 'p', 'SUPER_ADMIN', '*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p'
    AND v0 = 'SUPER_ADMIN'
    AND v1 = '*'
    AND v2 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v3 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3)
SELECT 901, 'p', 'ADMIN', '/admin/casbin/*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'deny'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p'
    AND v0 = 'ADMIN'
    AND v1 = '/admin/casbin/*'
    AND v2 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v3 = 'deny'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 902, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/logo', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/logo'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 903, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/users-to-invite', '(GET)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/users-to-invite'
    AND v3 = '(GET)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 904, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/additional-info', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/additional-info'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 905, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/locations', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/locations'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 906, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/basic-info', '(POST)|(GET)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/basic-info'
    AND v3 = '(POST)|(GET)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 907, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/members/*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/members/*'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 908, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/invitations/*', '(POST)|(GET)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/invitations/*'
    AND v3 = '(POST)|(GET)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 909, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/invitations', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/invitations'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 910, 'p2', 'ORGANIZATION_ADMIN', 'org', '/api/v1/organizations/*/members', '(GET)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_ADMIN'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/members'
    AND v3 = '(GET)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 911, 'p2', 'ORGANIZATION_OWNER', 'org', '/api/v1/organizations/*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_OWNER'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 912, 'p2', 'ADMIN', '*', '*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ADMIN'
    AND v1 = '*'
    AND v2 = '*'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 913, 'p2', 'SUPER_ADMIN', '*', '*', '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'SUPER_ADMIN'
    AND v1 = '*'
    AND v2 = '*'
    AND v3 = '(GET)|(POST)|(PUT)|(PATCH)|(DELETE)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (id, ptype, v0, v1, v2, v3, v4)
SELECT 914, 'p2', 'ORGANIZATION_VIEWER', 'org', '/api/v1/organizations/*/members', '(GET)', 'allow'
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'p2'
    AND v0 = 'ORGANIZATION_VIEWER'
    AND v1 = 'org'
    AND v2 = '/api/v1/organizations/*/members'
    AND v3 = '(GET)'
    AND v4 = 'allow'
);

INSERT INTO casbin_rule (ptype, v0, v1)
SELECT 'g', u.id::text, 'USER'
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'g'
    AND v0 = u.id::text
    AND v1 = 'USER'
);

INSERT INTO casbin_rule (ptype, v0, v1)
SELECT 'g', u.id::text, 'SUPER_ADMIN'
FROM users u
WHERE u.email IN (
  'ngocphatc2710@gmail.com',
  'tranngocnhannt2004@gmail.com',
  'ndminhnhat1234@gmail.com',
  'nguyenanhnguyen3006@gmail.com',
  'caotienminhktvn3@gmail.com',
  'thainhat.104@gmail.com'
)
AND NOT EXISTS (
  SELECT 1
  FROM casbin_rule
  WHERE ptype = 'g'
    AND v0 = u.id::text
    AND v1 = 'SUPER_ADMIN'
);

UPDATE users
SET roles = CASE
  WHEN roles @> ARRAY['SUPER_ADMIN']::varchar[] THEN roles
  ELSE array_append(roles, 'SUPER_ADMIN')
END
WHERE email IN (
  'ngocphatc2710@gmail.com',
  'tranngocnhannt2004@gmail.com',
  'ndminhnhat1234@gmail.com',
  'nguyenanhnguyen3006@gmail.com',
  'caotienminhktvn3@gmail.com',
  'thainhat.104@gmail.com'
);
