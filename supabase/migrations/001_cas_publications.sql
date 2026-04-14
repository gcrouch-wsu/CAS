-- CAS public program viewer publications
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE cas_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  visible_columns TEXT[] NOT NULL DEFAULT '{}',
  default_group_key TEXT NOT NULL DEFAULT '',
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cas_publications_slug ON cas_publications (slug);
