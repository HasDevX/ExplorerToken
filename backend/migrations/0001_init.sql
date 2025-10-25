-- Initial schema migration
-- Creates core application tables using pgcrypto for UUID generation

-- Enable pgcrypto extension for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Application settings and configuration
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  etherscan_api_key TEXT,
  chains JSONB NOT NULL DEFAULT '[]'::jsonb,
  cache_ttl INT NOT NULL DEFAULT 60,
  setup_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Admin users for dashboard authentication
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create index on admin_users username for faster lookups
CREATE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users(username);
