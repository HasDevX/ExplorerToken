-- Bootstrap migration: Create migrations tracking table
-- This table logs which migrations have been applied to the database

CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
