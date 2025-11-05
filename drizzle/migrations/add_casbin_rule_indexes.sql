-- Add indexes to casbin_rule table for better query performance
-- Index on ptype for filtering by policy type
CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype ON casbin_rule(ptype);

-- Composite index on (ptype, id) for filtered and ordered queries
CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype_id ON casbin_rule(ptype, id);

-- Index on v0 (subject) for filtering by subject
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v0 ON casbin_rule(v0);

-- Index on v1 for filtering by domainType or object
CREATE INDEX IF NOT EXISTS idx_casbin_rule_v1 ON casbin_rule(v1);

-- Composite index on (ptype, v0, id) for subject-based queries
CREATE INDEX IF NOT EXISTS idx_casbin_rule_ptype_v0_id ON casbin_rule(ptype, v0, id);

