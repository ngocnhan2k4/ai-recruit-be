CREATE EXTENSION IF NOT EXISTS vector;

CREATE EXTENSION IF NOT EXISTS unaccent;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_org_name_trgm
ON organizations
USING gin (unaccent(name) gin_trgm_ops);